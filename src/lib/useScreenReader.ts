import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Whether VoiceOver is on, kept up to date while the screen is open. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (alive) setOn(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return on;
}
