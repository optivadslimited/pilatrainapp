import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform, StyleSheet } from 'react-native';

import { Button } from '@/components';
import { t } from '@/strings';
import { radius, size } from '@/theme';

/**
 * Sign in with Apple. On an iPhone this is Apple's own button, as its
 * guidelines require. Anywhere else (the web preview) it is ours.
 */
export function AppleButton({
  onPress,
  disabled,
  testID,
}: {
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  if (Platform.OS !== 'ios') {
    return (
      <Button
        label={t.account.apple}
        variant="secondary"
        onPress={onPress}
        disabled={disabled}
        testID={testID}
      />
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius.pill}
      onPress={disabled ? () => {} : onPress}
      style={[styles.button, disabled && styles.disabled]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  button: { height: size.buttonHeight, width: '100%' },
  disabled: { opacity: 0.4 },
});
