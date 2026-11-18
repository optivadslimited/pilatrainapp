import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { formatClock } from '@/lib/format';
import { t } from '@/strings';
import { fadeTiming, radius, size, softShadow, space, useTheme } from '@/theme';

import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type Chapter = {
  /** e.g. "Warm-up", "Main", "Cool-down". */
  title: string;
  startSec: number;
};

export type PlayerControlsProps = {
  /** Controls fade out when false. The player sets this after 3 seconds without a touch. */
  visible: boolean;
  isPlaying: boolean;
  positionSec: number;
  durationSec: number;
  /** Marked on the scrubber. */
  chapters?: readonly Chapter[];
  captionsOn: boolean;
  onPlayPause: () => void;
  /** Skip by a number of seconds: -10 or +10. */
  onSeekBy: (deltaSec: number) => void;
  onSeekTo: (positionSec: number) => void;
  onToggleCaptions: () => void;
  onClose: () => void;
  /** The system AirPlay button, supplied by the player. */
  airPlay?: ReactNode;
  /** Any touch on the controls. The player uses it to restart the fade timer. */
  onInteraction?: () => void;
  /** A tap on the empty part of the overlay, to put the controls away. */
  onDismiss?: () => void;
};

const SKIP_SECONDS = 10;
const PLAY_SIZE = 72;
const TRACK = 4;
const THUMB = 16;

/**
 * The controls laid over the video: close, captions and AirPlay along the top,
 * play or pause in the centre between the two 10-second skips, and the
 * scrubber with its chapter marks along the bottom.
 *
 * This component only draws and reports touches. Playback, the 3-second fade
 * timer and the close confirmation belong to the player screen.
 */
