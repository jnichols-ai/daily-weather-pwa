"use client";

import { useEffect, useMemo, useState } from "react";

export default function WeatherTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (location) params.set("location", location);
      if (date) params.set("date", date);
      if (hour) params.set("hour", hour);
      const res = await fetch(`/api/weather/history?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows(json.rows);
      setTotal(json.total);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce filter changes slightly so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, date, hour]);

  const hourOptions = Array.from({ length: 24 }, (_, h) => {
    const value = String(h).padStart(2, "0");
    const label = new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric", hour12: true });
    return { value, label };
  });

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.observedAt || "").localeCompare(a.observedAt || "")),
    [rows]
  );

  return (
    <div>
      <div className="filters">
        <input
          type="text"
          placeholder="Filter by location (e.g. Richmond, MD, Nashville)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={hour} onChange={(e) => setHour(e.target.value)}>
          <option value="">Any hour</option>
          {hourOptions.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
        <button className="tab-button" onClick={() => { setLocation(""); setDate(""); setHour(""); }}>
          Clear filters
        </button>
      </div>

      <div className="status-line">
        {loading ? "Loading…" : `Showing ${sorted.length} of ${total} logged readings`}
        {error && <span style={{ color: "#f87171" }}> — {error}</span>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Observed</th>
              <th>Temp (F)</th>
              <th>Condition</th>
              <th>Wind (mph)</th>
              <th>Heat Index (F)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id}>
                <td>{r.address || r.name}</td>
                <td>{r.observedAt || "—"}</td>
                <td>{r.tempF ?? "—"}</td>
                <td>{r.condition ?? "—"}</td>
                <td>{r.windMph ?? "—"}</td>
                <td>{r.heatIndexF ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
