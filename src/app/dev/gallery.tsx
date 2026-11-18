import { Redirect, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  BarChart,
  Button,
  Checkbox,
  Chip,
  ClassCard,
  DayPill,
  EmptyState,
  IconButton,
  ListRow,
  MonthGrid,
  OptionCard,
  PhotoPlaceholder,
  PlanCard,
  PlayerControls,
  QuizProgressBar,
  Ring,
  Screen,
  Skeleton,
  StatTile,
  Text,
  TextField,
  toast,
  Wordmark,
  type DayState,
} from '@/components';
import { formatClassMeta } from '@/lib/format';
import { t } from '@/strings';
import { aspect, palette, radius, space, useTheme } from '@/theme';

/**
 * The component gallery: every piece of the design system on one screen, for
 * design review. Development builds only; it does not exist in production.
 *
 * The labels and sample content here are scaffolding for reviewers, not
 * product copy, so they are written in place rather than in the strings file.
 * Sample prices are obvious placeholders: real prices only ever come from
 * StoreKit.
 */
export default function Gallery() {
  const router = useRouter();
  const { colors } = useTheme();

  const [single, setSingle] = useState('b');
  const [multi, setMulti] = useState<string[]>(['a']);
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [chip, setChip] = useState('20');
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState('');
  const [progress, setProgress] = useState(2 / 3);
  const [plan, setPlan] = useState('quarterly');
  const [playing, setPlaying] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [position, setPosition] = useState(260);

  if (!__DEV__) return <Redirect href="/" />;

  const week: DayState[] = ['done', 'rest', 'done', 'today', 'rest', 'planned', 'rest'];
  const meta = formatClassMeta({ minutes: 20, level: 1, equipment: ['mat'] });
  const duration = 1200;

  return (
    <Screen scroll testID="gallery">
      <View style={styles.top}>
        <IconButton icon="back" accessibilityLabel={t.common.back} onPress={() => router.back()} />
        <Text variant="heading">Design system</Text>
      </View>

      <Section title="Wordmark">
        <Wordmark />
      </Section>

      <Section title="Colour">
        <View style={styles.swatches}>
          {Object.entries(palette).map(([name, hex]) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[styles.swatchBlock, { backgroundColor: hex, borderColor: colors.hairline }]}
              />
              <Text variant="caption" weight="600">
                {name}
              </Text>
              <Text variant="caption" color="textSecondary" tabular>
                {hex}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Type">
        <Text variant="display">Display 34/38</Text>
        <Text variant="title">Title 28/32</Text>
        <Text variant="heading">Heading 22/26</Text>
        <Text variant="body">Body 17/24. The plan adjusts to her feedback.</Text>
        <Text variant="callout">Callout 15/20</Text>
        <Text variant="caption">Caption 13/18</Text>
        <Text variant="button">Button 17 semibold</Text>
        <Text variant="body" tabular>
          Tabular 0123456789
        </Text>
      </Section>

      <Section title="Button">
        <Button label="Primary" onPress={() => {}} />
        <Button label="Secondary" variant="secondary" onPress={() => {}} />
        <Button label="Text button" variant="text" onPress={() => {}} />
        <Button label="Disabled" disabled onPress={() => {}} />
        <Button label="Loading" loading onPress={() => {}} />
      </Section>

      <Section title="Chip">
        <View style={styles.wrapRow}>
          <Chip label="3 days a week" />
          <Chip label="20 min" />
          <Chip label="Core focus" />
        </View>
        <View style={styles.wrapRow}>
          {['10', '20', '30'].map((value) => (
            <Chip
              key={value}
              label={`${value} min`}
              selected={chip === value}
              onPress={() => setChip(value)}
            />
          ))}
        </View>
      </Section>

      <Section title="OptionCard, single">
        {[
          ['a', 'New to Pilates'],
          ['b', 'Tried it a few times'],
          ['c', 'I practise sometimes'],
        ].map(([value, label]) => (
          <OptionCard
            key={value}
            label={label}
            selected={single === value}
            onPress={() => setSingle(value)}
          />
        ))}
      </Section>

      <Section title="OptionCard, multi">
        {[
          ['a', 'Just a mat'],
          ['b', 'Resistance band'],
        ].map(([value, label]) => (
          <OptionCard
            key={value}
            mode="multi"
            label={label}
            selected={multi.includes(value)}
            onPress={() =>
              setMulti((current) =>
                current.includes(value)
                  ? current.filter((item) => item !== value)
                  : [...current, value],
              )
            }
          />
        ))}
      </Section>

      <Section title="QuizProgressBar">
        <View style={styles.row}>
          <QuizProgressBar progress={progress} accessibilityLabel="Sample progress" />
        </View>
        <Button
          label="Advance"
          variant="secondary"
          onPress={() => setProgress((value) => (value >= 1 ? 0.1 : Math.min(1, value + 0.3)))}
        />
      </Section>

      <Section title="Ring">
        <View style={styles.rowSpread}>
          <Ring progress={progress} accessibilityLabel="Sample ring">
            <Text variant="heading" tabular accessibilityRole="text">
              2 of 3
            </Text>
          </Ring>
          <Ring progress={progress} size={96} strokeWidth={8} breathing />
        </View>
      </Section>

      <Section title="DayPill, week strip">
        <View style={styles.days}>
          {week.map((state, index) => (
            <DayPill
              key={index}
              letter={t.weekdays.letter[index]}
              accessibilityLabel={`${t.weekdays.long[index]}, ${t.dayPill[state]}`}
              state={state}
            />
          ))}
        </View>
      </Section>

      <Section title="DayPill, picker">
        <View style={styles.days}>
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <DayPill
              key={day}
              letter={t.weekdays.letter[day - 1]}
              accessibilityLabel={t.weekdays.long[day - 1]}
              selected={days.includes(day)}
              onPress={() =>
                setDays((current) =>
                  current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
                )
              }
            />
          ))}
        </View>
      </Section>

      <Section title="StatTile">
        <View style={styles.row}>
          <StatTile value="12" label="Sessions completed" />
          <StatTile value="240" label="Minutes moved" />
          <StatTile value="4" label="Weeks active" />
        </View>
      </Section>

      <Section title="BarChart">
        <BarChart
          target={3}
          targetLabel="Your plan: 3 a week"
          bars={[
            { label: 'W1', value: 3, spoken: 'Week 1: 3 of 3' },
            { label: 'W2', value: 2, spoken: 'Week 2: 2 of 3', isCurrent: true },
            { label: 'W3', value: 0, spoken: 'Week 3: 0 of 3' },
            { label: 'W4', value: 0, spoken: 'Week 4: 0 of 3' },
          ]}
        />
      </Section>

      <Section title="MonthGrid">
        <MonthGrid
          accessibilityLabel="Sample month"
          days={[
            null,
            null,
            ...Array.from({ length: 30 }, (_, i) => ({
              date: String(i + 1),
              day: i + 1,
              trained: [2, 4, 6, 9, 11, 13].includes(i + 1),
              isToday: i + 1 === 13,
            })),
          ]}
        />
      </Section>

      <Section title="ClassCard, large">
        <ClassCard
          variant="large"
          title="Core and posture"
          meta={meta}
          photoLabel="Class thumbnail, 4:5"
          onPress={() => {}}
          onStart={() => {}}
        />
      </Section>

      <Section title="ClassCard, compact">
        <ClassCard
          variant="compact"
          title="Full-body flow"
          meta={meta}
          photoLabel="Class thumbnail, 4:5"
          onPress={() => {}}
          action={{ label: t.classMeta.move, onPress: () => {} }}
        />
        <ClassCard
          variant="compact"
          title="Hips and hamstrings"
          meta={meta}
          photoLabel="Class thumbnail, 4:5"
          onPress={() => {}}
          locked
        />
      </Section>

      <Section title="PlanCard (placeholder prices)">
        <PlanCard
          name="Yearly"
          price="$00.00"
          period="every year"
          perMonth="$0.00 a month, billed yearly"
          badge={{ label: 'Save 00%', tone: 'saving' }}
          selected={plan === 'annual'}
          onPress={() => setPlan('annual')}
        />
        <PlanCard
          name="Quarterly"
          price="$00.00"
          period="every 3 months"
          perMonth="$0.00 a month, billed every 3 months"
          badge={{ label: 'Most popular', tone: 'neutral' }}
          selected={plan === 'quarterly'}
          onPress={() => setPlan('quarterly')}
        />
        <PlanCard
          name="Monthly"
          price={null}
          period="every month"
          selected={false}
          onPress={() => {}}
        />
      </Section>

      <Section title="PlayerControls">
        <View style={[styles.player, { backgroundColor: colors.surfaceDark }]}>
          <PlayerControls
            visible
            isPlaying={playing}
            positionSec={position}
            durationSec={duration}
            chapters={[
              { title: 'Warm-up', startSec: 0 },
              { title: 'Main', startSec: 180 },
              { title: 'Cool-down', startSec: 1020 },
            ]}
            captionsOn={captions}
            onPlayPause={() => setPlaying((value) => !value)}
            onSeekBy={(delta) =>
              setPosition((value) => Math.min(duration, Math.max(0, value + delta)))
            }
            onSeekTo={setPosition}
            onToggleCaptions={() => setCaptions((value) => !value)}
            onClose={() => {}}
          />
        </View>
      </Section>

      <Section title="Form">
        <TextField
          label="First name"
          value={name}
          onChangeText={setName}
          placeholder="First name"
        />
        <TextField
          label="With an error"
          value=""
          placeholder="Email"
          error="That address looks incomplete."
        />
        <Checkbox label="A sentence to agree to." checked={checked} onChange={setChecked} />
      </Section>

      <Section title="ListRow">
        <ListRow label="Terms" onPress={() => {}} />
        <ListRow label="Version" value="1.0.0" divider={false} />
      </Section>

      <Section title="Skeleton">
        <Skeleton aspectRatio={aspect.video} borderRadius={radius.card} />
        <Skeleton width="60%" height={22} />
        <Skeleton width="40%" />
      </Section>

      <Section title="PhotoPlaceholder">
        <PhotoPlaceholder label="Hero image, 3:4" aspectRatio={aspect.hero} />
      </Section>

      <Section title="EmptyState">
        <EmptyState
          icon="offline"
          title={t.states.offlineTitle}
          body={t.states.offlineBody}
          action={{ label: t.common.retry, onPress: () => {} }}
        />
      </Section>

      <Section title="Toast">
        <Button
          label="Show a toast"
          variant="secondary"
          onPress={() => toast.show('Your plan has moved.')}
        />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, { borderTopColor: colors.hairline }]}>
      <Text variant="caption" color="textSecondary" weight="600" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginLeft: -10,
  },
  section: {
    gap: space.sm,
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: space.xs, alignItems: 'center' },
  rowSpread: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  days: { flexDirection: 'row', gap: space.xxs },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  swatch: { width: 96, gap: 2 },
  swatchBlock: {
    height: 56,
    borderRadius: radius.input,
    borderWidth: StyleSheet.hairlineWidth,
  },
  player: {
    aspectRatio: aspect.video,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
