/**
 * Cities Food Dealz covers. Madison is live; the rest are destinations on the roadmap.
 * Everything city-flavoured in the UI (hero map, neighborhood chips, header switcher, copy) reads from here,
 * so launching a new metro means adding an entry, not editing pages.
 */
export interface Neighborhood {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  /** Radius that makes sense for "deals around here". */
  radiusM: number;
  blurb: string;
}

export interface City {
  slug: string;
  name: string;
  state: string;
  stateCode: string;
  status: 'live' | 'soon';
  tagline: string;
  center: { lat: number; lng: number };
  /** Zoom for the hero map. */
  zoom: number;
  neighborhoods: Neighborhood[];
}

export const MADISON: City = {
  slug: 'madison',
  name: 'Madison',
  state: 'Wisconsin',
  stateCode: 'WI',
  status: 'live',
  tagline: 'Fish fry Fridays, squeaky curds, $3 pints, and every weekly ad on the isthmus.',
  center: { lat: 43.0731, lng: -89.4012 },
  zoom: 12.4,
  neighborhoods: [
    { slug: 'capitol-square', name: 'Capitol Square', lat: 43.0747, lng: -89.3841, radiusM: 1200, blurb: 'The Square, supper clubs, Saturday market' },
    { slug: 'state-street', name: 'State St & Campus', lat: 43.0752, lng: -89.3969, radiusM: 1200, blurb: 'Slices, late night, student specials' },
    { slug: 'willy-street', name: 'Willy Street', lat: 43.0855, lng: -89.362, radiusM: 1200, blurb: 'Co-op, corner bars, patios' },
    { slug: 'atwood', name: 'Atwood', lat: 43.089, lng: -89.343, radiusM: 1400, blurb: 'Schenk’s Corners, breweries' },
    { slug: 'monroe-street', name: 'Monroe Street', lat: 43.062, lng: -89.423, radiusM: 1400, blurb: 'Neighborhood bistros by Camp Randall' },
    { slug: 'hilldale', name: 'Hilldale', lat: 43.074, lng: -89.456, radiusM: 1800, blurb: 'Metcalfe’s, shops, west-side dining' },
    { slug: 'monona', name: 'Monona', lat: 43.063, lng: -89.334, radiusM: 2500, blurb: 'Lakeside taverns, Monona Drive' },
    { slug: 'east-towne', name: 'East Towne', lat: 43.128, lng: -89.305, radiusM: 2500, blurb: 'Big grocery runs, chains' },
    { slug: 'west-towne', name: 'West Towne', lat: 43.056, lng: -89.506, radiusM: 2500, blurb: 'Woodman’s West, Costco side of town' },
    { slug: 'fitchburg', name: 'Fitchburg', lat: 43.008, lng: -89.426, radiusM: 3000, blurb: 'South side, Verona Road' },
    { slug: 'middleton', name: 'Middleton', lat: 43.097, lng: -89.504, radiusM: 3000, blurb: 'Good Neighbor City' },
    { slug: 'sun-prairie', name: 'Sun Prairie', lat: 43.183, lng: -89.214, radiusM: 3000, blurb: 'Northeast, Costco and Woodman’s' },
    { slug: 'verona', name: 'Verona', lat: 42.991, lng: -89.533, radiusM: 3000, blurb: 'Southwest, Epic country' },
  ],
};

export const CITIES: City[] = [
  MADISON,
  { slug: 'milwaukee', name: 'Milwaukee', state: 'Wisconsin', stateCode: 'WI', status: 'soon', tagline: 'Coming soon', center: { lat: 43.0389, lng: -87.9065 }, zoom: 12, neighborhoods: [] },
  { slug: 'minneapolis', name: 'Minneapolis', state: 'Minnesota', stateCode: 'MN', status: 'soon', tagline: 'Coming soon', center: { lat: 44.9778, lng: -93.265 }, zoom: 12, neighborhoods: [] },
  { slug: 'chicago', name: 'Chicago', state: 'Illinois', stateCode: 'IL', status: 'soon', tagline: 'Coming soon', center: { lat: 41.8781, lng: -87.6298 }, zoom: 11.5, neighborhoods: [] },
];

/** The city the app is currently serving (single-metro launch; a `cities` table replaces this later). */
export function getCity(): City {
  return MADISON;
}

/** Nearest neighborhood to a point, when it is reasonably close (for labelling "Near Willy Street"). */
export function nearestNeighborhood(city: City, lat: number, lng: number): Neighborhood | null {
  let best: Neighborhood | null = null;
  let bestD = Infinity;
  for (const n of city.neighborhoods) {
    const d = Math.hypot((n.lat - lat) * 111_000, (n.lng - lng) * 111_000 * Math.cos((lat * Math.PI) / 180));
    if (d < bestD) { bestD = d; best = n; }
  }
  return best && bestD <= Math.max(best.radiusM, 1500) ? best : null;
}
