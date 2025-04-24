// All crypto/key/location helpers extracted from index.tsx
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';

// Library structure constants
export const VOLUMES_PER_SHELF = 32;
export const SHELVES_PER_WALL = 5;
export const WALLS_PER_HEX = 4;
export const PAGES_PER_VOLUME = 410;
export const WALLS = BigInt(WALLS_PER_HEX);
export const SHELVES = BigInt(SHELVES_PER_WALL);
export const VOLUMES = BigInt(VOLUMES_PER_SHELF);
export const PAGES = BigInt(PAGES_PER_VOLUME);
export const MAX_KEY = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); // 2^256 - 1
export const N = MAX_KEY + 1n;

// Feistel parameters
const FEISTEL_ROUNDS = 10;
const FEISTEL_KEYS = [
  BigInt('314159265358979323846264338327950288419716939937510'),
  BigInt('271828182845904523536028747135266249775724709369995'),
  BigInt('141421356237309504880168872420969807856967187537694'),
  BigInt('161803398874989484820458683436563811772030917980576'),
  BigInt('173205080756887729352744634150587236694280525910297'),
  BigInt('223606797749978969640917366873127623544061835961153'),
  BigInt('112358132134558914423337761098715972584418167651094'),
  BigInt('271828182845904523536028747135266249775724709369995'),
  BigInt('314159265358979323846264338327950288419716939937510'),
  BigInt('161803398874989484820458683436563811772030917980576'),
];

// Improved Feistel round function for better bit mixing
function feistelF(right: bigint, key: bigint): bigint {
  // Mix using both multiplication and xor, then mod 2^128
  return ((right ^ key) * (key | 1n) + (right << 13n) + (right >> 17n)) % (1n << 128n);
}

function feistelEncrypt(index: bigint): bigint {
  let L = index >> 128n;
  let R = index & ((1n << 128n) - 1n);
  for (let i = 0; i < FEISTEL_ROUNDS; ++i) {
    const newL = R;
    const newR = L ^ feistelF(R, FEISTEL_KEYS[i]);
    L = newL;
    R = newR;
  }
  return (L << 128n) | R;
}

function feistelDecrypt(key: bigint): bigint {
  let L = key >> 128n;
  let R = key & ((1n << 128n) - 1n);
  for (let i = FEISTEL_ROUNDS - 1; i >= 0; --i) {
    const newR = L;
    const newL = R ^ feistelF(L, FEISTEL_KEYS[i]);
    L = newL;
    R = newR;
  }
  return (L << 128n) | R;
}

// Types
export interface LocationResult {
  hex: string;
  wall: number;
  shelf: number;
  volume: number;
  page: number;
}

export interface SearchInterpretation {
  input: string;
  brainwalletKey: bigint;
  brainwalletLoc: LocationResult;
  base64Key?: bigint;
  base64Loc?: LocationResult;
  base64Canonical?: string;
  hexKey?: bigint;
  hexLoc?: LocationResult;
}

// Base36 <-> BigInt
export function base36ToBigInt(str: string): bigint {
  let res = 0n;
  for (let i = 0; i < str.length; i++) {
    const digit = parseInt(str[i], 36);
    if (isNaN(digit)) throw new Error('Invalid base36');
    res = res * 36n + BigInt(digit);
  }
  return res;
}
export function bigIntToBase36(num: bigint): string {
  if (num === 0n) return '0';
  let result = '';
  let n = num;
  while (n > 0n) {
    const rem = n % 36n;
    result = rem.toString(36) + result;
    n /= 36n;
  }
  return result;
}

