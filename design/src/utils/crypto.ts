/**
 * Deterministic SHA-256 cryptographic utility for browser & node environments.
 * Implements standard FIPS 180-4 SHA-256 synchronously for tamper-evident hash chaining.
 */

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

export function sha256(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i: number, j: number;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash: number[] = [];
  let k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) {
      // Fallback for unicode: encode as utf-8 bytes
      const encoded = encodeURIComponent(ascii[i]);
      // Standard ascii chars will pass through
      return sha256(unescape(encodeURIComponent(ascii)));
    }
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) | 0;

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const t1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;
      const t2 = (s0h + maj) | 0;

      hash = [(t1 + t2) | 0, hash[0], hash[1], hash[2], (hash[3] + t1) | 0, hash[4], hash[5], hash[6]];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Deterministic JSON stringifier with sorted object keys for stable hashing.
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || obj === undefined) return '';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k])).join(',') + '}';
}

/**
 * Calculates the tamper-evident SHA-256 hash of an audit event block.
 */
export function calculateAuditEventHash(event: {
  previousHash: string;
  id: string;
  time: string;
  user: string;
  action: string;
  resource: string;
  company: string;
  ip: string;
  device: string;
  correlation: string;
  actor?: any;
  justificationReason?: string;
  beforeState?: any;
  afterState?: any;
}): string {
  const payload = [
    event.previousHash,
    event.id,
    event.time,
    event.user,
    event.action,
    event.resource,
    event.company,
    event.ip,
    event.device,
    event.correlation,
    event.justificationReason || '',
    canonicalJsonStringify(event.actor || {}),
    canonicalJsonStringify(event.beforeState || {}),
    canonicalJsonStringify(event.afterState || {}),
  ].join('|');

  return sha256(payload);
}
