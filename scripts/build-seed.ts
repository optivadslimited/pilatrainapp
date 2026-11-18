/**
 * Turns the class sheet (supabase/seed/classes.csv) into the two files the
 * project runs on:
 *
 *   supabase/seed.sql                         loaded into the database
 *   src/features/plan/data/seedClasses.json   the same classes for the app's local mode
 *
 * Run it after editing the sheet:   npm run seed:build
 * Check nothing has drifted:        npm run seed:check   (also run by the tests)
 *
 * The sheet is the one place class tags are edited. Every value is checked
 * against the engine's vocabulary, so a typo stops here and not in a plan.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { brand } from '../src/config/brand';
import {
  EQUIPMENT,
  FOCUSES,
  MINUTES,
  WORK_AROUNDS,
  type Equipment,
  type Focus,
  type Intensity,
  type Level,
  type Minutes,
  type WorkAround,
} from '../supabase/functions/_shared/engine/domain';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV = join(root, 'supabase/seed/classes.csv');
const SQL = join(root, 'supabase/seed.sql');
const JSON_OUT = join(root, 'src/features/plan/data/seedClasses.json');

/** Fixed, so the instructor row and class ids are the same in every environment. */
const INSTRUCTOR_ID = '11111111-1111-4111-8111-111111111111';
const INSTRUCTOR_SLUG = 'lead-instructor';
const ID_NAMESPACE = 'pilatrain.class.';

export type SeedClass = {
  id: string;
  slug: string;
  title: string;
  instructorId: string;
  lengthMin: Minutes;
  level: Level;
  focus: Focus;
  intensity: Intensity;
  equipment: Equipment[];
  unsuitableFor: WorkAround[];
  muxPlaybackId: string | null;
  thumbnailUrl: string | null;
  captionsUrl: string | null;
  chapters: { title: string; startSec: number }[];
  easierOptions: { chapter: string; text: string }[];
  isFree: boolean;
  published: boolean;
};

/** A stable UUID from a slug, so re-running the script never changes an id. */
function idFor(slug: string): string {
  const hex = createHash('sha1')
    .update(ID_NAMESPACE + slug)
    .digest('hex');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** A small CSV reader: commas, quoted fields, doubled quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  row.push(field);
  if (row.some((value) => value !== '')) rows.push(row);

  const [header, ...body] = rows;
  return body.map((values) =>
    Object.fromEntries(header.map((name, i) => [name, (values[i] ?? '').trim()])),
  );
}

function fail(slug: string, message: string): never {
  throw new Error(`classes.csv, "${slug}": ${message}`);
}

function oneOf<T extends string | number>(
  slug: string,
  column: string,
  value: T,
  allowed: readonly T[],
): T {
  if (!allowed.includes(value))
    fail(slug, `${column} is "${value}"; expected one of ${allowed.join(', ')}`);
  return value;
}

const list = (value: string) =>
  value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

const bool = (slug: string, column: string, value: string) => {
  if (value !== 'true' && value !== 'false') fail(slug, `${column} must be true or false`);
  return value === 'true';
};

const CHAPTERS = ['Warm-up', 'Main', 'Cool-down'] as const;

export function readClasses(csv: string = readFileSync(CSV, 'utf8')): SeedClass[] {
  const seen = new Set<string>();

  return parseCsv(csv).map((row) => {
    const slug = row.slug;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
      fail(slug, 'slug must be lowercase words joined by hyphens');
    if (seen.has(slug)) fail(slug, 'slug is used twice');
    seen.add(slug);
    if (!row.title) fail(slug, 'title is empty');

    const lengthMin = oneOf(slug, 'length_min', Number(row.length_min) as Minutes, MINUTES);
    const level = oneOf(slug, 'level', Number(row.level) as Level, [1, 2]);
    const focus = oneOf(slug, 'focus', row.focus as Focus, FOCUSES);
    const intensity = oneOf(slug, 'intensity', Number(row.intensity) as Intensity, [1, 2, 3]);

    const equipment = list(row.equipment).map((item) =>
      oneOf(slug, 'equipment', item as Equipment, EQUIPMENT),
    );
    if (!equipment.includes('mat')) equipment.unshift('mat');
    const unsuitableFor = list(row.unsuitable_for).map((item) =>
      oneOf(
        slug,
        'unsuitable_for',
        item as WorkAround,
        WORK_AROUNDS.filter((value) => value !== 'none'),
      ),
    );

    const mainStarts = Number(row.main_starts_sec);
    const cooldownStarts = Number(row.cooldown_starts_sec);
    const total = lengthMin * 60;
    if (!(mainStarts > 0 && mainStarts < cooldownStarts && cooldownStarts < total)) {
      fail(slug, 'chapter times must run warm-up < main < cool-down < end of class');
    }

    const easier = [row.easier_warmup, row.easier_main, row.easier_cooldown];
    if (easier.some((text) => !text)) fail(slug, 'every chapter needs an easier option');

    return {
      id: idFor(slug),
      slug,
      title: row.title,
      instructorId: INSTRUCTOR_ID,
      lengthMin,
      level,
      focus,
      intensity,
      equipment,
      unsuitableFor,
      muxPlaybackId: row.mux_playback_id || null,
      thumbnailUrl: row.thumbnail_url || null,
      captionsUrl: row.captions_url || null,
      chapters: CHAPTERS.map((title, i) => ({
        title,
        startSec: [0, mainStarts, cooldownStarts][i],
      })),
      easierOptions: CHAPTERS.map((chapter, i) => ({ chapter, text: easier[i] })),
      isFree: bool(slug, 'is_free', row.is_free),
      published: bool(slug, 'published', row.published),
    };
  });
}

