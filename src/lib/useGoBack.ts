import { useRouter, type Href } from 'expo-router';

/**
 * Go back, or to `fallback` if there is nowhere to go back to (the screen was
 * opened directly, by a link or a restored session).
 */
export function useGoBack(fallback: Href): () => void {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback);
  };
}
