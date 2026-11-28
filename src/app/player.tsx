import { useEvent, useEventListener } from 'expo';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoAirPlayButton, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, EmptyState, IconButton, PlayerControls, Text } from '@/components';
import { useAccess } from '@/features/membership/useAccess';
import { indexCatalogue } from '@/features/plan/cards';
import { useCatalogue, useCompleteSession, useCurrentPlan } from '@/features/plan/queries';
import { planRepository } from '@/features/plan/repository';
import type { ClassDetails } from '@/features/plan/types';
import { defaultCaptionTrack, seekTo, setCaptions } from '@/features/player/control';
import {
  chapterIndexAt,
  CONTROLS_IDLE_MS,
  fitChapters,
  needsCloseConfirmation,
  ProgressTracker,
  resumeFrom,
  type SavedProgress,
} from '@/features/player/playback';
import { usePlaybackSource, type VideoSourceInfo } from '@/features/player/sources';
import { track } from '@/lib/analytics';
import { formatClassMeta, formatClock } from '@/lib/format';
import { useGoBack } from '@/lib/useGoBack';
import { useScreenReader } from '@/lib/useScreenReader';
import { t } from '@/strings';
import { aspect, radius, screenMargin, size, softShadow, space, useTheme } from '@/theme';

/**
 * The player. It plays a session of her plan (one class, or a 20 followed by
 * a 10), or a single class from the library.
 *
 * Portrait shows the video on top with the chapter list below. Turning the
 * phone gives full-screen landscape. Captions are on by default, AirPlay is
 * on, picture-in-picture is off, and the screen stays awake while it plays.
 *
 * The rules (what counts as watched, when to save, where to resume) are in
 * features/player/playback.ts, where they are tested. This file connects them
 * to the video.
 *
 * NOT YET RUN ON A DEVICE. expo-video is native; this screen has been
 * exercised in the web preview only, which cannot show captions, AirPlay,
 * rotation or the screen staying awake.
 */
export default function PlayerScreen() {
  const params = useLocalSearchParams<{ sessionId?: string; classId?: string; source?: string }>();
  const plan = useCurrentPlan();
  const classes = useCatalogue();
  const access = useAccess();
  const { colors } = useTheme();

  const waitingForPlan = Boolean(params.sessionId) && plan.data === undefined;
  if (!classes.data || waitingForPlan) {
    return (
      <View style={[styles.screen, styles.centred, { backgroundColor: colors.surfaceDark }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.onDark} accessibilityLabel={t.player.loading} />
      </View>
    );
  }

  const catalogue = indexCatalogue(classes.data);
  const session = params.sessionId
    ? plan.data?.sessions.find((item) => item.id === params.sessionId)
    : undefined;
  const ids = session ? session.classIds : params.classId ? [params.classId] : [];
  const queue = ids
    .map((id) => catalogue.get(id))
    .filter((cls): cls is ClassDetails => cls !== undefined);

  // Nothing to play: the session or class no longer exists.
  if (queue.length === 0) return <Redirect href="/today" />;

  const allowed = session ? access.canPlay(session.id) : queue.every((cls) => access.canWatch(cls));

  return (
    <Entry allowed={allowed}>
      <Playlist queue={queue} sessionId={session?.id} source={params.source ?? 'unknown'} />
    </Entry>
  );
}

/**
 * The door. Whether she may play this is decided once, as she arrives: her
 * free class stops being "free" the moment it is finished, and that must not
 * close the player on her while the last minute is still playing.
 */
function Entry({ allowed, children }: { allowed: boolean; children: React.ReactNode }) {
  const [wasAllowed] = useState(allowed);
  if (!wasAllowed) {
    return <Redirect href={{ pathname: '/paywall', params: { placement: 'locked_class' } }} />;
  }
  return children;
}

/** Plays the classes of a session one after another. */
function Playlist({
  queue,
  sessionId,
  source,
}: {
  queue: ClassDetails[];
  sessionId?: string;
  source: string;
}) {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const complete = useCompleteSession();
  const goBack = useGoBack('/today');
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const sessionDone = useRef(false);

  const cls = queue[index];
  const isLast = index === queue.length - 1;
  // A member class plays from a signed address, fetched after the server has
  // checked she may watch it.
  const stream = usePlaybackSource(cls);

  const openAfterClass = () =>
    router.replace({
      pathname: '/after-class',
      params: sessionId ? { sessionId, classId: cls.id } : { classId: cls.id },
    });

  // The server says this class needs a membership she does not have.
  if (stream.refused) {
    return <Redirect href={{ pathname: '/paywall', params: { placement: 'locked_class' } }} />;
  }

  if (stream.failed) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.errorBody}>
          <EmptyState
            icon="offline"
            title={t.states.videoErrorTitle}
            body={t.states.videoErrorBody}
            action={{ label: t.common.retry, onPress: stream.retry }}
            testID="player-error"
          />
          <Button
            label={t.common.close}
            variant="text"
            onPress={goBack}
            testID="player-error-close"
          />
        </View>
      </View>
    );
  }

  if (!stream.media) {
    return (
      <View style={[styles.screen, styles.centred, { backgroundColor: colors.surfaceDark }]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.onDark} accessibilityLabel={t.player.loading} />
      </View>
    );
  }

  return (
    <ClassPlayback
      // A fresh player, tracker and state for each class, and for each retry.
      key={`${cls.id}-${index}-${attempt}`}
      cls={cls}
      media={stream.media}
      next={queue[index + 1]}
      isLast={isLast}
      source={source}
      onCompleted={() => {
        // The session is done once its last class reaches 90%.
        if (isLast && sessionId && !sessionDone.current) {
          sessionDone.current = true;
          complete.mutate({ sessionId });
        }
      }}
      onEnded={() => (isLast ? openAfterClass() : setIndex((current) => current + 1))}
      onFinish={openAfterClass}
      onLeave={goBack}
      onRetry={() => {
        // The address may have gone stale: ask for a new one as well.
        stream.retry();
        setAttempt((current) => current + 1);
      }}
    />
  );
}