const text = (value: string | null) => (value === null ? 'null' : `'${value.replace(/'/g, "''")}'`);
const array = (values: string[]) => `array[${values.map(text).join(', ')}]::text[]`;
const jsonb = (value: unknown) => `${text(JSON.stringify(value))}::jsonb`;

export function toSql(classes: SeedClass[]): string {
  const rows = classes
    .map((cls) =>
      [
        text(cls.id),
        text(cls.slug),
        text(cls.title),
        text(cls.instructorId),
        cls.lengthMin,
        cls.level,
        text(cls.focus),
        cls.intensity,
        array(cls.equipment),
        array(cls.unsuitableFor),
        text(cls.muxPlaybackId),
        text(cls.thumbnailUrl),
        jsonb(
          cls.chapters.map((chapter) => ({ title: chapter.title, start_sec: chapter.startSec })),
        ),
        jsonb(cls.easierOptions),
        text(cls.captionsUrl),
        cls.isFree,
        cls.published,
      ].join(', '),
    )
    .map((values) => `  (${values})`)
    .join(',\n');

  return `-- GENERATED by scripts/build-seed.ts from supabase/seed/classes.csv. Do not edit by hand.
-- Edit the sheet, then run: npm run seed:build
--
-- PLACEHOLDER CONTENT. The sixteen classes, their tags and their easier options
-- stand in for the real classes so the plan engine and every screen can be
-- built and tested. TODO(owner): replace with the instructor's own tag sheet.

insert into public.instructors (id, slug, name, credential, bio, photo_url)
values (${text(INSTRUCTOR_ID)}, ${text(INSTRUCTOR_SLUG)}, ${text(brand.instructor.name)}, ${text(brand.instructor.credential)}, null, null)
on conflict (id) do update
  set name = excluded.name, credential = excluded.credential;

insert into public.classes (
  id, slug, title, instructor_id, length_min, level, focus, intensity,
  equipment, unsuitable_for, mux_playback_id, thumbnail_url,
  chapters, easier_options, captions_url, is_free, published
)
values
${rows}
on conflict (slug) do update set
  title = excluded.title,
  instructor_id = excluded.instructor_id,
  length_min = excluded.length_min,
  level = excluded.level,
  focus = excluded.focus,
  intensity = excluded.intensity,
  equipment = excluded.equipment,
  unsuitable_for = excluded.unsuitable_for,
  mux_playback_id = excluded.mux_playback_id,
  thumbnail_url = excluded.thumbnail_url,
  chapters = excluded.chapters,
  easier_options = excluded.easier_options,
  captions_url = excluded.captions_url,
  is_free = excluded.is_free,
  published = excluded.published;
`;
}

export const toJson = (classes: SeedClass[]) => JSON.stringify(classes, null, 2) + '\n';

function main() {
  const classes = readClasses();
  const sql = toSql(classes);
  const json = toJson(classes);

  if (process.argv.includes('--check')) {
    const stale = [
      [SQL, sql],
      [JSON_OUT, json],
    ].filter(([path, expected]) => {
      try {
        return readFileSync(path, 'utf8') !== expected;
      } catch {
        return true;
      }
    });
    if (stale.length > 0) {
      console.error(
        `Out of date: ${stale.map(([path]) => path).join(', ')}\nRun: npm run seed:build`,
      );
      process.exit(1);
    }
    console.log(`Seed files match classes.csv (${classes.length} classes).`);
    return;
  }

  writeFileSync(SQL, sql);
  writeFileSync(JSON_OUT, json);
  console.log(`Wrote ${classes.length} classes to supabase/seed.sql and seedClasses.json.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
