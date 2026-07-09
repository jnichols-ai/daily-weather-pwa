// Master location list. Add/remove cities here only — everything else (cron job,
// monday boards, map, filters) reads from this single source of truth.
//
// region is just a human label used for grouping/filtering in the UI.

export const CITIES = [
  // Delaware
  { name: "Wilmington", state: "DE", region: "Delaware", lat: 39.7459, lon: -75.5466 },
  { name: "Dover", state: "DE", region: "Delaware", lat: 39.1582, lon: -75.5244 },
  { name: "Newark", state: "DE", region: "Delaware", lat: 39.6837, lon: -75.7497 },
  { name: "Middletown", state: "DE", region: "Delaware", lat: 39.4496, lon: -75.7163 },
  { name: "Smyrna", state: "DE", region: "Delaware", lat: 39.2998, lon: -75.6049 },
  { name: "Milford", state: "DE", region: "Delaware", lat: 38.9126, lon: -75.4277 },

  // Maryland (excluding Garrett & Allegany counties)
  { name: "Baltimore", state: "MD", region: "Maryland", lat: 39.2904, lon: -76.6122 },
  { name: "Westminster", state: "MD", region: "Maryland", lat: 39.5757, lon: -77.0086 },
  { name: "Bel Air", state: "MD", region: "Maryland", lat: 39.5354, lon: -76.3483 },
  { name: "Manchester", state: "MD", region: "Maryland", lat: 39.6565, lon: -76.8886 },
  { name: "Jarrettsville", state: "MD", region: "Maryland", lat: 39.6043, lon: -76.4752 },
  { name: "Annapolis", state: "MD", region: "Maryland", lat: 38.9784, lon: -76.4922 },
  { name: "Columbia", state: "MD", region: "Maryland", lat: 39.2037, lon: -76.8610 },
  { name: "Frederick", state: "MD", region: "Maryland", lat: 39.4143, lon: -77.4105 },
  { name: "Rockville", state: "MD", region: "Maryland", lat: 39.0840, lon: -77.1528 },
  { name: "Gaithersburg", state: "MD", region: "Maryland", lat: 39.1434, lon: -77.2014 },
  { name: "Silver Spring", state: "MD", region: "Maryland", lat: 38.9907, lon: -77.0261 },
  { name: "Hagerstown", state: "MD", region: "Maryland", lat: 39.6418, lon: -77.7200 },
  { name: "Salisbury", state: "MD", region: "Maryland", lat: 38.3607, lon: -75.5994 },
  { name: "Ocean City", state: "MD", region: "Maryland", lat: 38.3365, lon: -75.0849 },
  { name: "Waldorf", state: "MD", region: "Maryland", lat: 38.6246, lon: -76.9378 },
  { name: "Bowie", state: "MD", region: "Maryland", lat: 39.0068, lon: -76.7791 },
  { name: "Easton", state: "MD", region: "Maryland", lat: 38.7740, lon: -76.0763 },
  { name: "Denton", state: "MD", region: "Maryland", lat: 38.8851, lon: -75.8294 },
  { name: "Cambridge", state: "MD", region: "Maryland", lat: 38.5632, lon: -76.0788 },

  // West Virginia Eastern Panhandle
  { name: "Martinsburg", state: "WV", region: "WV Panhandle", lat: 39.4562, lon: -77.9639 },
  { name: "Charles Town", state: "WV", region: "WV Panhandle", lat: 39.2906, lon: -77.8455 },

  // Virginia I-81 corridor: Winchester to Staunton
  { name: "Winchester", state: "VA", region: "VA I-81 Corridor", lat: 39.1857, lon: -78.1633 },
  { name: "Strasburg", state: "VA", region: "VA I-81 Corridor", lat: 38.9890, lon: -78.3580 },
  { name: "Woodstock", state: "VA", region: "VA I-81 Corridor", lat: 38.8807, lon: -78.5025 },
  { name: "New Market", state: "VA", region: "VA I-81 Corridor", lat: 38.6473, lon: -78.6644 },
  { name: "Harrisonburg", state: "VA", region: "VA I-81 Corridor", lat: 38.4496, lon: -78.8689 },
  { name: "Staunton", state: "VA", region: "VA I-81 Corridor", lat: 38.1496, lon: -79.0772 },

  // Northern VA down I-95 to Richmond
  { name: "Alexandria", state: "VA", region: "VA I-95 Corridor", lat: 38.8048, lon: -77.0469 },
  { name: "Arlington", state: "VA", region: "VA I-95 Corridor", lat: 38.8816, lon: -77.0910 },
  { name: "Woodbridge", state: "VA", region: "VA I-95 Corridor", lat: 38.6582, lon: -77.2497 },
  { name: "Fredericksburg", state: "VA", region: "VA I-95 Corridor", lat: 38.3032, lon: -77.4605 },
  { name: "Richmond", state: "VA", region: "VA I-95 Corridor", lat: 37.5407, lon: -77.4360 },

  // Additional Northern VA population centers
  { name: "Fairfax", state: "VA", region: "Northern Virginia", lat: 38.8462, lon: -77.3064 },
  { name: "Manassas", state: "VA", region: "Northern Virginia", lat: 38.7509, lon: -77.4753 },
  { name: "Leesburg", state: "VA", region: "Northern Virginia", lat: 39.1157, lon: -77.5636 },
  { name: "Reston", state: "VA", region: "Northern Virginia", lat: 38.9586, lon: -77.3570 },
  { name: "Herndon", state: "VA", region: "Northern Virginia", lat: 38.9696, lon: -77.3861 },
  { name: "Tysons", state: "VA", region: "Northern Virginia", lat: 38.9187, lon: -77.2311 },
  { name: "Vienna", state: "VA", region: "Northern Virginia", lat: 38.9012, lon: -77.2653 },

  // Central VA around Culpeper
  { name: "Culpeper", state: "VA", region: "Central Virginia", lat: 38.4730, lon: -77.9961 },
  { name: "Warrenton", state: "VA", region: "Central Virginia", lat: 38.7138, lon: -77.7930 },
  { name: "Orange", state: "VA", region: "Central Virginia", lat: 38.2459, lon: -78.1122 },

  // Utah
  { name: "Orem", state: "UT", region: "Utah", lat: 40.2969, lon: -111.6946 },

  // 55-mile radius around Nashville, TN
  { name: "Nashville", state: "TN", region: "Nashville Area", lat: 36.1627, lon: -86.7816 },
  { name: "Murfreesboro", state: "TN", region: "Nashville Area", lat: 35.8456, lon: -86.3903 },
  { name: "Franklin", state: "TN", region: "Nashville Area", lat: 35.9251, lon: -86.8689 },
  { name: "Hendersonville", state: "TN", region: "Nashville Area", lat: 36.3048, lon: -86.6200 },
  { name: "Gallatin", state: "TN", region: "Nashville Area", lat: 36.3884, lon: -86.4470 },
  { name: "Lebanon", state: "TN", region: "Nashville Area", lat: 36.2081, lon: -86.2911 },
  { name: "Brentwood", state: "TN", region: "Nashville Area", lat: 36.0331, lon: -86.7828 },
  { name: "Smyrna", state: "TN", region: "Nashville Area", lat: 35.9828, lon: -86.5186 },
];

export function cityKey(city) {
  return `${city.name}, ${city.state}`;
}

export function findCity(name, state) {
  return CITIES.find((c) => c.name === name && c.state === state);
}