export function PlayerControls({
  visible,
  isPlaying,
  positionSec,
  durationSec,
  chapters = [],
  captionsOn,
  onPlayPause,
  onSeekBy,
  onSeekTo,
  onToggleCaptions,
  onClose,
  airPlay,
  onInteraction,
  onDismiss,
}: PlayerControlsProps) {
  const { colors } = useTheme();
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.set(withTiming(visible ? 1 : 0, fadeTiming()));
  }, [visible, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const touched = (action: () => void) => () => {
    onInteraction?.();
    action();
  };

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { backgroundColor: colors.scrimEnd },
        fadeStyle,
      ]}>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel={t.player.hideControls}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.row}>
        <IconButton
          icon="close"
          color="onDark"
          accessibilityLabel={t.player.close}
          onPress={touched(onClose)}
          testID="player-close"
        />
        <View style={styles.rowEnd}>
          <IconButton
            icon={captionsOn ? 'captionsOn' : 'captionsOff'}
            color="onDark"
            accessibilityLabel={captionsOn ? t.player.captionsOn : t.player.captionsOff}
            checked={captionsOn}
            onPress={touched(onToggleCaptions)}
            testID="player-captions"
          />
          {airPlay}
        </View>
      </View>

      <View style={styles.centre}>
        <IconButton
          icon="back10"
          color="onDark"
          iconSize={32}
          accessibilityLabel={t.player.back10}
          onPress={touched(() => onSeekBy(-SKIP_SECONDS))}
          testID="player-back10"
        />
        <Pressable
          onPress={touched(onPlayPause)}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? t.player.pause : t.player.play}
          testID="player-play-pause"
          style={({ pressed }) => [
            styles.play,
            softShadow,
            { backgroundColor: colors.background },
            pressed && styles.pressed,
          ]}>
          <Icon name={isPlaying ? 'pause' : 'play'} size={32} color="text" />
        </Pressable>
        <IconButton
          icon="forward10"
          color="onDark"
          iconSize={32}
          accessibilityLabel={t.player.forward10}
          onPress={touched(() => onSeekBy(SKIP_SECONDS))}
          testID="player-forward10"
        />
      </View>

      <View style={styles.bottom}>
        <Scrubber
          positionSec={positionSec}
          durationSec={durationSec}
          chapters={chapters}
          onSeekTo={onSeekTo}
          onSeekBy={onSeekBy}
          onInteraction={onInteraction}
        />
        <View style={styles.row}>
          <Text variant="caption" color="onDark" tabular>
            {formatClock(positionSec)}
          </Text>
          <Text variant="caption" color="onDark" tabular>
            {formatClock(durationSec)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

type ScrubberProps = Pick<
  PlayerControlsProps,
  'positionSec' | 'durationSec' | 'onSeekTo' | 'onSeekBy' | 'onInteraction'
> & { chapters: readonly Chapter[] };

/**
 * The scrubber. The thumb follows the finger on the UI thread; the new
 * position is reported once, when the finger lifts.
 */
function Scrubber({
  positionSec,
  durationSec,
  chapters,
  onSeekTo,
  onSeekBy,
  onInteraction,
}: ScrubberProps) {
  const { colors } = useTheme();
  const width = useSharedValue(0);
  const dragging = useSharedValue(false);
  const dragFraction = useSharedValue(0);
  const playFraction = useSharedValue(0);

  useEffect(() => {
    playFraction.set(durationSec > 0 ? Math.min(1, Math.max(0, positionSec / durationSec)) : 0);
  }, [positionSec, durationSec, playFraction]);

  const commit = (fraction: number) => {
    onInteraction?.();
    onSeekTo(fraction * durationSec);
  };

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (event) => {
      'worklet';
      const w = width.get();
      dragFraction.set(w > 0 ? Math.min(1, Math.max(0, event.x / w)) : 0);
      dragging.set(true);
    },
    onUpdate: (event) => {
      'worklet';
      const w = width.get();
      dragFraction.set(w > 0 ? Math.min(1, Math.max(0, event.x / w)) : 0);
    },
    onFinalize: () => {
      'worklet';
      if (dragging.get()) scheduleOnRN(commit, dragFraction.get());
      dragging.set(false);
    },
  });

  const fraction = useDerivedValue(() =>
    dragging.get() ? dragFraction.get() : playFraction.get(),
  );
  const fillStyle = useAnimatedStyle(() => ({ width: fraction.get() * width.get() }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fraction.get() * width.get() - THUMB / 2 }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t.player.scrubber}
        accessibilityValue={{
          text: t.player.position(formatClock(positionSec), formatClock(durationSec)),
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          onSeekBy(event.nativeEvent.actionName === 'increment' ? SKIP_SECONDS : -SKIP_SECONDS);
        }}
        onLayout={(event) => width.set(event.nativeEvent.layout.width)}
        testID="player-scrubber"
        style={styles.scrubber}>
        <View style={[styles.track, { backgroundColor: colors.onDark, opacity: 0.35 }]} />
        <Animated.View style={[styles.track, { backgroundColor: colors.onDark }, fillStyle]} />
        {durationSec > 0
          ? chapters
              .filter((chapter) => chapter.startSec > 0 && chapter.startSec < durationSec)
              .map((chapter) => (
                <View
                  key={chapter.title}
                  style={[
                    styles.chapterMark,
                    {
                      left: `${(chapter.startSec / durationSec) * 100}%`,
                      backgroundColor: colors.surfaceDark,
                    },
                  ]}
                />
              ))
          : null}
        <Animated.View style={[styles.thumb, { backgroundColor: colors.onDark }, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  overlay: {
    justifyContent: 'space-between',
    padding: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowEnd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
  },
  centre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
  },
  play: {
    width: PLAY_SIZE,
    height: PLAY_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  bottom: { paddingHorizontal: space.xs },
  scrubber: {
    height: size.touchTarget,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK,
    borderRadius: TRACK / 2,
  },
  chapterMark: {
    position: 'absolute',
    width: 2,
    height: TRACK,
    marginLeft: -1,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
});
