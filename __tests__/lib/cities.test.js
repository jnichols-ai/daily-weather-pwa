import { describe, it, expect } from 'vitest';
import { CITIES, cityKey, findCity } from '@/lib/cities.js';

describe('CITIES', () => {
  it('contains 52 entries', () => {
    expect(CITIES).toHaveLength(52);
  });

  it('every entry has name, state, region, lat, and lon', () => {
    for (const city of CITIES) {
      expect(typeof city.name).toBe('string');
      expect(typeof city.state).toBe('string');
      expect(typeof city.region).toBe('string');
      expect(typeof city.lat).toBe('number');
      expect(typeof city.lon).toBe('number');
    }
  });

  it('includes all five expected states', () => {
    const states = new Set(CITIES.map((c) => c.state));
    expect(states).toContain('DE');
    expect(states).toContain('MD');
    expect(states).toContain('VA');
    expect(states).toContain('WV');
    expect(states).toContain('TN');
  });

  it('has valid lat/lon ranges for the Mid-Atlantic / Nashville footprint', () => {
    for (const city of CITIES) {
      expect(city.lat).toBeGreaterThan(34);
      expect(city.lat).toBeLessThan(42);
      expect(city.lon).toBeGreaterThan(-90);
      expect(city.lon).toBeLessThan(-74);
    }
  });
});

describe('cityKey', () => {
  it('formats as "Name, STATE"', () => {
    expect(cityKey({ name: 'Richmond', state: 'VA' })).toBe('Richmond, VA');
  });

  it('handles multi-word city names', () => {
    expect(cityKey({ name: 'Ocean City', state: 'MD' })).toBe('Ocean City, MD');
  });
});

describe('findCity', () => {
  it('returns the matching city object', () => {
    const city = findCity('Richmond', 'VA');
    expect(city).toBeDefined();
    expect(city.name).toBe('Richmond');
    expect(city.state).toBe('VA');
    expect(typeof city.lat).toBe('number');
    expect(typeof city.lon).toBe('number');
  });

  it('returns undefined when the name does not match', () => {
    expect(findCity('Springfield', 'VA')).toBeUndefined();
  });

  it('returns undefined when the state does not match', () => {
    expect(findCity('Richmond', 'MD')).toBeUndefined();
  });

  it('is case-sensitive on name', () => {
    expect(findCity('richmond', 'VA')).toBeUndefined();
    expect(findCity('RICHMOND', 'VA')).toBeUndefined();
  });

  it('is case-sensitive on state', () => {
    expect(findCity('Richmond', 'va')).toBeUndefined();
    expect(findCity('Richmond', 'Va')).toBeUndefined();
  });

  it('disambiguates cities with the same name across different states', () => {
    // "Smyrna" appears in both DE and TN
    const smyrnaDE = findCity('Smyrna', 'DE');
    const smyrnaTN = findCity('Smyrna', 'TN');

    expect(smyrnaDE).toBeDefined();
    expect(smyrnaTN).toBeDefined();
    expect(smyrnaDE.state).toBe('DE');
    expect(smyrnaTN.state).toBe('TN');
    expect(smyrnaDE.lat).not.toBeCloseTo(smyrnaTN.lat, 1);
  });
});
