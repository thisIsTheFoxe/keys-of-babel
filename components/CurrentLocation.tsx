import React, { useEffect, useState } from 'react';

interface Props {
  currentKey: bigint;
  currentCanonicalBase64: string;
  pubkeyHex: string;
  bech32Addr: string;
  network: 'mainnet' | 'testnet';
  zeroKeyMsg: string;
  isZeroKey: boolean;
  handleCopyUrl: () => void;
  copyMsg: string;
  lastBrainwallet: { phrase: string, key: bigint } | null;
  hex?: string;
  wall?: number;
  shelf?: number;
  volume?: number;
  page?: number;
}

const CurrentLocation: React.FC<Props> = (props) => {
  const {
    currentKey,
    currentCanonicalBase64,
    pubkeyHex,
    bech32Addr,
    network,
    zeroKeyMsg,
    isZeroKey,
    handleCopyUrl,
    copyMsg,
    lastBrainwallet,
    hex, wall, shelf, volume, page
  } = props;

  // Balance state
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  useEffect(() => {
    if (!bech32Addr) {
      setBalance(null);
      setBalanceError(null);
      return;
    }
    setBalanceLoading(true);
    setBalance(null);
    setBalanceError(null);
    // Use correct Blockstream endpoint
    const endpoint = network === 'mainnet'
      ? `https://blockstream.info/api/address/${bech32Addr}`
      : `https://blockstream.info/testnet/api/address/${bech32Addr}`;
    fetch(endpoint)
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(data => {
        // data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum = sats
        const funded = data.chain_stats?.funded_txo_sum ?? 0;
        const spent = data.chain_stats?.spent_txo_sum ?? 0;
        const sats = funded - spent;
        console.log('Balance:', sats, funded, spent);
        setBalance((sats / 1e8).toFixed(8));
      })
      .catch(err => {
        setBalanceError('Could not fetch balance');
      })
      .finally(() => setBalanceLoading(false));
  }, [bech32Addr, network]);

  return (
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
      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>Balance:</span>{' '}
        {balanceLoading ? 'Loading...' :
          balanceError ? <span style={{ color: 'red' }}>{balanceError}</span> :
          balance !== null ? <span style={{ color: balance === '0.00000000' ? 'gray' : 'green' }}>{balance} BTC</span> : null}
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
      <div style={{ fontSize: 13, color: '#888' }}>
        <b>Location:</b> Hexagon {hex}
        <div>Wall: {typeof wall === 'number' ? wall : 0}</div>
        <div>Shelf: {typeof shelf === 'number' ? shelf : 0}</div>
        <div>Volume: {typeof volume === 'number' ? volume : 0}</div>
        <div>Page: {typeof page === 'number' ? page : 0}</div>
        <div>Key Index: {currentKey.toString()}</div>
      </div>
    </div>
  );
};

export default CurrentLocation;
