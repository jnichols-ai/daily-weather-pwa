"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [38.7, -78.0];
const DEFAULT_ZOOM = 6;

// Child component that lives inside MapContainer and can call useMap().
// Watches focusTarget and pans/zooms the map whenever it changes.
function MapFocuser({ focusTarget }) {
  const map = useMap();
  useEffect(() => {
    if (focusTarget?.lat != null && focusTarget?.lng != null) {
      map.setView([focusTarget.lat, focusTarget.lng], 9, { animate: true });
    }
    // ts is a timestamp bump so clicking the same city twice still fires the effect
  }, [focusTarget?.lat, focusTarget?.lng, focusTarget?.ts]);
  return null;
}

export default function WeatherMap({ rows, focusTarget }) {
  const plottable = (rows || []).filter(
    (r) => r.lat != null && r.lng != null && !Number.isNaN(r.lat) && !Number.isNaN(r.lng)
  );

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="map-wrap"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFocuser focusTarget={focusTarget} />
      {plottable.map((r) => (
        <CircleMarker
          key={r.id}
          center={[r.lat, r.lng]}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: r.sevDot || "#9ca3af",
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <strong>{r.cityName || r.name}, {r.stateName}</strong>
            <br />
            Temp: {r.tempF ?? "—"}°F · {r.condition ?? "—"}
            <br />
            Wind: {r.windMph ?? "—"} mph
            <br />
            Heat Index:{" "}
            <strong>
              {r.heatIndexF ?? "—"}°F ({r.sevLabel || "—"})
            </strong>
            <br />
            Updated: {r.lastUpdated ?? "—"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
