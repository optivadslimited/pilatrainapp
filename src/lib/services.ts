import { purchases } from '@/features/membership/purchases';

import { identifyForAttribution, startAttribution } from './attribution';
import { identifyForAnalytics, startAnalytics } from './posthog';
import { identifyForCrashReports, startCrashReporting } from './sentry';

/**
 * The outside services, started together at launch and told together who she
 * is. Each one does nothing until its key is supplied.
 *
 * "Who she is" is her user ID and nothing more: a random UUID that our own
 * database, RevenueCat and these services all share. Her name, her email and
 * her answers stay in our database.
 */
export function startServices(): void {
  startCrashReporting();
  startAnalytics();
  startAttribution((id) => purchases.setAttributionId(id));
}

export function identify(userId: string | null): void {
  identifyForAnalytics(userId);
  identifyForCrashReports(userId);
  identifyForAttribution(userId);
}
