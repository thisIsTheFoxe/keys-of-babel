import React from 'react';
import { LocationResult } from '../lib/cryptoUtils';
import {
  SHELVES_PER_WALL,
  VOLUMES_PER_SHELF,
  PAGES_PER_VOLUME,
  WALLS_PER_HEX
} from '../lib/cryptoUtils';

interface Props {
  location: LocationResult;
  setLocation: (loc: LocationResult) => void;
  clearBrainwalletIfChanged: (newKey: bigint) => void;
}

const LocationInputs: React.FC<Props> = ({ location, setLocation, clearBrainwalletIfChanged }) => {
  function handleChange(field: keyof LocationResult, value: string | number) {
    const newLoc = { ...location, [field]: typeof value === 'string' ? value : Number(value) };
    setLocation(newLoc);
    // Optionally call clearBrainwalletIfChanged with a recalculated key
  }
  return (
    <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, minWidth: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ width: 80 }}><b>Hexagon:</b></label>
        <input type="text" value={location.hex} onChange={e => handleChange('hex', e.target.value)} style={{ width: 90 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ width: 80 }}><b>Wall:</b></label>
        <select
          value={location.wall}
          onChange={e => handleChange('wall', Number(e.target.value))}
        >
          {[...Array(WALLS_PER_HEX).keys()].map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ width: 80 }}><b>Shelf:</b></label>
        <select
          value={location.shelf}
          onChange={e => handleChange('shelf', Number(e.target.value))}
        >
          {[...Array(SHELVES_PER_WALL).keys()].map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ width: 80 }}><b>Volume:</b></label>
        <select
          value={location.volume}
          onChange={e => handleChange('volume', Number(e.target.value))}
        >
          {[...Array(VOLUMES_PER_SHELF).keys()].map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <label style={{ width: 80 }}><b>Page:</b></label>
        <select
          value={location.page}
          onChange={e => handleChange('page', Number(e.target.value))}
        >
          {[...Array(PAGES_PER_VOLUME).keys()].map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default LocationInputs;
