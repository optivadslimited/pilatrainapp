import { contrastRatio, darkColors, lightColors, palette } from '../colors';

/**
 * Body text must hold at least 4.5:1 against what it sits on. These are the
 * text-on-surface pairs the components actually use.
 */
const AA = 4.5;

const pairs = (c: typeof lightColors): [name: string, text: string, surface: string][] => [
  ['text on background', c.text, c.background],
  ['text on surface', c.text, c.surface],
  ['text on selected tint', c.text, c.selectedTint],
  ['secondary text on background', c.textSecondary, c.background],
  ['secondary text on surface', c.textSecondary, c.surface],
  ['primary on background (text button)', c.primary, c.background],
  ['primary on selected tint (selected chip)', c.primary, c.selectedTint],
  ['text on primary (primary button)', c.onPrimary, c.primary],
  ['text on pressed primary', c.onPrimary, c.primaryPressed],
  ['text on dark surface', c.onDark, c.surfaceDark],
  ['text on accent (savings tag)', c.onAccent, c.accent],
  ['error text on background', c.error, c.background],
  ['error text on surface', c.error, c.surface],
];

describe('colour contrast', () => {
  it.each(pairs(lightColors))('light: %s is at least 4.5:1', (_name, text, surface) => {
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(AA);
  });

  it.each(pairs(darkColors))('dark: %s is at least 4.5:1', (_name, text, surface) => {
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(AA);
  });

  it('computes the WCAG ratio', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});

describe('palette', () => {
  it('has the ten specified colours, exactly', () => {
    expect(palette).toEqual({
      paper: '#F7F4EE',
      sand: '#ECE7DD',
      ink: '#1B2430',
      slate: '#4A5568',
      line: '#D9D2C5',
      moss: '#1F5D54',
      mossDeep: '#1F4D46',
      mist: '#DCEBE7',
      clay: '#A94A24',
      alert: '#A3362B',
    });
  });

  it('uses no pure white and no pure black anywhere', () => {
    const all = [
      ...Object.values(palette),
      ...Object.values(lightColors),
      ...Object.values(darkColors),
    ];
    for (const colour of all) {
      expect(colour.toUpperCase()).not.toBe('#FFFFFF');
      expect(colour.toUpperCase()).not.toBe('#000000');
      expect(colour.replace(/\s/g, '')).not.toMatch(/^rgba?\(255,255,255(,1)?\)$/);
      expect(colour.replace(/\s/g, '')).not.toMatch(/^rgba?\(0,0,0(,1)?\)$/);
    }
  });
});
