"use client";

import { useEffect, useMemo, useState } from "react";
import { CITIES } from "@/lib/cities";
import { enrichRow } from "@/lib/severity";

export default function WeatherTable() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  // Server-side filters (reduce data transferred)
  const [state, setState] = useState("");
  const [date, setDate] = useState("");
  // Client-side filters applied after fetch
  const [query, setQuery] = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (state) params.set("state", state);
      if (date)  params.set("date", date);
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

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, date]);

  const stateOptions = useMemo(
    () => Array.from(new Set(CITIES.map((c) => c.state))).sort(),
    []
  );

  // Enrich + apply client-side filters (severity, city text search)
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...rows]
      .map(enrichRow)
      .filter((r) => !sevFilter || r.sevKey === sevFilter)
      .filter((r) => !q || (r.cityName || "").toLowerCase().includes(q))
      .sort((a, b) => (b.observedAt || "").localeCompare(a.observedAt || ""))
      .map((r, i) => ({ ...r, rowBg: i % 2 === 0 ? "#ffffff" : "#fbfafa" }));
  }, [rows, sevFilter, query]);

  return (
    <div>
      <div className="filters">
        <select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">Any state</option>
          {stateOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}>
          <option value="">Any severity</option>
          <option value="normal">Normal</option>
          <option value="caution">Caution (HI ≥ 90°F)</option>
          <option value="danger">Danger (HI ≥ 103°F)</option>
          <option value="extreme">Extreme (HI ≥ 125°F)</option>
        </select>

        <input
          type="text"
          placeholder="Search city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ minWidth: "160px" }}
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title="Filter by date"
        />

        <button
          className="clear-btn"
          onClick={() => { setState(""); setSevFilter(""); setQuery(""); setDate(""); }}
        >
          Clear filters
        </button>

        <span className="filter-status">
          {loading
            ? "Loading…"
            : `Showing ${filteredRows.length} of ${total} logged readings`}
          {error && <span style={{ color: "#d42121" }}> — {error}</span>}
        </span>
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
              <th>Heat Index</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} style={{ background: r.rowBg }}>
                <td style={{ fontWeight: 600 }}>{r.cityName}, {r.stateName}</td>
                <td style={{ color: "#6b6b6b" }}>{r.observedAt || "—"}</td>
                <td>{r.tempF ?? "—"}°</td>
                <td>{r.condition ?? "—"}</td>
                <td>{r.windMph ?? "—"}</td>
                <td>
                  <span
                    className="sev-pill"
                    style={{ background: r.sevBg, color: r.sevColor }}
                  >
                    {r.heatIndexF ?? "—"}° · {r.sevLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
