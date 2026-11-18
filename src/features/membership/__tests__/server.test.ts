import { generateKeyPairSync, webcrypto, createVerify } from 'crypto';

import {
  PLAYBACK_TOKEN_SECONDS,
  pkcs1ToPkcs8,
  privateKeyDer,
  signedStreamUrl,
  signPlaybackToken,
} from '@shared/billing/mux';
import { rowFromSubscriber, type RcSubscriber } from '@shared/billing/subscriber';
import { hasAccess } from '@shared/billing/subscription';
import { sameSecret } from '@shared/http';

const USER = '0b0e7a52-4c0b-4d55-9a6e-2f6f0d1c9a11';
const NOW = new Date('2026-12-01T10:00:00.000Z');
const subtle = webcrypto.subtle as unknown as SubtleCrypto;

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

describe('signed Mux playback tokens', () => {
  // A throwaway key, made here. The real one lives only in the function's secrets.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pkcs1Pem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;
  const pkcs8Pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

  const sign = (key: string) =>
    signPlaybackToken(
      { playbackId: 'PLAYBACK', keyId: 'KEY_ID', privateKey: key, now: NOW },
      subtle,
    );

  it('signs a token Mux can verify, for one playback ID, for a few hours', async () => {
    const { token, expiresAt } = await sign(pkcs8Pem);
    const [header, claims, signature] = token.split('.');

    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'KEY_ID' });
    expect(decode(claims)).toEqual({
      sub: 'PLAYBACK',
      aud: 'v',
      exp: Math.floor(NOW.getTime() / 1000) + PLAYBACK_TOKEN_SECONDS,
      kid: 'KEY_ID',
    });
    expect(expiresAt).toBe('2026-12-01T16:00:00.000Z');

    const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);
    expect(verifier.verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
  });

  it('accepts the key in each form it may be stored in', async () => {
    // Mux hands the key out as a PKCS#1 PEM, base64-encoded once more.
    const asMuxGivesIt = Buffer.from(pkcs1Pem).toString('base64');
    for (const key of [pkcs8Pem, pkcs1Pem, asMuxGivesIt]) {
      const { token } = await sign(key);
      const [header, claims, signature] = token.split('.');
      const verifier = createVerify('RSA-SHA256').update(`${header}.${claims}`);
      expect(verifier.verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
    }
  });

  it('wraps a PKCS#1 key exactly as OpenSSL would', () => {
    const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'der' });
    const pkcs8 = privateKey.export({ type: 'pkcs8', format: 'der' });
    expect(Buffer.from(pkcs1ToPkcs8(new Uint8Array(pkcs1))).equals(pkcs8)).toBe(true);
    expect(Buffer.from(privateKeyDer(pkcs1Pem)).equals(pkcs8)).toBe(true);
  });

  it('builds the stream address', () => {
    expect(signedStreamUrl('PLAYBACK', 'TOKEN')).toBe(
      'https://stream.mux.com/PLAYBACK.m3u8?token=TOKEN',
    );
  });
});

describe('a RevenueCat customer record', () => {
  const subscriber = (
    overrides: Record<string, unknown> = {},
    entitlement: Record<string, unknown> = {},
  ): RcSubscriber => ({
    subscriber: {
      entitlements: {
        member: {
          expires_date: '2026-12-08T10:00:00Z',
          product_identifier: 'pilatrain_quarterly',
          ...entitlement,
        },
      },
      subscriptions: {
        pilatrain_quarterly: {
          expires_date: '2026-12-08T10:00:00Z',
          period_type: 'trial',
          is_sandbox: false,
          ...overrides,
        },
      },
    },
  });
  const row = (response: RcSubscriber) => rowFromSubscriber(response, USER, 'member', NOW);

  it('reads a trial', () => {
    expect(row(subscriber())).toEqual({
      user_id: USER,
      product_id: 'pilatrain_quarterly',
      status: 'trial',
      period_end: '2026-12-08T10:00:00.000Z',
      will_renew: true,
      last_event_at: NOW.toISOString(),
      environment: 'production',
    });
  });

  it('reads a paid subscription, and one she has cancelled', () => {
    expect(row(subscriber({ period_type: 'normal' }))?.status).toBe('active');
    const cancelled = row(
      subscriber({ period_type: 'normal', unsubscribe_detected_at: '2026-11-30T10:00:00Z' }),
    );
    expect(cancelled).toMatchObject({ status: 'active', will_renew: false });
    expect(hasAccess(cancelled, NOW)).toBe(true);
  });

  it('reads the billing grace period, and keeps access through it', () => {
    const grace = row(
      subscriber(
        { period_type: 'normal', billing_issues_detected_at: '2026-11-30T10:00:00Z' },
        { expires_date: '2026-11-30T10:00:00Z', grace_period_expires_date: '2026-12-16T10:00:00Z' },
      ),
    );
    expect(grace).toMatchObject({ status: 'grace', period_end: '2026-12-16T10:00:00.000Z' });
    expect(hasAccess(grace, NOW)).toBe(true);
  });

  it('reads an expired or refunded subscription as no access', () => {
    const expired = row(
      subscriber({ period_type: 'normal' }, { expires_date: '2026-11-20T10:00:00Z' }),
    );
    expect(expired).toMatchObject({ status: 'expired', will_renew: false });
    expect(hasAccess(expired, NOW)).toBe(false);
    expect(row(subscriber({ refunded_at: '2026-11-30T10:00:00Z' }))?.status).toBe('expired');
  });

  it('marks sandbox purchases, and writes nothing for someone who never subscribed', () => {
    expect(row(subscriber({ is_sandbox: true }))?.environment).toBe('sandbox');
    expect(row({ subscriber: { entitlements: {}, subscriptions: {} } })).toBeNull();
    expect(row({})).toBeNull();
  });
});

describe('the webhook secret', () => {
  it('matches only the exact value', () => {
    expect(sameSecret('s3cret', 's3cret')).toBe(true);
    expect(sameSecret('s3cret', 's3cre')).toBe(false);
    expect(sameSecret('s3cret', 's3creT')).toBe(false);
    expect(sameSecret('', 's3cret')).toBe(false);
  });
});
