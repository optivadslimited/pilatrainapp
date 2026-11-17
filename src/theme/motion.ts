import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
  useReducedMotion,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

/**
 * Motion tokens. Motion should feel like breathing and never like a game.
 *
 * One standard spring for everything that moves. Everything here runs on the
 * UI thread through Reanimated.
 */
export const standardSpring = {
  damping: 18,
  stiffness: 180,
  mass: 1,
} as const satisfies WithSpringConfig;

export const duration = {
  /** Options scale to 0.98 on press. */
  press: 120,
  /** Delay between list items entering. */
  stagger: 40,
  /** Progress rings fill. */
  ring: 600,
  /** The wordmark fades in on launch. */
  wordmark: 400,
  /** A quiz screen advances this long after a single choice. */
  autoAdvance: 250,
  /** A cross-fade, used wherever Reduce Motion replaces movement. */
  fade: 200,
  /** One full breath of the plan-building ring: in and out. */
  breath: 4000,
  /** Player controls fade after this long without a touch. */
  controlsIdle: 3000,
  toast: 3200,
} as const;

/** Scale of a pressed option. */
export const pressedScale = 0.98;

export const easeOut = Easing.out(Easing.cubic);
export const easeInOut = Easing.inOut(Easing.sin);

/**
 * A fade that still plays when Reduce Motion is on. Reanimated skips
 * animations under Reduce Motion by default; cross-fades are exactly what we
 * want to keep, so they opt out.
 */
export const fadeTiming = (ms: number = duration.fade): WithTimingConfig => ({
  duration: ms,
  easing: easeOut,
  reduceMotion: ReduceMotion.Never,
});

/** Timing for the ring fill: 600 ms, ease-out. */
export const ringTiming: WithTimingConfig = {
  duration: duration.ring,
  easing: easeOut,
  reduceMotion: ReduceMotion.Never,
};

/**
 * Whether the system's Reduce Motion setting is on. Starts from the value
 * Reanimated read at launch and follows changes while the app is open.
 */
export function useReduceMotion(): boolean {
  const initial = useReducedMotion();
  const [reduce, setReduce] = useState(initial);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduce(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}

/**
 * Entering animation for the item at `index` in a list: a short rise on the
 * standard spring, 40 ms apart. With Reduce Motion on it is a plain fade.
 */
export function enterStaggered(index: number, reduceMotion: boolean) {
  const delay = index * duration.stagger;
  if (reduceMotion) {
    return FadeIn.delay(delay).duration(duration.fade).reduceMotion(ReduceMotion.Never);
  }
  return FadeInDown.delay(delay)
    .springify()
    .damping(standardSpring.damping)
    .stiffness(standardSpring.stiffness)
    .mass(standardSpring.mass);
}

/** A plain cross-fade in and out, safe under Reduce Motion. */
export const fadeIn = (ms: number = duration.fade) =>
  FadeIn.duration(ms).reduceMotion(ReduceMotion.Never);
export const fadeOut = (ms: number = duration.fade) =>
  FadeOut.duration(ms).reduceMotion(ReduceMotion.Never);