type ClassPlaybackProps = {
  cls: ClassDetails;
  media: VideoSourceInfo;
  /** The class that follows in this session, if there is one. */
  next?: ClassDetails;
  isLast: boolean;
  source: string;
  /** This class has reached 90%. */
  onCompleted: () => void;
  /** The video has played to its end. */
  onEnded: () => void;
  /** She closed the player after finishing: go to the after-class screen. */
  onFinish: () => void;
  /** She closed the player partway through. */
  onLeave: () => void;
  onRetry: () => void;
};

function ClassPlayback({
  cls,
  media,
  next,
  isLast,
  source,
  onCompleted,
  onEnded,
  onFinish,
  onLeave,
  onRetry,
}: ClassPlaybackProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const player = useVideoPlayer(media.uri, (created) => {
    created.timeUpdateEventInterval = 0.5;
    created.keepScreenOnWhilePlaying = true;
    created.allowsExternalPlayback = true;
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { availableSubtitleTracks } = useEvent(player, 'availableSubtitleTracksChange', {
    availableSubtitleTracks: player.availableSubtitleTracks,
  });

  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [showing, setShowing] = useState(true);
  const screenReader = useScreenReader();
  const [touches, setTouches] = useState(0);
  const [card, setCard] = useState<'easier' | 'leave' | null>(null);
  /** She pressed pause, or is being asked whether to leave. Anything else that stops the video is buffering. */
  const [pausedByHer, setPausedByHer] = useState(false);
  /** `undefined` while her saved place is being read. */
  const [saved, setSaved] = useState<SavedProgress | null | undefined>(undefined);

  const tracker = useRef<ProgressTracker | null>(null);
  const started = useRef(false);

  // Read where she left off, once.
  useEffect(() => {
    let alive = true;
    planRepository
      .getClassProgress(cls.id)
      .catch(() => null)
      .then((progress) => {
        if (!alive) return;
        tracker.current = new ProgressTracker(progress?.percent ?? 0);
        setSaved(progress);
      });
    return () => {
      alive = false;
    };
  }, [cls.id]);

  // Start, from her saved place, as soon as both the video and that place are ready.
  useEffect(() => {
    if (started.current || saved === undefined || status !== 'readyToPlay') return;
    started.current = true;
    const from = resumeFrom(saved);
    if (from > 0) seekTo(player, from);
    player.play();
    track('class_started', { class: cls.slug, source });
  }, [saved, status, player, cls.slug, source]);

  // Captions are on by default. English if the video has it, otherwise its first track.
  useEffect(() => {
    const track = defaultCaptionTrack(availableSubtitleTracks);
    if (track) setCaptions(player, captionsOn ? track : null);
  }, [availableSubtitleTracks, captionsOn, player]);

  // Controls fade 3 seconds after the last touch, while the class is playing.
  // Not with VoiceOver on: it cannot find controls that keep disappearing.
  useEffect(() => {
    if (!isPlaying || screenReader) return;
    const timer = setTimeout(() => setShowing(false), CONTROLS_IDLE_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, touches, screenReader]);

  const touch = () => {
    setShowing(true);
    setTouches((count) => count + 1);
  };

  const save = (positionSec: number, percent: number) => {
    planRepository.saveClassProgress(cls.id, { positionSec, percent }).catch(() => {});
  };

  const onTime = (currentTime: number) => {
    const total = player.duration;
    setPosition(currentTime);
    if (total > 0) setDuration(total);

    const current = tracker.current;
    if (!current || !(total > 0)) return;

    const update = current.update(currentTime, total, Date.now());
    for (const mark of update.milestones) {
      track(`class_progress_${mark}` as const, { class: cls.slug });
    }
    if (update.completed) {
      track('class_completed', { class: cls.slug });
      onCompleted();
    }
    if (update.save) save(currentTime, update.percent);
  };

  useEventListener(player, 'timeUpdate', ({ currentTime }) => onTime(currentTime));
  useEventListener(player, 'playToEnd', () => {
    // Make sure the end itself is counted, even if she scrubbed straight to it.
    onTime(player.duration);
    save(player.duration, 100);
    onEnded();
  });

  const leave = () => {
    if (tracker.current && position > 0) save(position, tracker.current.percent);
    onLeave();
  };

  const requestClose = () => {
    const current = tracker.current;
    if (isLast && current?.isCompleted) return onFinish();
    if (needsCloseConfirmation(current?.watchedSec ?? 0, current?.isCompleted ?? false)) {
      player.pause();
      setPausedByHer(true);
      setCard('leave');
      return;
    }
    leave();
  };

  // The sample video is not the class's own length, so its chapter times are scaled to fit.
  const classSeconds = cls.lengthMin * 60;
  const chapters = fitChapters(
    cls.chapters,
    classSeconds,
    media.isSample ? duration : classSeconds,
  );
  const chapterIndex = chapterIndexAt(chapters, position);
  const chapter = chapters[chapterIndex];
  const easier = cls.easierOptions.find((option) => option.chapter === chapter?.title)?.text;

  const openEasier = () => {
    track('easier_option_opened', { class: cls.slug });
    setCard('easier');
  };

  if (status === 'error') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={styles.errorBody}>
          <EmptyState
            icon="offline"
            title={t.states.videoErrorTitle}
            body={t.states.videoErrorBody}
            action={{ label: t.common.retry, onPress: onRetry }}
            testID="player-error"
          />
          <Button
            label={t.common.close}
            variant="text"
            onPress={onLeave}
            testID="player-error-close"
          />
        </View>
      </View>
    );
  }

  const controlsVisible = (showing || !isPlaying) && card === null;
  // Meant to be playing, but not: the first load, or a stall partway through.
  const buffering = !pausedByHer && !isPlaying;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surfaceDark }]} testID="player">
      <StatusBar style="light" hidden={landscape} />

      <View
        style={
          landscape ? styles.videoLandscape : [styles.videoPortrait, { marginTop: insets.top }]
        }>
        <VideoView
          player={player}
          style={styles.video}
          nativeControls={false}
          allowsPictureInPicture={false}
          contentFit="contain"
          playsInline
        />

        {/* Under the controls: a tap on the bare video brings them back. */}
        <Pressable
          onPress={touch}
          accessibilityRole="button"
          accessibilityLabel={t.player.showControls}
          style={StyleSheet.absoluteFill}
          testID="player-surface"
        />

        <PlayerControls
          visible={controlsVisible}
          isPlaying={isPlaying}
          buffering={buffering}
          positionSec={position}
          durationSec={duration}
          chapters={chapters}
          captionsOn={captionsOn}
          onPlayPause={() => {
            if (isPlaying) {
              player.pause();
              setPausedByHer(true);
            } else {
              player.play();
              setPausedByHer(false);
            }
          }}
          onSeekBy={(delta) => player.seekBy(delta)}
          onSeekTo={(seconds) => seekTo(player, seconds)}
          onToggleCaptions={() => setCaptionsOn((on) => !on)}
          onClose={requestClose}
          onInteraction={touch}
          onDismiss={() => setShowing(false)}
          airPlay={
            <>
              {landscape && easier ? (
                <IconButton
                  icon="info"
                  color="onDark"
                  accessibilityLabel={t.player.easierOption}
                  onPress={openEasier}
                  testID="player-easier-landscape"
                />
              ) : null}
              {Platform.OS === 'ios' ? (
                <VideoAirPlayButton
                  tint={colors.onDark}
                  accessibilityLabel={t.player.airPlay}
                  style={styles.airPlay}
                />
              ) : null}
            </>
          }
        />
      </View>

      {landscape ? null : (
        <ScrollView
          style={[styles.below, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.belowContent, { paddingBottom: insets.bottom + space.lg }]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.titleBlock}>
            <Text variant="title">{cls.title}</Text>
            <Text variant="callout" color="textSecondary">
              {formatClassMeta({
                minutes: cls.lengthMin,
                level: cls.level,
                equipment: cls.equipment,
              })}
            </Text>
            {next ? (
              <Text variant="callout" color="textSecondary">
                {t.player.upNext(next.title)}
              </Text>
            ) : null}
            {media.isSample ? (
              <Text variant="caption" color="textSecondary">
                {t.player.sampleNote}
              </Text>
            ) : null}
          </View>

          {easier ? (
            <Button
              label={t.player.easierOption}
              variant="secondary"
              onPress={openEasier}
              testID="player-easier"
            />
          ) : null}

          <View style={styles.chapters}>
            <Text variant="heading">{t.player.chapters}</Text>
            {chapters.map((item, index) => {
              const current = index === chapterIndex;
              return (
                <Pressable
                  key={item.title}
                  onPress={() => {
                    seekTo(player, item.startSec);
                    touch();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={[
                    t.player.chapterSpoken(item.title, formatClock(item.startSec)),
                    current ? t.player.playingNow : null,
                  ]
                    .filter(Boolean)
                    .join('. ')}
                  aria-selected={current}
                  testID={`player-chapter-${index + 1}`}
                  style={({ pressed }) => [
                    styles.chapter,
                    {
                      backgroundColor: current ? colors.selectedTint : colors.surface,
                      borderColor: current ? colors.primary : colors.surface,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <View style={styles.fill}>
                    <Text variant="body" weight="500" color={current ? 'primary' : 'text'}>
                      {item.title}
                    </Text>
                    {current ? (
                      <Text variant="caption" color="primary">
                        {t.player.playingNow}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="callout" color="textSecondary" tabular>
                    {formatClock(item.startSec)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {card === 'easier' && easier && chapter ? (
        <FloatingCard
          title={t.player.easierTitle(chapter.title)}
          body={easier}
          bottom={insets.bottom}
          testID="player-easier-card">
          <Button
            label={t.player.gotIt}
            onPress={() => setCard(null)}
            testID="player-easier-close"
          />
        </FloatingCard>
      ) : null}

      {card === 'leave' ? (
        <FloatingCard
          title={t.player.leaveTitle}
          body={t.player.leaveBody}
          bottom={insets.bottom}
          testID="player-leave-card">
          <Button
            label={t.player.keepGoing}
            onPress={() => {
              setCard(null);
              setPausedByHer(false);
              player.play();
            }}
            testID="player-keep-going"
          />
          <Button
            label={t.player.leave}
            variant="secondary"
            onPress={leave}
            testID="player-leave"
          />
        </FloatingCard>
      ) : null}
    </View>
  );
}

/** A short card that floats over the player: the easier option, or "Leave this class?". */
function FloatingCard({
  title,
  body,
  bottom,
  children,
  testID,
}: {
  title: string;
  body: string;
  bottom: number;
  children: React.ReactNode;
  testID: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[
        styles.card,
        softShadow,
        { backgroundColor: colors.background, bottom: bottom + space.md },
      ]}>
      <Text variant="heading">{title}</Text>
      <Text variant="body" color="textSecondary">
        {body}
      </Text>
      <View style={styles.cardActions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  centred: { alignItems: 'center', justifyContent: 'center' },
  videoPortrait: { width: '100%', aspectRatio: aspect.video, overflow: 'hidden' },
  videoLandscape: { flex: 1, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  airPlay: { width: size.touchTarget, height: size.touchTarget },
  below: {
    flex: 1,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  belowContent: {
    paddingHorizontal: screenMargin,
    paddingTop: space.lg,
    gap: space.lg,
  },
  titleBlock: { gap: space.xxs },
  chapters: { gap: space.xs },
  chapter: {
    minHeight: size.buttonHeight,
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  pressed: { opacity: 0.7 },
  card: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    borderRadius: radius.sheet,
    padding: space.lg,
    gap: space.sm,
  },
  cardActions: { gap: space.xs, paddingTop: space.xs },
  errorBody: {
    flex: 1,
    paddingHorizontal: screenMargin,
    paddingBottom: space.lg,
  },
});
