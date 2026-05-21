// MapViewComponent.native.js (Native Mobile Implementation)
// This file is resolved by Metro only on native iOS/Android builds.
// It attempts to load react-native-maps safely and falls back if unavailable.

let MapView = null;
let Marker = null;
let Polyline = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default || maps.MapView || maps;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
} catch (error) {
  console.warn('⚠️ react-native-maps not available, using fallback map view.');
}

export { MapView, Marker, Polyline };
export default MapView;