// Location <-> Index
export function locationToIndex(hex: string, wall: number, shelf: number, volume: number, page: number): bigint {
  const hexNum = base36ToBigInt(hex);
  let idx = ((((hexNum * WALLS + BigInt(wall)) * SHELVES + BigInt(shelf)) * VOLUMES + BigInt(volume)) * PAGES + BigInt(page));
  return idx % N;
}
export function indexToLocation(index: bigint): LocationResult {
  let idx = index % N;
  let remainder = idx;
  const page = remainder % PAGES;
  remainder /= PAGES;
  const volume = remainder % VOLUMES;
  remainder /= VOLUMES;
  const shelf = remainder % SHELVES;
  remainder /= SHELVES;
  const wall = remainder % WALLS;
  remainder /= WALLS;
  const hex = remainder;
  return {
    hex: bigIntToBase36(hex),
    wall: Number(wall),
    shelf: Number(shelf),
    volume: Number(volume),
    page: Number(page)
  };
}

// Location <-> Key (Feistel scrambling)
export function locationToKey(hex: string, wall: number, shelf: number, volume: number, page: number): bigint {
  const index = locationToIndex(hex, wall, shelf, volume, page);
  return feistelEncrypt(index);
}
export function keyToLocation(key: bigint): LocationResult {
  const index = feistelDecrypt(key);
  return indexToLocation(index);
}

// Key/encoding helpers
export function base64ToBytes(str: string): Uint8Array | null {
  try {
    if (typeof Buffer !== 'undefined') {
      return Uint8Array.from(Buffer.from(str, 'base64'));
    } else {
      const bin = atob(str);
      return Uint8Array.from(bin, c => c.charCodeAt(0));
    }
  } catch {
    return null;
  }
}
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  } else {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
}
export function to32Bytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) return bytes.slice(0, 32);
  const out = new Uint8Array(32);
  out.set(bytes, 32 - bytes.length);
  return out;
}
export function isHexKey(str: string): boolean {
  return /^(0x)?[0-9a-fA-F]{1,64}$/.test(str);
}
export function keyToCanonicalBase64(key: bigint): string {
  const hex = key.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  return bytesToBase64(bytes);
}
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(x => x.toString(16).padStart(2, '0')).join('');
}
export function pubkeyToP2WPKH(pubkeyHex: string): string {
  // 1. Hash160 (SHA256 then RIPEMD160)
  // TODO: Implement or import ripemd160
  return '';
}

// Utility for SSR/CSR-safe state initialization
export function getInitialLocation(): LocationResult {
  if (typeof window === 'undefined') return { hex: '0', wall: 0, shelf: 0, volume: 0, page: 0 };
  const params = new URLSearchParams(window.location.search);
  return {
    hex: params.get('hex') || '0',
    wall: Number(params.get('wall') ?? 0),
    shelf: Number(params.get('shelf') ?? 0),
    volume: Number(params.get('volume') ?? 0),
    page: Number(params.get('page') ?? 0)
  };
}

// Search interpretation utility
export function interpretInput(input: string): SearchInterpretation {
  // 1. Brainwallet (SHA256)
  const brainHash = nobleSha256(new TextEncoder().encode(input));
  const brainKey = BigInt('0x' + bytesToHex(brainHash));
  const brainLoc = keyToLocation(brainKey);

  // 2. Base64 (if decodable)
  let base64Key: bigint | undefined, base64Loc: LocationResult | undefined, base64Canonical: string | undefined;
  const bytes = base64ToBytes(input);
  if (bytes) {
    const padded = to32Bytes(bytes);
    base64Key = BigInt('0x' + bytesToHex(padded));
    base64Loc = keyToLocation(base64Key);
    base64Canonical = bytesToBase64(padded);
  }

  // 3. Hex (if valid)
  let hexKey: bigint | undefined, hexLoc: LocationResult | undefined;
  if (isHexKey(input)) {
    hexKey = input.startsWith('0x') ? BigInt(input) : BigInt('0x' + input);
    hexLoc = keyToLocation(hexKey);
  }

  return {
    input,
    brainwalletKey: brainKey,
    brainwalletLoc: brainLoc,
    base64Key,
    base64Loc,
    base64Canonical,
    hexKey,
    hexLoc
  };
}

// Random string utility
export function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
