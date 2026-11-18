import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { today } from './clock';

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
