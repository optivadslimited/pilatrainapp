import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { now, today } from './clock';

/**
 * Today's date, kept current: it is read again whenever the screen comes into
 * view and whenever the app returns to the front, so a screen left open
 * overnight shows the right day in the morning.
 */
export function useToday(): string {
  const [date, setDate] = useState(today);

  useFocusEffect(
    useCallback(() => {
      setDate(today());
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDate(today());
    });
    return () => subscription.remove();
  }, []);

  return date;
}

/**
 * This moment, kept current the same way, for things that turn on a time
 * rather than a date (a trial that ends at a quarter past ten).
 */
export function useNow(): Date {
  const [moment, setMoment] = useState(now);

  useFocusEffect(
    useCallback(() => {
      setMoment(now());
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setMoment(now());
    });
    return () => subscription.remove();
  }, []);

  return moment;
}
