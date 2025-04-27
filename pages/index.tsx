import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { getPublicKey } from '@noble/secp256k1';
import Head from 'next/head';

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
  const [parallelCount, setParallelCount] = useState(2);
  const [rateLimitHit, setRateLimitHit] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<string | null>(null);

  // --- Auto-Search State ---
  const [autoSearchRunning, setAutoSearchRunning] = useState(false);
  const [autoSearchCount, setAutoSearchCount] = useState(0);
  const [autoSearchFound, setAutoSearchFound] = useState<{
    location: typeof location,
    address: string,
    balance: string
  } | null>(null);
  const autoSearchAbort = useRef<{ stop: boolean }>({ stop: false });

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

  async function autoSearch() {
    setAutoSearchRunning(true);
    setAutoSearchCount(0);
    setAutoSearchFound(null);
    setRateLimitHit(false);
    setRateLimitTime(null);
    autoSearchAbort.current.stop = false;
    let baseIdx = cryptoUtils.locationToIndex(location.hex, location.wall, location.shelf, location.volume, location.page);
    let found = false;
    let count = 0;
    // Helper for each thread
    const searchThread = async (startIdx: bigint, stride: number) => {
      let idx = startIdx;
      while (!autoSearchAbort.current.stop && !found) {
        const loc = cryptoUtils.indexToLocation(idx);
        const key = cryptoUtils.locationToKey(loc.hex, loc.wall, loc.shelf, loc.volume, loc.page);
        const privHex = key.toString(16).padStart(64, '0');
        const pubkeyBytes = getPublicKey(privHex, true);
        const pubkeyHex = Array.from(pubkeyBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        const address = cryptoUtils.pubkeyToP2WPKH(pubkeyHex, network === 'mainnet' ? 'bc' : 'tb');
        // Query Blockstream API
        let balance = '0.00000000';
        try {
          const endpoint = network === 'mainnet'
            ? `https://blockstream.info/api/address/${address}`
            : `https://blockstream.info/testnet/api/address/${address}`;
          const res = await fetch(endpoint);
          console.log("STATUS", res.status);

          let data = null;
          let isRateLimit = false;
          let bodyText = '';

          if (res.status === 429) {
            isRateLimit = true;
            console.log("RATE LIMIT (status)");
          } else if (res.ok) {
            try {
              bodyText = await res.text();
              data = JSON.parse(bodyText);
              if (
                (typeof data === 'object' && data !== null && typeof data.error === 'string' && data.error.toLowerCase().includes('rate limit')) ||
                !data.chain_stats // If chain_stats missing, likely not a normal address response
              ) {
                isRateLimit = true;
                console.log("RATE LIMIT (body)", data);
              }
            } catch (e) {
              // JSON parse failed, possibly HTML error page
              isRateLimit = true;
              bodyText = bodyText || (await res.text());
              console.log("RATE LIMIT (invalid JSON)", bodyText);
            }
          }

          if (isRateLimit) {
            setRateLimitHit(true);
            setRateLimitTime(new Date().toLocaleTimeString());
            autoSearchAbort.current.stop = true;
            setAutoSearchRunning(false);
            break;
          }

          if (data && data.chain_stats) {
            const funded = data.chain_stats.funded_txo_sum ?? 0;
            const spent = data.chain_stats.spent_txo_sum ?? 0;
            const sats = funded - spent;
            balance = (sats / 1e8).toFixed(8);
            setRateLimitHit(false);
          }
        } catch (e) {
          console.log("FETCH ERROR", e);
          setRateLimitHit(true);
          setRateLimitTime(new Date().toLocaleTimeString());
          autoSearchAbort.current.stop = true;
          setAutoSearchRunning(false);
          break;
        }
        count++;
        setAutoSearchCount(c => c + 1);
        if (balance !== '0.00000000' && !found) {
          found = true;
          setAutoSearchFound({ location: loc, address, balance });
          setLocation(loc);
          autoSearchAbort.current.stop = true;
          break;
        }
        idx = (idx + BigInt(stride)) % cryptoUtils.N;
        await new Promise(r => setTimeout(r, 600));
      }
    };
    // Start N threads
    const threads = [];
    for (let i = 0; i < parallelCount; ++i) {
      threads.push(searchThread((baseIdx + BigInt(i)) % cryptoUtils.N, parallelCount));
    }
    await Promise.all(threads);
    setAutoSearchRunning(false);
  }

  function stopAutoSearch() {
    autoSearchAbort.current.stop = true;
    setAutoSearchRunning(false);
  }

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
    // Pick a random index in the valid keyspace, then convert to location
    const idx = BigInt(Math.floor(Math.random() * Number(cryptoUtils.N)));
    const loc = cryptoUtils.indexToLocation(idx);
    setLocation(loc);
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
    <>
      <Head>
        <title>Keys of Babel - Bitcoin Private Key Library</title>
        <meta name="description" content="Explore the infinite library of Bitcoin private keys. Inspired by Borges' Library of Babel." />
      </Head>
      <div style={{ padding: 24, fontFamily: 'monospace', maxWidth: 700, margin: 'auto' }}>
        <h1>Library of Private Keys</h1>
        <div style={{ marginBottom: 12 }}>
          <label><b>Network:</b></label>{' '}
          <select value={network} onChange={e => setNetwork(e.target.value as 'mainnet' | 'testnet')}>
            <option value="mainnet">Bitcoin Mainnet</option>
            <option value="testnet">Bitcoin Testnet</option>
          </select>
          <span style={{ float: 'right' }}>
            <a href="/about" style={{ color: '#1976d2', textDecoration: 'underline', fontSize: 16 }}>About / FAQ</a>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <button onClick={handleFirstPage}>First Page</button>
          <button onClick={handleRandom}>Random</button>
          <button onClick={handleLastPage}>Last Page</button>
          <button onClick={autoSearch} disabled={autoSearchRunning} style={{ background: '#1976d2', color: '#fff' }}>Auto-Search</button>
          {autoSearchRunning && <button onClick={stopAutoSearch} style={{ background: '#a00', color: '#fff' }}>Stop</button>}
          <label style={{ marginLeft: 12 }}>
            Parallelism:
            <input type="number" min={1} max={10} value={parallelCount} disabled={autoSearchRunning}
              onChange={e => setParallelCount(Math.max(1, Math.min(10, Number(e.target.value))))}
              style={{ width: 40, marginLeft: 4 }} />
          </label>
        </div>
        {rateLimitHit && (
          <div style={{ marginBottom: 8, color: '#b71c1c', fontWeight: 500 }}>
            ⚠️ Auto-search stopped due to network error or rate limit.<br />
            Time: {rateLimitTime}<br />
            Please try again later or reduce parallelism.
          </div>
        )}
        {(autoSearchRunning || autoSearchCount > 0) && (() => {
          const pages = autoSearchCount;
          const volumes = Math.floor(pages / Number(cryptoUtils.PAGES));
          const shelves = Math.floor(pages / (Number(cryptoUtils.PAGES) * Number(cryptoUtils.VOLUMES)));
          const walls = Math.floor(pages / (Number(cryptoUtils.PAGES) * Number(cryptoUtils.VOLUMES) * Number(cryptoUtils.SHELVES)));
          const hexes = Math.floor(pages / (Number(cryptoUtils.PAGES) * Number(cryptoUtils.VOLUMES) * Number(cryptoUtils.SHELVES) * Number(cryptoUtils.WALLS)));
          return (
            <div style={{ marginBottom: 12, color: '#1976d2' }}>
              Pages searched: {pages}
              {' '}(
              ≈ {volumes} volume{volumes !== 1 ? 's' : ''},
              {` ${shelves}`} shelf{shelves !== 1 ? 's' : ''},
              {` ${walls}`} wall{walls !== 1 ? 's' : ''},
              {` ${hexes}`} hex{hexes !== 1 ? 'es' : ''}
              )
            </div>
          );
        })()}
        {autoSearchFound && (
          <div style={{ marginBottom: 12, color: '#080' }}>
            🎉 Found non-zero balance!<br />
            Address: <span style={{ fontFamily: 'monospace' }}>{autoSearchFound.address}</span><br />
            Balance: {autoSearchFound.balance} BTC<br />
            Location: Hexagon {autoSearchFound.location.hex}, Wall {autoSearchFound.location.wall}, Shelf {autoSearchFound.location.shelf}, Volume {autoSearchFound.location.volume}, Page {autoSearchFound.location.page}
          </div>
        )}
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
    </>
  );
}
