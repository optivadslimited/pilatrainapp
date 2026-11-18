/**
 * The plan engine: fixed rules, no machine learning.
 *
 *   build.ts        rules 3 and 7, and re-planning the remaining weeks
 *   eligibility.ts  rule 1, and what each week's theme allows
 *   mix.ts          rule 4, and the gentle track's preference
 *   fill.ts         rules 2, 5 and 6: choosing the classes
 *   reschedule.ts   rule 9: missed and moved sessions
 *   feedback.ts     rules 8 and 10: her ratings, and the next block
 */
export * from './build.ts';
export * from './dates.ts';
export * from './domain.ts';
export * from './eligibility.ts';
export * from './feedback.ts';
export { bundleOf, type Bundle, type Edge } from './fill.ts';
export { apportion, focusPreference, focusWeights } from './mix.ts';
export * from './reschedule.ts';
