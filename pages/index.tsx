import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getPublicKey } from '@noble/secp256k1';

// Modularized imports
import LocationInputs from '../components/LocationInputs';
import CurrentLocation from '../components/CurrentLocation';
import KeyInterpretations from '../components/KeyInterpretations';
import * as cryptoUtils from '../lib/cryptoUtils';

export default function Home() {
  const router = useRouter();
  // --- UI State ---
  const [hydrated, setHydrated] = useState(false);
  const [location, setLocation] = useState(cryptoUtils.getInitialLocation());
  const [keyInput, setKeyInput] = useState('');
  const [searchResults, setSearchResults] = useState<cryptoUtils.SearchInterpretation | null>(null);
  const [lastBrainwallet, setLastBrainwallet] = useState<{phrase: string, key: bigint} | null>(null);
  const [copyMsg, setCopyMsg] = useState('');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');

  // --- Hydration fix: only render after mounted ---
  useEffect(() => { setHydrated(true); }, []);

  // --- Sync state with URL on mount and router changes ---
  useEffect(() => {
    if (!router.isReady) return;
    const { hex: qHex, wall: qWall, shelf: qShelf, volume: qVolume, page: qPage } = router.query;
    if (
      typeof qHex === 'string' &&
      typeof qWall === 'string' &&
      typeof qShelf === 'string' &&
      typeof qVolume === 'string' &&
      typeof qPage === 'string'
    ) {
      if (qHex !== location.hex) setLocation({ ...location, hex: qHex });
      if (Number(qWall) !== location.wall) setLocation({ ...location, wall: Number(qWall) });
      if (Number(qShelf) !== location.shelf) setLocation({ ...location, shelf: Number(qShelf) });
      if (Number(qVolume) !== location.volume) setLocation({ ...location, volume: Number(qVolume) });
      if (Number(qPage) !== location.page) setLocation({ ...location, page: Number(qPage) });
    }
  }, [router.isReady, router.query]);

  // --- Sync state with URL on location change ---
  useEffect(() => {
    if (!hydrated) return;
    const params = [];
    if (location.hex && location.hex !== '0') params.push(`hex=${location.hex}`);
    if (location.wall !== 0) params.push(`wall=${location.wall}`);
    if (location.shelf !== 0) params.push(`shelf=${location.shelf}`);
    if (location.volume !== 0) params.push(`volume=${location.volume}`);
    if (location.page !== 0) params.push(`page=${location.page}`);
    const url = params.length ? `/?${params.join('&')}` : '/';
    router.replace(url, undefined, { shallow: true });
  }, [location, hydrated]);

  if (!hydrated) return null;

  // Helper to clear brainwallet phrase if key changes
  function clearBrainwalletIfChanged(newKey: bigint) {
    if (lastBrainwallet && lastBrainwallet.key !== newKey) {
      setLastBrainwallet(null);
    }
  }

  // Compute index and overflow
  const hexNum = cryptoUtils.base36ToBigInt(location.hex);
  let idx = ((((hexNum * cryptoUtils.WALLS + BigInt(location.wall)) * cryptoUtils.SHELVES + BigInt(location.shelf)) * cryptoUtils.VOLUMES + BigInt(location.volume)) * cryptoUtils.PAGES + BigInt(location.page));
  const didOverflow = idx >= cryptoUtils.N;
  const currentKey = cryptoUtils.locationToKey(location.hex, location.wall, location.shelf, location.volume, location.page);
  const currentCanonicalBase64 = cryptoUtils.keyToCanonicalBase64(currentKey);

  // --- Key/Address Derivation ---
  // getPublicKey expects a 32-byte Uint8Array or hex string (without 0x), and the second argument is for compressed=true
  const privHex = currentKey.toString(16).padStart(64, '0');
  const pubkeyBytes = getPublicKey(privHex, true); // returns Uint8Array
  const pubkeyHex = Array.from(pubkeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const bech32Addr = cryptoUtils.pubkeyToP2WPKH(pubkeyHex, network === 'mainnet' ? 'bc' : 'tb');
  let isZeroKey = currentKey === 0n;
  let zeroKeyMsg = '';
  if (isZeroKey) {
    zeroKeyMsg = '0x0 is not a valid secp256k1 private key. The valid range is 1 <= key < n (curve order). There is no corresponding public key or address.';
  }

  // --- Bookmark/share button ---
  function handleCopyUrl() {
    // Only include nonzero fields in the URL
    const params = [];
    if (location.hex && location.hex !== '0') params.push(`hex=${location.hex}`);
    if (location.wall !== 0) params.push(`wall=${location.wall}`);
    if (location.shelf !== 0) params.push(`shelf=${location.shelf}`);
    if (location.volume !== 0) params.push(`volume=${location.volume}`);
    if (location.page !== 0) params.push(`page=${location.page}`);
    const url = `${window.location.origin}${params.length ? '/?' + params.join('&') : '/'}`;
    navigator.clipboard.writeText(url);
    setCopyMsg('Link copied!');
    setTimeout(() => setCopyMsg(''), 1200);
  }

  // --- Navigation helpers ---
  function handleRandom() {
    setLocation({
      hex: cryptoUtils.randomString(1 + Math.floor(Math.random() * 3)),
      wall: Math.floor(Math.random() * Number(cryptoUtils.WALLS)),
      shelf: Math.floor(Math.random() * Number(cryptoUtils.SHELVES)),
      volume: Math.floor(Math.random() * Number(cryptoUtils.VOLUMES)),
      page: Math.floor(Math.random() * Number(cryptoUtils.PAGES)),
    });
  }
  function handleFirstPage() {
    setLocation({ hex: '0', wall: 0, shelf: 0, volume: 0, page: 0 });
  }
  function handleLastPage() {
    // The last unique key is at index N-1
    const lastLoc = cryptoUtils.indexToLocation(cryptoUtils.N - 1n);
    setLocation(lastLoc);
  }

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 700, margin: 'auto' }}>
      <h1>Library of Private Keys</h1>
      <div style={{ marginBottom: 12 }}>
        <label><b>Network:</b></label>{' '}
        <select value={network} onChange={e => setNetwork(e.target.value as 'mainnet' | 'testnet')}>
          <option value="mainnet">Bitcoin Mainnet</option>
          <option value="testnet">Bitcoin Testnet</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={handleFirstPage}>First Page</button>
        <button onClick={handleRandom}>Random</button>
        <button onClick={handleLastPage}>Last Page</button>
      </div>
      <LocationInputs location={location} setLocation={setLocation} clearBrainwalletIfChanged={clearBrainwalletIfChanged} />
      {didOverflow && <div style={{ color: 'orange', marginBottom: 8 }}>Note: This location is outside the canonical keyspace and wraps around (periodic library).</div>}
      <CurrentLocation
        currentKey={currentKey}
        currentCanonicalBase64={currentCanonicalBase64}
        pubkeyHex={pubkeyHex}
        bech32Addr={bech32Addr}
        network={network}
        zeroKeyMsg={zeroKeyMsg}
        isZeroKey={isZeroKey}
        handleCopyUrl={handleCopyUrl}
        copyMsg={copyMsg}
        lastBrainwallet={lastBrainwallet}
        hex={location.hex}
        wall={location.wall}
        shelf={location.shelf}
        volume={location.volume}
        page={location.page}
      />
      <div>
        <b>Find location by key or any string:</b>
        <form
          onSubmit={e => {
            e.preventDefault();
            setSearchResults(cryptoUtils.interpretInput(keyInput.trim()));
          }}
          style={{ display: 'inline' }}
        >
          <input
            type="text"
            placeholder="0x... or any phrase or base64"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            style={{ width: 340 }}
          />
          <button type="submit" style={{ marginLeft: 8 }}>
            Find Location
          </button>
        </form>
        {searchResults && (
          <KeyInterpretations
            searchResults={searchResults}
            onGoToLocation={(loc) => {
              setLocation(loc);
              // Set brainwallet phrase if location matches brainwalletLoc
              if (searchResults &&
                  loc.hex === searchResults.brainwalletLoc.hex &&
                  loc.wall === searchResults.brainwalletLoc.wall &&
                  loc.shelf === searchResults.brainwalletLoc.shelf &&
                  loc.volume === searchResults.brainwalletLoc.volume &&
                  loc.page === searchResults.brainwalletLoc.page
              ) {
                setLastBrainwallet({ phrase: searchResults.input, key: searchResults.brainwalletKey });
              } else {
                setLastBrainwallet(null);
              }
            }}
            lastBrainwallet={lastBrainwallet}
            setLastBrainwallet={setLastBrainwallet}
          />
        )}
      </div>
    </div>
  );
}
