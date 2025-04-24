import React from 'react';

interface Props {
  currentKey: bigint;
  currentCanonicalBase64: string;
  pubkeyHex: string;
  bech32Addr: string;
  zeroKeyMsg: string;
  isZeroKey: boolean;
  handleCopyUrl: () => void;
  copyMsg: string;
  lastBrainwallet?: { phrase: string; key: bigint } | null;
  hex?: string;
  wall?: number;
  shelf?: number;
  volume?: number;
  page?: number;
}

const CurrentLocation: React.FC<Props> = ({ currentKey, currentCanonicalBase64, pubkeyHex, bech32Addr, zeroKeyMsg, isZeroKey, handleCopyUrl, copyMsg, lastBrainwallet, hex, wall, shelf, volume, page }) => (
  <div style={{ margin: '24px 0', background: '#f7f7fa', borderRadius: 10, padding: 20, boxShadow: '0 1px 4px #0001' }}>
    <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
      Current Location
      <button onClick={handleCopyUrl} style={{ marginLeft: 16, fontSize: 13, padding: '2px 8px', borderRadius: 5, border: '1px solid #bbb', background: '#fff', cursor: 'pointer' }}>Bookmark/Share</button>
      <span style={{ color: '#080', marginLeft: 8, fontSize: 13 }}>{copyMsg}</span>
    </div>
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontWeight: 500 }}>Private Key:</span> <span style={{ fontFamily: 'monospace' }}>{'0x' + currentKey.toString(16).padStart(64, '0')}</span>
    </div>
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontWeight: 500 }}>Canonical Base64:</span> <span style={{ fontFamily: 'monospace' }}>{currentCanonicalBase64}</span>
    </div>
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontWeight: 500 }}>Public Key:</span> <span style={{ fontFamily: 'monospace' }}>{pubkeyHex}</span>
    </div>
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontWeight: 500 }}>Bech32 Address:</span> <span style={{ fontFamily: 'monospace' }}>{bech32Addr}</span>
    </div>
    {isZeroKey && (
      <div style={{ color: '#a00', fontSize: 13, marginTop: 8 }}>{zeroKeyMsg}</div>
    )}
    {lastBrainwallet && lastBrainwallet.key === currentKey && (
      <div style={{ marginTop: 8, color: '#a00', fontSize: 13 }}>
        Brainwallet phrase: <span style={{ fontStyle: 'italic' }}>{lastBrainwallet.phrase}</span><br />
        <span style={{ color: '#a00', fontWeight: 400 }}>Never use brainwallets for real funds!</span>
      </div>
    )}
    {(hex || wall || shelf || volume || page) && (
      <div style={{ color: '#888', fontSize: 13, marginTop: 10 }}>
        {hex && <div>Hexagon: {hex}</div>}
        {wall && <div>Wall: {wall}</div>}
        {shelf && <div>Shelf: {shelf}</div>}
        {volume && <div>Volume: {volume}</div>}
        {page && <div>Page: {page}</div>}
        <div>Key Index: {currentKey.toString()}</div>
      </div>
    )}
  </div>
);

export default CurrentLocation;
