/**
 * Mapbox Static Images API URL for a single pinned location.
 * Pure: builds a string only. Costs one Static Images request per unique URL when rendered.
 * Default 1200x400 at @2x (2400x800 actual pixels), zoom 15, brand-colored large pin.
 */
export function staticMapUrl(opts: {
  lat: number;
  lng: number;
  width?: number;
  height?: number;
  zoom?: number;
  token: string;
  dark?: boolean;
}): string {
  const { lat, lng, width = 1200, height = 400, zoom = 15, token, dark = false } = opts;
  const style = dark ? 'dark-v11' : 'streets-v12';
  // 6 decimals ≈ 0.1 m; keeps URLs stable (cache-friendly) and short.
  const lngLat = `${Number(lng.toFixed(6))},${Number(lat.toFixed(6))}`;
  const w = Math.round(width);
  const h = Math.round(height);
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/pin-l+e4572e(${lngLat})/${lngLat},${zoom},0/${w}x${h}@2x?access_token=${encodeURIComponent(token)}`;
}
