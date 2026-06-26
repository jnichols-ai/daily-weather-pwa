"use client";

import { useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";

export default function WeatherTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (city) params.set("city", city);
      if (state) params.set("state", state);
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
  }, [city, state, date, hour]);

  const hourOptions = Array.from({ length: 24 }, (_, h) => {
    const value = String(h).padStart(2, "0");
    const label = new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: "numeric", hour12: true });
    return { value, label };
  });

  const stateOptions = useMemo(
    () => Array.from(new Set(CITIES.map((c) => c.state))).sort(),
    []
  );

  // City dropdown narrows to the selected state, if any, so the list stays manageable.
  const cityOptions = useMemo(
    () =>
      CITIES.filter((c) => (state ? c.state === state : true))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state]
  );

  // If the selected city is no longer valid for a newly chosen state, clear it.
  useEffect(() => {
    if (city && !cityOptions.some((c) => c.name === city)) {
      setCity("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (b.observedAt || "").localeCompare(a.observedAt || "")),
    [rows]
  );

  return (
    <div>
      <div className="filters">
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Any state</option>
          {stateOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Any city</option>
          {cityOptions.map((c) => (
            <option key={`${c.name}-${c.state}`} value={c.name}>
              {c.name}{state ? "" : ` (${c.state})`}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={hour} onChange={(e) => setHour(e.target.value)}>
          <option value="">Any hour</option>
          {hourOptions.map((h) => (
            <option key={h.value} value={h.value}>
              {h.label}
            </option>
          ))}
        </select>
        <button className="tab-button" onClick={() => { setCity(""); setState(""); setDate(""); setHour(""); }}>
          Clear filters
        </button>
      </div>

      <div className="status-line">
        {loading ? "Loading…" : `Showing ${sorted.length} of ${total} logged readings`}
        {error && <span style={{ color: "#d42121" }}> — {error}</span>}
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
