"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import WeatherTable from "@/components/WeatherTable";

// Leaflet touches window/document — must be client-only, loaded with no SSR.
const WeatherMap = dynamic(() => import("@/components/WeatherMap"), { ssr: false });

const REFRESH_MS = 60 * 60 * 1000; // 60 minutes — matches the hourly data pull cadence

export default function Home() {
  const [tab, setTab] = useState("map");
  const [currentRows, setCurrentRows] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    loadCurrent();
    const interval = setInterval(loadCurrent, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Daily Weather</h1>
        <span className="refresh-note">
          {lastFetched ? `Map data loaded ${lastFetched.toLocaleTimeString()} · auto-refreshes hourly` : "Loading…"}
          {error && <span style={{ color: "#f87171" }}> — {error}</span>}
        </span>
      </header>

      <nav className="tabs">
        <button className={`tab-button ${tab === "map" ? "active" : ""}`} onClick={() => setTab("map")}>
          Map (current)
        </button>
        <button className={`tab-button ${tab === "search" ? "active" : ""}`} onClick={() => setTab("search")}>
          Search history
        </button>
        <button className="tab-button" onClick={loadCurrent}>
          Refresh now
        </button>
      </nav>

      <main className="panel">
        {tab === "map" ? <WeatherMap rows={currentRows} /> : <WeatherTable />}
      </main>
    </div>
  );
}
