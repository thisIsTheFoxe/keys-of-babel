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
    <div className="current-location">
      <div className="current-location-title">
        Current Location
        <button onClick={handleCopyUrl} className="bookmark-btn">Bookmark/Share</button>
        <span className="copy-msg">{copyMsg}</span>
      </div>
      <div className="privkey-row">
        <span className="privkey-label">Private Key:</span> <span className="privkey-value">{'0x' + currentKey.toString(16).padStart(64, '0')}</span>
      </div>
      <div className="pubkey-row">
        <span className="pubkey-label">Public Key:</span> <span className="pubkey-value">{pubkeyHex}</span>
      </div>
      <div className="address-row">
        <span className="address-label">Bech32 Address:</span> <span className="address-value">{bech32Addr}</span>
      </div>
      <div className="balance-row">
        <span className="balance-label">Balance:</span>{' '}
        {balanceLoading ? <span className="balance-loading">Loading...</span> :
          balanceError ? <span className="balance-error">{balanceError}</span> :
          balance !== null ? <span className={balance === '0.00000000' ? 'balance-zero' : 'balance-nonzero'}>{balance} BTC</span> : null}
      </div>
      {isZeroKey && (
        <div className="zerokey-msg">{zeroKeyMsg}</div>
      )}
      {lastBrainwallet && lastBrainwallet.key === currentKey && (
        <div className="brainwallet-msg">
          Brainwallet phrase: <span className="brainwallet-phrase">{lastBrainwallet.phrase}</span><br />
          <span className="brainwallet-warning">Never use brainwallets for real funds!</span>
        </div>
      )}
      <div className="location-details">
        <b>Location:</b><br />Hexagon {hex}
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
