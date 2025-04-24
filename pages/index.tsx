import { useState } from 'react';

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

export default function Home() {
  // State for navigation
  const [hex, setHex] = useState('0');
  const [wall, setWall] = useState(0);
  const [shelf, setShelf] = useState(0);
  const [volume, setVolume] = useState(0);
  const [page, setPage] = useState(0);
  const [keyInput, setKeyInput] = useState('');
  const [locationResult, setLocationResult] = useState<ReturnType<typeof indexToLocation> | null>(null);
  const [overflow, setOverflow] = useState(false);

  // Compute index and overflow
  const hexNum = base36ToBigInt(hex);
  let idx = ((((hexNum * WALLS + BigInt(wall)) * SHELVES + BigInt(shelf)) * VOLUMES + BigInt(volume)) * PAGES + BigInt(page));
  const didOverflow = idx >= N;
  const key = locationToKey(hex, wall, shelf, volume, page);

  // Clamp navigation
  function clamp(val: number, min: number, max: number) {
    return Math.max(min, Math.min(max, val));
  }

  function handleKeySearch() {
    try {
      let k = keyInput.startsWith('0x') ? BigInt(keyInput) : BigInt('0x' + keyInput);
      setLocationResult(keyToLocation(k));
    } catch {
      setLocationResult(null);
    }
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

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 700, margin: 'auto' }}>
      <h1>Library of Private Keys</h1>
      <div style={{ marginBottom: 16 }}>
        <b>Hexagon:</b> <input type="text" value={hex} onChange={e => setHex(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} style={{ width: 90 }} />
        <b> Wall:</b> <input type="number" min={0} max={WALLS_PER_HEX-1} value={wall} onChange={e => setWall(clamp(Number(e.target.value), 0, WALLS_PER_HEX-1))} />
        <b> Shelf:</b> <input type="number" min={0} max={SHELVES_PER_WALL-1} value={shelf} onChange={e => setShelf(clamp(Number(e.target.value), 0, SHELVES_PER_WALL-1))} />
        <b> Volume:</b> <input type="number" min={0} max={VOLUMES_PER_SHELF-1} value={volume} onChange={e => setVolume(clamp(Number(e.target.value), 0, VOLUMES_PER_SHELF-1))} />
        <b> Page:</b> <input type="number" min={0} max={PAGES_PER_VOLUME-1} value={page} onChange={e => setPage(clamp(Number(e.target.value), 0, PAGES_PER_VOLUME-1))} />
        <button onClick={handleRandom} style={{ marginLeft: 16 }}>Random</button>
      </div>
      {didOverflow && <div style={{ color: 'orange', marginBottom: 8 }}>Note: This location is outside the canonical keyspace and wraps around (periodic library).</div>}
      <div style={{ margin: '24px 0', background: '#f4f4f4', padding: 16, borderRadius: 8 }}>
        <div><b>Private Key (hex):</b></div>
        <div style={{ fontSize: 18, wordBreak: 'break-all', color: '#333' }}>{'0x' + key.toString(16).padStart(64, '0')}</div>
      </div>
      <div style={{ color: '#888', fontSize: 13 }}>
        <div>Location: Hexagon {hex}, Wall {wall}, Shelf {shelf}, Volume {volume}, Page {page}</div>
        <div>Key Index: {key.toString()}</div>
      </div>
      <hr style={{ margin: '32px 0' }} />
      <div>
        <b>Find location by key:</b> <input type="text" placeholder="0x..." value={keyInput} onChange={e => setKeyInput(e.target.value)} style={{ width: 340 }} />
        <button onClick={handleKeySearch} style={{ marginLeft: 8 }}>Find Location</button>
        {locationResult && (
          <div style={{ marginTop: 12, color: '#444' }}>
            <div>Hexagon: <b>{locationResult.hex}</b></div>
            <div>Wall: <b>{locationResult.wall}</b></div>
            <div>Shelf: <b>{locationResult.shelf}</b></div>
            <div>Volume: <b>{locationResult.volume}</b></div>
            <div>Page: <b>{locationResult.page}</b></div>
            <button onClick={handleGoToLocation} style={{ marginTop: 8 }}>Go to Location</button>
          </div>
        )}
      </div>
    </div>
  );
}
