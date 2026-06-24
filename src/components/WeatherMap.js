"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Default Leaflet marker images don't resolve correctly under Next.js bundling —
// point them at the CDN copies instead of fighting webpack asset paths.
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Centered/zoomed to roughly cover the DE/MD/VA/WV corridor; Nashville-area pins
// still show, just off to the southwest — users can pan/zoom freely.
const DEFAULT_CENTER = [38.7, -78.0];
const DEFAULT_ZOOM = 6;

export default function WeatherMap({ rows }) {
  const plottable = rows.filter((r) => r.lat != null && r.lng != null && !Number.isNaN(r.lat) && !Number.isNaN(r.lng));

  return (
    <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="map-wrap" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {plottable.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={icon}>
          <Popup>
            <strong>{r.name}</strong>
            <br />
            Temp: {r.tempF ?? "—"}°F
            <br />
            Condition: {r.condition ?? "—"}
            <br />
            Wind: {r.windMph ?? "—"} mph
            <br />
            Heat Index: {r.heatIndexF ?? "—"}°F
            <br />
            Updated: {r.lastUpdated ?? "—"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
