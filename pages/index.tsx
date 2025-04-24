import { useState } from 'react';
import { getPublicKey } from '@noble/secp256k1';
import { bech32 } from 'bech32';
import { sha256 as nobleSha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

// Constants for library structure
const VOLUMES_PER_SHELF = 32;
const SHELVES_PER_WALL = 5;
const WALLS_PER_HEX = 4;
const PAGES_PER_VOLUME = 410;

const WALLS = BigInt(WALLS_PER_HEX);
const SHELVES = BigInt(SHELVES_PER_WALL);
const VOLUMES = BigInt(VOLUMES_PER_SHELF);
const PAGES = BigInt(PAGES_PER_VOLUME);

const MAX_KEY = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'); // 2^256 - 1
const N = MAX_KEY + 1n;

// Feistel network parameters
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

// Arbitrary-precision base36 to BigInt
function base36ToBigInt(str: string): bigint {
  let result = 0n;
  for (let i = 0; i < str.length; i++) {
    const c = str[i].toLowerCase();
    let v;
    if (c >= '0' && c <= '9') v = c.charCodeAt(0) - 48;
    else if (c >= 'a' && c <= 'z') v = c.charCodeAt(0) - 87;
    else continue;
    result = result * 36n + BigInt(v);
  }
  return result;
}
function bigIntToBase36(num: bigint): string {
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

function locationToIndex(hex: string, wall: number, shelf: number, volume: number, page: number): bigint {
  // Convert hex string to BigInt
  const hexNum = base36ToBigInt(hex);
  let idx = ((((hexNum * WALLS + BigInt(wall)) * SHELVES + BigInt(shelf)) * VOLUMES + BigInt(volume)) * PAGES + BigInt(page));
  return idx % N; // Wrap to valid keyspace
}

function indexToLocation(index: bigint) {
  let idx = index % N; // Wrap to valid keyspace
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

function locationToKey(hex: string, wall: number, shelf: number, volume: number, page: number): bigint {
  const index = locationToIndex(hex, wall, shelf, volume, page);
  return feistelEncrypt(index);
}

function keyToLocation(key: bigint) {
  const index = feistelDecrypt(key);
  return indexToLocation(index);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(x => x.toString(16).padStart(2, '0')).join('');
}

function pubkeyToP2WPKH(pubkeyHex: string): string {
  // 1. Hash160 (SHA256 then RIPEMD160)
  const pubkeyBytes = Uint8Array.from(Buffer.from(pubkeyHex, 'hex'));
  const hash160 = ripemd160(nobleSha256(pubkeyBytes));
  // 2. Witness version 0 + hash160
  const words = bech32.toWords(hash160);
  words.unshift(0x00);
  // 3. Encode as bech32 (bc1...)
  return bech32.encode('bc', words);
}

// --- Types ---
interface LocationResult {
  hex: string;
  wall: number;
  shelf: number;
  volume: number;
  page: number;
  _isBrainwallet?: boolean;
  _brainwalletSource?: string;
}

export default function Home() {
  // State for navigation
  const [hex, setHex] = useState('0');
  const [wall, setWall] = useState(0);
  const [shelf, setShelf] = useState(0);
  const [volume, setVolume] = useState(0);
  const [page, setPage] = useState(0);
  const [keyInput, setKeyInput] = useState('');
  const [locationResult, setLocationResult] = useState<LocationResult | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [lastBrainwallet, setLastBrainwallet] = useState<{phrase: string, key: bigint} | null>(null);

  // Helper to clear brainwallet phrase if key changes
  function clearBrainwalletIfChanged(newKey: bigint) {
    if (lastBrainwallet && lastBrainwallet.key !== newKey) {
      setLastBrainwallet(null);
    }
  }

  // Clamp navigation
  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
  }

  // Navigation field handlers that clear brainwallet if changed
  function handleHexChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHex(e.target.value.replace(/[^a-zA-Z0-9]/g, ''));
    clearBrainwalletIfChanged(locationToKey(e.target.value.replace(/[^a-zA-Z0-9]/g, ''), wall, shelf, volume, page));
  }
  function handleWallChange(e: React.ChangeEvent<HTMLInputElement>) {
    setWall(clamp(Number(e.target.value), 0, WALLS_PER_HEX-1));
    clearBrainwalletIfChanged(locationToKey(hex, clamp(Number(e.target.value), 0, WALLS_PER_HEX-1), shelf, volume, page));
  }
  function handleShelfChange(e: React.ChangeEvent<HTMLInputElement>) {
    setShelf(clamp(Number(e.target.value), 0, SHELVES_PER_WALL-1));
    clearBrainwalletIfChanged(locationToKey(hex, wall, clamp(Number(e.target.value), 0, SHELVES_PER_WALL-1), volume, page));
  }
  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVolume(clamp(Number(e.target.value), 0, VOLUMES_PER_SHELF-1));
    clearBrainwalletIfChanged(locationToKey(hex, wall, shelf, clamp(Number(e.target.value), 0, VOLUMES_PER_SHELF-1), page));
  }
  function handlePageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPage(clamp(Number(e.target.value), 0, PAGES_PER_VOLUME-1));
    clearBrainwalletIfChanged(locationToKey(hex, wall, shelf, volume, clamp(Number(e.target.value), 0, PAGES_PER_VOLUME-1)));
  }

  function handleGoToLocation() {
    if (locationResult) {
      setHex(locationResult.hex);
      setWall(locationResult.wall);
      setShelf(locationResult.shelf);
      setVolume(locationResult.volume);
      setPage(locationResult.page);
      setLocationResult(null);
      setKeyInput('');
      if (locationResult._isBrainwallet && locationResult._brainwalletSource) {
        // Store both phrase and key for context-sensitive display
        setLastBrainwallet({phrase: locationResult._brainwalletSource, key: locationToKey(locationResult.hex, locationResult.wall, locationResult.shelf, locationResult.volume, locationResult.page)});
      } else {
        setLastBrainwallet(null);
      }
    }
  }

  function randomString(length: number) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  function handleRandom() {
    // Pick random valid values for all fields
    setHex(randomString(Math.floor(Math.random() * 8) + 2)); // 2-9 chars
    setWall(Math.floor(Math.random() * WALLS_PER_HEX));
    setShelf(Math.floor(Math.random() * SHELVES_PER_WALL));
    setVolume(Math.floor(Math.random() * VOLUMES_PER_SHELF));
    setPage(Math.floor(Math.random() * PAGES_PER_VOLUME));
    setLocationResult(null);
    setKeyInput('');
  }

  function handleKeySearch() {
    let isBrainwallet = false;
    let input = keyInput.trim();
    let keyBigInt: bigint | null = null;
    try {
      // Try to parse as hex or decimal private key
      if (/^(0x)?[0-9a-fA-F]{1,64}$/.test(input)) {
        keyBigInt = input.startsWith('0x') ? BigInt(input) : BigInt('0x' + input);
      } else {
        // Fallback: treat as brainwallet (hash string)
        const hash = nobleSha256(new TextEncoder().encode(input));
        keyBigInt = BigInt('0x' + bytesToHex(hash));
        isBrainwallet = true;
      }
      setLocationResult({ ...keyToLocation(keyBigInt), _isBrainwallet: isBrainwallet, _brainwalletSource: isBrainwallet ? input : undefined });
    } catch {
      setLocationResult(null);
    }
  }

  // Compute index and overflow
  const hexNum = base36ToBigInt(hex);
  let idx = ((((hexNum * WALLS + BigInt(wall)) * SHELVES + BigInt(shelf)) * VOLUMES + BigInt(volume)) * PAGES + BigInt(page));
  const didOverflow = idx >= N;
  const key = locationToKey(hex, wall, shelf, volume, page);

  // Compute public key and address
  let pubkeyHex = '';
  let bech32Addr = '';
  let isZeroKey = key === 0n;
  let zeroKeyMsg = '';
  if (isZeroKey) {
    zeroKeyMsg = '0x0 is not a valid secp256k1 private key. The valid range is 1 <= key < n (curve order). There is no corresponding public key or address.';
  } else {
    try {
      pubkeyHex = bytesToHex(getPublicKey(key.toString(16).padStart(64, '0'), true));
      bech32Addr = pubkeyToP2WPKH(pubkeyHex);
    } catch {}
  }

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 700, margin: 'auto' }}>
      <h1>Library of Private Keys</h1>
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, minWidth: 280 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: 80, display: 'inline-block' }}><b>Hexagon:</b></label>
          <input type="text" value={hex} onChange={handleHexChange} style={{ width: 90 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: 80, display: 'inline-block' }}><b>Wall:</b></label>
          <input type="number" min={0} max={WALLS_PER_HEX-1} value={wall} onChange={handleWallChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: 80, display: 'inline-block' }}><b>Shelf:</b></label>
          <input type="number" min={0} max={SHELVES_PER_WALL-1} value={shelf} onChange={handleShelfChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: 80, display: 'inline-block' }}><b>Volume:</b></label>
          <input type="number" min={0} max={VOLUMES_PER_SHELF-1} value={volume} onChange={handleVolumeChange} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ width: 80, display: 'inline-block' }}><b>Page:</b></label>
          <input type="number" min={0} max={PAGES_PER_VOLUME-1} value={page} onChange={handlePageChange} />
        </div>
        <button onClick={handleRandom} style={{ marginTop: 8 }}>Random</button>
      </div>
      {didOverflow && <div style={{ color: 'orange', marginBottom: 8 }}>Note: This location is outside the canonical keyspace and wraps around (periodic library).</div>}
      <div style={{ margin: '24px 0', background: '#f4f4f4', padding: 16, borderRadius: 8 }}>
        <div><b>Private Key (hex):</b></div>
        <div style={{ fontSize: 18, wordBreak: 'break-all', color: isZeroKey ? '#a00' : '#333' }}>{'0x' + key.toString(16).padStart(64, '0')}</div>
        {lastBrainwallet && lastBrainwallet.key === key && (
          <div style={{ color: '#a00', marginTop: 12, fontStyle: 'italic', fontWeight: 500 }}>
            Original brainwallet phrase for this location: '{lastBrainwallet.phrase}'<br />
            <span style={{ color: '#a00', fontWeight: 400 }}>Never use brainwallets for real funds!</span>
          </div>
        )}
        {isZeroKey ? (
          <div style={{ color: '#a00', marginTop: 16, fontWeight: 600 }}>{zeroKeyMsg}</div>
        ) : (
          <>
            <div style={{ marginTop: 16 }}><b>Public Key (hex, compressed):</b></div>
            <div style={{ fontSize: 15, wordBreak: 'break-all', color: '#222' }}>{pubkeyHex}</div>
            <div style={{ marginTop: 16 }}><b>Bech32 Address (P2WPKH):</b></div>
            <div style={{ fontSize: 15, wordBreak: 'break-all', color: '#005a00' }}>{bech32Addr}</div>
          </>
        )}
      </div>
      <div style={{ color: '#888', fontSize: 13 }}>
        <div>Location: Hexagon {hex}, Wall {wall}, Shelf {shelf}, Volume {volume}, Page {page}</div>
        <div>Key Index: {key.toString()}</div>
      </div>
      <hr style={{ margin: '32px 0' }} />
      <div>
        <b>Find location by key or any string:</b> <input type="text" placeholder="0x... or any phrase" value={keyInput} onChange={e => setKeyInput(e.target.value)} style={{ width: 340 }} />
        <button onClick={handleKeySearch} style={{ marginLeft: 8 }}>Find Location</button>
        {locationResult && (
          <div style={{ marginTop: 12, color: '#444' }}>
            <div>Hexagon: <b>{locationResult.hex}</b></div>
            <div>Wall: <b>{locationResult.wall}</b></div>
            <div>Shelf: <b>{locationResult.shelf}</b></div>
            <div>Volume: <b>{locationResult.volume}</b></div>
            <div>Page: <b>{locationResult.page}</b></div>
            {locationResult._isBrainwallet && (
              <div style={{ color: '#a00', marginTop: 8, fontWeight: 600 }}>
                Brainwallet: This key is derived from the phrase <span style={{ fontStyle: 'italic' }}>'{locationResult._brainwalletSource}'</span> using SHA256.<br />
                <span style={{ fontWeight: 400, color: '#a00' }}>Never use brainwallets for real funds!</span>
              </div>
            )}
            <button onClick={handleGoToLocation} style={{ marginTop: 8 }}>Go to Location</button>
          </div>
        )}
      </div>
    </div>
  );
}
