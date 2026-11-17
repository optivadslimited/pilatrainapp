import fs from 'fs';
import path from 'path';

import { brand } from '@/config/brand';

import { en } from '../en';

/**
 * The hard rules for copy, checked against every string in the app.
 * A string that is a function is called with sample arguments.
 */
function collect(node: unknown, trail: string, out: [string, string][]): void {
  if (typeof node === 'string') {
    out.push([trail, node]);
  } else if (typeof node === 'function') {
    const args = Array.from({ length: node.length }, (_, i) => (i === 0 ? 3 : 4));
    collect((node as (...a: unknown[]) => unknown)(...args), `${trail}()`, out);
  } else if (Array.isArray(node)) {
    node.forEach((item, i) => collect(item, `${trail}[${i}]`, out));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) collect(value, `${trail}.${key}`, out);
  }
}

const strings: [string, string][] = [];
collect(en, 'en', strings);

const banned: [rule: string, pattern: RegExp][] = [
  // No weight-loss claims, no before/after, no body or weight tracking.
  [
    'weight loss',
    /\b(weight[- ]loss|lose weight|slim|burn(s|ing)? (fat|calories)|calorie|fat[- ]burn|inches|kilo|pounds|lbs)\b/i,
  ],
  ['before and after', /\bbefore[- ](and|&|\/)[- ]?after\b/i],
  // No medical claims.
  [
    'medical claim',
    /\b(cure|cures|heal|heals|treat|treats|treatment|therap(y|eutic)|diagnos|prevent(s)? (injury|pain)|relieve(s)? pain|fix(es)? your)\b/i,
  ],
  // No guilt and no streak pressure.
  ['streak pressure', /\b(streak|don[’']t break|keep it going|in a row)\b/i],
  [
    'guilt',
    /\b(you missed|you skipped|you failed|fell behind|falling behind|behind schedule|no excuses|lazy|don[’']t give up|let yourself down|shame)\b/i,
  ],
  // Never invent testimonials, ratings or member counts.
  [
    'invented social proof',
    /\b(\d[\d,.]*\+? (members|women|users|people|reviews|ratings)|rated \d|\d(\.\d)? stars?|★)\b/i,
  ],
  // Prices come from StoreKit, never typed into the app.
  ['typed price', /[$£€]\s?\d/],
  // Nothing that looks like a game.
  ['emoji', /\p{Extended_Pictographic}/u],
];

describe('copy rules', () => {
  it('has strings to check', () => {
    expect(strings.length).toBeGreaterThan(80);
  });

  it.each(banned)('contains no %s', (_rule, pattern) => {
    const offenders = strings.filter(([, text]) => pattern.test(text));
    expect(offenders).toEqual([]);
  });

  it('says the safety message exactly as specified', () => {
    expect(`${en.safety.title} ${en.safety.body}`).toBe(
      `Please check with your doctor or physiotherapist before starting. ${brand.name} offers general movement classes and is not medical advice.`,
    );
    expect(en.safety.cleared).toBe('I’ve been cleared to exercise');
    expect(en.safety.checkFirst).toBe('I’ll check first');
  });

  it('says the welcome and plan-building lines exactly as specified', () => {
    expect(en.welcome.headline).toBe('Pilates that fits your day.');
    expect(en.welcome.line).toBe('A personal plan in 90 seconds.');
    expect(en.welcome.primary).toBe('Build my plan');
    expect(en.welcome.signIn).toBe('I already have an account');
    expect(en.building.lines).toEqual([
      'Matching classes to your level',
      'Fitting your week',
      'Balancing strength and recovery',
    ]);
  });
});

describe('one-file rename', () => {
  it('never types the product name into the strings file', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'en.ts'), 'utf8');
    // Strip comments, then look for the name written out in a string.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toContain(brand.name);
  });

  it('never types the product name into a screen or component', () => {
    const root = path.join(__dirname, '..', '..');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(full);
        } else if (
          /\.(ts|tsx)$/.test(entry.name) &&
          !full.endsWith(path.join('config', 'brand.ts'))
        ) {
          const code = fs
            .readFileSync(full, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/^\s*\/\/.*$/gm, '')
            .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
          // The storage id and font keys are internal identifiers, not the visible name.
          if (/['"`][^'"`\n]*Pilatrain[^'"`\n]*['"`]/.test(code))
            offenders.push(path.relative(root, full));
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
