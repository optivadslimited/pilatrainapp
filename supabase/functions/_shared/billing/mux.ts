/**
 * Signed playback tokens for Mux.
 *
 * Member classes use signed playback: the video address only works with a
 * short-lived token, and only the `playback-token` function, which has
 * checked her membership, can make one. The signing key never leaves the
 * server.
 *
 * A token is a JWT signed with RS256. It is built here with Web Crypto, which
 * Supabase Edge Functions (Deno) and Node both provide, so the same code is
 * tested by Jest and run on the server.
 *
 * NOT YET RUN AGAINST MUX. TODO(owner): create a signing key in the Mux
 * dashboard and set MUX_SIGNING_KEY_ID and MUX_SIGNING_PRIVATE_KEY as
 * function secrets.
 */

/** How long a token lasts. Long enough for any class, with a pause in the middle. */
export const PLAYBACK_TOKEN_SECONDS = 6 * 60 * 60;

const encoder = new TextEncoder();

const base64url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Bytes backed by a plain buffer, which is what Web Crypto accepts. */
type Bytes = Uint8Array<ArrayBuffer>;

const fromBase64 = (text: string): Bytes => {
  const binary = atob(text.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/** DER length bytes. */
const derLength = (length: number): number[] => {
  if (length < 0x80) return [length];
  const bytes: number[] = [];
  for (let rest = length; rest > 0; rest >>= 8) bytes.unshift(rest & 0xff);
  return [0x80 | bytes.length, ...bytes];
};

const der = (tag: number, content: number[] | Uint8Array): number[] => [
  tag,
  ...derLength(content.length),
  ...content,
];

/**
 * Wraps an RSA key in PKCS#1 form ("BEGIN RSA PRIVATE KEY", which is what Mux
 * hands out) in the PKCS#8 envelope that Web Crypto requires.
 */
export function pkcs1ToPkcs8(pkcs1: Uint8Array): Bytes {
  const version = [0x02, 0x01, 0x00];
  // SEQUENCE { OID 1.2.840.113549.1.1.1 (rsaEncryption), NULL }
  const algorithm = [
    0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
  ];
  return new Uint8Array(der(0x30, [...version, ...algorithm, ...der(0x04, pkcs1)]));
}

/**
 * The key as Web Crypto wants it, from any of the forms it may be stored in:
 * a PEM, or (as Mux gives it) that PEM base64-encoded once more; PKCS#1 or PKCS#8.
 */
export function privateKeyDer(secret: string): Bytes {
  const pem = secret.includes('-----BEGIN') ? secret : new TextDecoder().decode(fromBase64(secret));
  const pkcs1 = pem.includes('BEGIN RSA PRIVATE KEY');
  const body = pem.replace(/-----(BEGIN|END)[A-Z ]+-----/g, '');
  const bytes = fromBase64(body);
  return pkcs1 ? pkcs1ToPkcs8(bytes) : bytes;
}

export type PlaybackTokenInput = {
  playbackId: string;
  /** The signing key's ID, from the Mux dashboard. */
  keyId: string;
  /** The signing key's private half, as stored in the function's secrets. */
  privateKey: string;
  now: Date;
  /** Seconds the token lasts. */
  ttl?: number;
};

/** A token that lets one playback ID be watched for a few hours. */
export async function signPlaybackToken(
  input: PlaybackTokenInput,
  subtle: SubtleCrypto = crypto.subtle,
): Promise<{ token: string; expiresAt: string }> {
  const issued = Math.floor(input.now.getTime() / 1000);
  const expires = issued + (input.ttl ?? PLAYBACK_TOKEN_SECONDS);

  const header = { alg: 'RS256', typ: 'JWT', kid: input.keyId };
  // `aud: "v"` is Mux's audience for video playback.
  const claims = { sub: input.playbackId, aud: 'v', exp: expires, kid: input.keyId };

  const signingInput = `${base64url(encoder.encode(JSON.stringify(header)))}.${base64url(
    encoder.encode(JSON.stringify(claims)),
  )}`;

  const key = await subtle.importKey(
    'pkcs8',
    privateKeyDer(input.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));

  return {
    token: `${signingInput}.${base64url(new Uint8Array(signature))}`,
    expiresAt: new Date(expires * 1000).toISOString(),
  };
}

/** The address a signed class plays from. */
export const signedStreamUrl = (playbackId: string, token: string): string =>
  `https://stream.mux.com/${playbackId}.m3u8?token=${token}`;
