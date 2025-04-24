import React from 'react';
import { SearchInterpretation, LocationResult } from '../lib/cryptoUtils';

interface Props {
  searchResults: SearchInterpretation;
  onGoToLocation: (loc: LocationResult) => void;
  lastBrainwallet?: { phrase: string; key: bigint } | null;
  setLastBrainwallet?: (bw: { phrase: string; key: bigint } | null) => void;
}

const KeyInterpretations: React.FC<Props> = ({ searchResults, onGoToLocation, lastBrainwallet, setLastBrainwallet }) => (
  <div style={{ marginTop: 18, color: '#444', background: '#f9f9f9', borderRadius: 8, padding: 12 }}>
    <div style={{ fontWeight: 600, marginBottom: 6 }}>Interpretations for: <span style={{ fontStyle: 'italic' }}>{searchResults.input}</span></div>
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 500 }}>Brainwallet (SHA256 of input):</div>
      <div style={{ fontSize: 12, color: '#a00', marginBottom: 2 }}>Never use brainwallets for real funds!</div>
      <div>Private Key: <span style={{ fontFamily: 'monospace' }}>{'0x' + searchResults.brainwalletKey.toString(16).padStart(64, '0')}</span></div>
      <div>Canonical Base64: <span style={{ fontFamily: 'monospace' }}>{require('../lib/cryptoUtils').keyToCanonicalBase64(searchResults.brainwalletKey)}</span></div>
      <div>Location: Hexagon <b>{searchResults.brainwalletLoc.hex}</b>, Wall <b>{searchResults.brainwalletLoc.wall}</b>, Shelf <b>{searchResults.brainwalletLoc.shelf}</b>, Volume <b>{searchResults.brainwalletLoc.volume}</b>, Page <b>{searchResults.brainwalletLoc.page}</b></div>
      <button onClick={() => onGoToLocation(searchResults.brainwalletLoc)} style={{ marginTop: 6 }}>Go to Brainwallet Location</button>
    </div>
    {searchResults.base64Key && searchResults.base64Loc && searchResults.base64Canonical && (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 500 }}>Base64-decoded key:</div>
        <div>Private Key: <span style={{ fontFamily: 'monospace' }}>{'0x' + searchResults.base64Key.toString(16).padStart(64, '0')}</span></div>
        <div>Canonical Base64: <span style={{ fontFamily: 'monospace' }}>{searchResults.base64Canonical}</span></div>
        <div>Location: Hexagon <b>{searchResults.base64Loc.hex}</b>, Wall <b>{searchResults.base64Loc.wall}</b>, Shelf <b>{searchResults.base64Loc.shelf}</b>, Volume <b>{searchResults.base64Loc.volume}</b>, Page <b>{searchResults.base64Loc.page}</b></div>
        <button onClick={() => onGoToLocation(searchResults.base64Loc!)} style={{ marginTop: 6 }}>Go to Base64 Location</button>
      </div>
    )}
    {searchResults.hexKey && searchResults.hexLoc && (
      <div>
        <div style={{ fontWeight: 500 }}>Hex/Private key:</div>
        <div>Private Key: <span style={{ fontFamily: 'monospace' }}>{'0x' + searchResults.hexKey.toString(16).padStart(64, '0')}</span></div>
        <div>Canonical Base64: <span style={{ fontFamily: 'monospace' }}>{require('../lib/cryptoUtils').keyToCanonicalBase64(searchResults.hexKey)}</span></div>
        <div>Location: Hexagon <b>{searchResults.hexLoc.hex}</b>, Wall <b>{searchResults.hexLoc.wall}</b>, Shelf <b>{searchResults.hexLoc.shelf}</b>, Volume <b>{searchResults.hexLoc.volume}</b>, Page <b>{searchResults.hexLoc.page}</b></div>
        <button onClick={() => onGoToLocation(searchResults.hexLoc!)} style={{ marginTop: 6 }}>Go to Hex Location</button>
      </div>
    )}
  </div>
);

export default KeyInterpretations;
