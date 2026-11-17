import * as WebBrowser from 'expo-web-browser';

import { lightColors } from '@/theme';

/** Opens a page of the website (Terms, Privacy, Health disclaimer) in the in-app browser. */
export async function openLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      controlsColor: lightColors.primary,
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  } catch {
    // The browser could not open (no connection, or dismissed mid-load). Nothing to recover.
  }
}
