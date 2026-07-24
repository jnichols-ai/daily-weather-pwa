"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import WeatherTable from "@/components/WeatherTable";
import { CITIES } from "@/lib/cities";
import { enrichRow, SEV } from "@/lib/severity";

// Leaflet touches window/document — must be client-only, loaded with no SSR.
const WeatherMap = dynamic(() => import("@/components/WeatherMap"), { ssr: false });

const REFRESH_MS = 60 * 60 * 1000; // 60 minutes

export default function Home() {
  const [tab, setTab] = useState("map");
  const [currentRows, setCurrentRows] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);
  const [pulling, setPulling] = useState(false);
  // focusTarget is set when the user clicks a city in the Hot Spots sidebar;
  // WeatherMap watches it and pans/zooms to that location.
  const [focusTarget, setFocusTarget] = useState(null);

  async function loadCurrent() {
    try {
      const res = await fetch("/api/weather/current", { cache: "no-store" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCurrentRows(json.rows);
      setLastFetched(new Date());
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }

  async function pullNow() {
    setPulling(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      await loadCurrent();
    } catch (e) {
      setError(String(e));
    } finally {
      setPulling(false);
    }
  }

  useEffect(() => {
    loadCurrent();
    const interval = setInterval(loadCurrent, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Enrich current rows with severity + parsed city/state
  const enrichedRows = useMemo(() => currentRows.map(enrichRow), [currentRows]);

  // Stats computed from live data
  const avgTemp = useMemo(() => {
    const vals = enrichedRows.map((r) => parseFloat(r.tempF)).filter((n) => !isNaN(n));
    return vals.length ? Math.round(vals.reduce((s, n) => s + n, 0) / vals.length) : null;
  }, [enrichedRows]);

  const hottest = useMemo(
    () => [...enrichedRows].sort((a, b) => parseFloat(b.tempF) - parseFloat(a.tempF))[0] || null,
    [enrichedRows]
  );

  const worstHeat = useMemo(
    () =>
      [...enrichedRows].sort((a, b) => parseFloat(b.heatIndexF) - parseFloat(a.heatIndexF))[0] ||
      null,
    [enrichedRows]
  );

  // Top 12 cities by heat index for the sidebar
  const rankedCities = useMemo(
    () =>
      [...enrichedRows]
        .sort((a, b) => parseFloat(b.heatIndexF) - parseFloat(a.heatIndexF))
        .slice(0, 12),
    [enrichedRows]
  );

  const alertCount = useMemo(
    () => enrichedRows.filter((r) => r.sevKey !== "normal").length,
    [enrichedRows]
  );

  function focusCity(city) {
    // Switch to map tab and pan to the chosen city
    setTab("map");
    setFocusTarget({ lat: city.lat, lng: city.lng, id: city.id, ts: Date.now() });
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff", color: "#252525" }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        padding: "16px 28px", background: "#080808", color: "#fdfdfd",
        borderBottom: "3px solid #d42121",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="live-dot" />
            <h1 style={{ fontSize: "20px", margin: 0, fontWeight: 800, letterSpacing: "0.2px", color: "#fdfdfd" }}>
              Daily Weather
            </h1>
          </div>
          <span style={{ fontSize: "12px", color: "#b8b8b8" }}>
            DE / MD / WV Panhandle / VA I-81 &amp; I-95 / Nashville, TN / UT — {CITIES.length} locations
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "12px", color: "#b8b8b8" }}>
            {lastFetched
              ? `Data loaded ${lastFetched.toLocaleTimeString()} · auto-refreshes hourly`
              : "Loading…"}
            {error && <span style={{ color: "#d42121" }}> — {error}</span>}
          </span>
          <button className="refresh-btn" onClick={pullNow} disabled={pulling}>
            {pulling ? "Pulling fresh data…" : "Refresh now"}
          </button>
        </div>
      </header>

      {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 28px", background: "#f5f4f3", borderBottom: "1px solid #e4e2e0",
        flexWrap: "wrap", gap: "10px",
      }}>
        <div style={{
          display: "flex", gap: "6px",
          background: "#ffffff", border: "1px solid #e4e2e0",
          borderRadius: "8px", padding: "4px",
        }}>
          <button className={`pill-tab${tab === "map" ? " active" : ""}`} onClick={() => setTab("map")}>
            Map · Current
          </button>
          <button className={`pill-tab${tab === "search" ? " active" : ""}`} onClick={() => setTab("search")}>
            Search · History
          </button>
        </div>
        <span style={{ fontSize: "12px", color: "#8a8886" }}>
          Heat index alerts:{" "}
          <strong style={{ color: "#252525" }}>
            {alertCount > 0 ? `${alertCount} location${alertCount !== 1 ? "s" : ""}` : "None"}
          </strong>
        </span>
      </nav>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section className="stats-bar">
        <div className="stat-card">
          <div className="stat-label">Cities Tracked</div>
          <div className="stat-value">{CITIES.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Temp</div>
          <div className="stat-value">{avgTemp != null ? `${avgTemp}°F` : "—"}</div>
        </div>
        <div className="stat-card" style={{ minWidth: "200px" }}>
          <div className="stat-label">Hottest Now</div>
          <div className="stat-value stat-value--sm">
            {hottest ? (
              <>{hottest.tempF}°F <span className="stat-sub">· {hottest.cityName}, {hottest.stateName}</span></>
            ) : "—"}
          </div>
        </div>
        {worstHeat && (
          <div
            className="stat-card"
            style={{
              minWidth: "220px",
              background: SEV[worstHeat.sevKey].bg,
              border: `1px solid ${SEV[worstHeat.sevKey].border}`,
            }}
          >
            <div className="stat-label" style={{ color: SEV[worstHeat.sevKey].color }}>
              Highest Heat Index · {SEV[worstHeat.sevKey].label}
            </div>
            <div className="stat-value stat-value--sm" style={{ color: SEV[worstHeat.sevKey].color }}>
              {worstHeat.heatIndexF}°F{" "}
              <span className="stat-sub">· {worstHeat.cityName}, {worstHeat.stateName}</span>
            </div>
          </div>
        )}
      </section>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "16px 28px 28px" }}>
        {tab === "map" ? (
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "stretch" }}>
            {/* Map */}
            <div style={{ flex: "2.2", minWidth: "340px", height: "70vh" }}>
              <WeatherMap rows={enrichedRows} focusTarget={focusTarget} />
            </div>
            {/* Hot Spots sidebar */}
            <div className="hotspots-sidebar">
              <div className="hotspots-header">Hot Spots · ranked by heat index</div>
              {rankedCities.length === 0 && (
                <div style={{ padding: "16px 14px", fontSize: "12px", color: "#8a8886" }}>
                  Loading data…
                </div>
              )}
              {rankedCities.map((c) => (
                <div key={c.id} className="hotspot-row" onClick={() => focusCity(c)}>
                  <span className="sev-dot" style={{ background: c.sevDot }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.cityName}, {c.stateName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#8a8886" }}>
                      {c.condition || "—"} · {c.windMph || "—"} mph
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 800 }}>{c.tempF || "—"}°</div>
                    <div className="sev-badge" style={{ background: c.sevBg, color: c.sevColor }}>
                      HI {c.heatIndexF || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <WeatherTable />
        )}
      </main>
    </div>
  );
}
