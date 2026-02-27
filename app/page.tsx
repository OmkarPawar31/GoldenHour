"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import ETACountdown from "./components/ETACountdown";
import LivesImpactedCounter from "./components/LivesImpactedCounter";
import CorridorLineChart from "./components/CorridorLineChart";
import ClearanceBarChart from "./components/ClearanceBarChart";

const LiveMap = dynamic(() => import("./components/LiveMap"), { ssr: false });

interface Detection {
  zone: string;
  confidence: number;
  timestamp: number;
  receivedAt: number;
}
interface LogEntry extends Detection { id: number; }

const INTERSECTIONS = [
  { id: "INT-1", label: "Main St × 1st Ave" },
  { id: "INT-2", label: "Broad St × 2nd Ave" },
  { id: "INT-3", label: "Oak Ave × 3rd St" },
  { id: "INT-4", label: "Hospital Rd × 4th Ave" },
] as const;

const GREEN_DURATION_MS = 5_000;
const ETA_OFFSETS = [0, 8, 18, 28];

export default function Dashboard() {
  const [activeUntil, setActiveUntil] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastReceivedAt, setLastReceivedAt] = useState(0);
  const [corridorsCleared, setCorridorsCleared] = useState(142);
  const [alertsSent, setAlertsSent] = useState(18);
  const [isGreen, setIsGreen] = useState(false);
  const [mode, setMode] = useState<"vision" | "gps_fallback">("vision");
  const [elapsed, setElapsed] = useState(0);
  const [activatedAt, setActivatedAt] = useState(0);
  const [currentTime, setCurrentTime] = useState("");

  // Clock
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // isGreen sync
  useEffect(() => {
    const remaining = activeUntil - Date.now();
    if (remaining <= 0) { setIsGreen(false); return; }
    setIsGreen(true);
    const t = setTimeout(() => setIsGreen(false), remaining);
    return () => clearTimeout(t);
  }, [activeUntil]);

  // ETA elapsed ticker
  useEffect(() => {
    if (!isGreen) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - activatedAt) / 1000)), 500);
    return () => clearInterval(id);
  }, [isGreen, activatedAt]);

  const handleDetection = useCallback((d: Detection) => {
    if (d.receivedAt <= lastReceivedAt) return;
    setLastReceivedAt(d.receivedAt);
    setActiveUntil(Date.now() + GREEN_DURATION_MS);
    setActivatedAt(Date.now());
    setElapsed(0);
    setCorridorsCleared(p => p + 1);
    setAlertsSent(p => p + Math.floor(Math.random() * 3) + 1);
    setLogs(old => {
      const id = old.length > 0 ? old[0].id + 1 : 1;
      return [{ ...d, id }, ...old].slice(0, 100);
    });
  }, [lastReceivedAt]);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const d = await fetch("/api/detection").then(r => r.json());
        if (d.detection) { setMode("vision"); handleDetection(d.detection); }
      } catch { /* ignore */ }
    }, 1000);
    return () => clearInterval(iv);
  }, [handleDetection]);

  const getSignalState = (idx: number) => {
    if (!isGreen) return "RED";
    const rem = Math.max(0, ETA_OFFSETS[idx] - elapsed);
    if (rem === 0) return "GREEN";
    return "ORANGE";
  };

  const signalColors: Record<string, string> = {
    GREEN: "var(--neon-green)",
    RED: "var(--neon-red)",
    ORANGE: "var(--neon-orange)",
  };

  return (
    <div style={styles.shell}>
      {/* Ambient scan line */}
      <div style={styles.scanLine} />

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <header style={styles.topbar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⚡</span>
          <div>
            <div style={styles.logoTitle}>GOLDEN<span style={{ color: "var(--neon-cyan)" }}>HOUR</span></div>
            <div style={styles.logoSub}>AI EMERGENCY CORRIDOR SYSTEM</div>
          </div>
        </div>

        <div style={styles.topCenter}>
          <div style={{ ...styles.modePill, borderColor: mode === "vision" ? "var(--neon-green)" : "var(--neon-orange)" }}>
            <span style={{ ...styles.modeDot, background: mode === "vision" ? "var(--neon-green)" : "var(--neon-orange)", animation: "blink 1.5s ease infinite" }} />
            {mode === "vision" ? "AI VISION ACTIVE" : "GPS BEACON MODE"}
          </div>
          {isGreen && (
            <div style={styles.corridorBanner}>
              🚨 CORRIDOR ACTIVE — SIGNALS SWITCHING
            </div>
          )}
        </div>

        <div style={styles.topRight}>
          <div style={styles.clock}>{currentTime}</div>
          <button
            style={styles.fallbackBtnTop}
            onClick={() => setMode(m => m === "vision" ? "gps_fallback" : "vision")}
          >
            {mode === "vision" ? "⚠ SIMULATE DROPOUT" : "↺ RESTORE VISION"}
          </button>
        </div>
      </header>

      {/* ── KPI ROW ────────────────────────────────────── */}
      <div style={styles.kpiRow}>
        {[
          { label: "CORRIDORS CLEARED", value: corridorsCleared, color: "var(--neon-green)", icon: "🛣️" },
          { label: "ALERTS SENT", value: alertsSent, color: "var(--neon-cyan)", icon: "📡" },
          { label: "AVG RESPONSE TIME", value: "2.8s", color: "var(--neon-yellow)", icon: "⚡" },
          { label: "DETECTION ACCURACY", value: "95.2%", color: "var(--neon-orange)", icon: "🎯" },
        ].map(kpi => (
          <div key={kpi.label} style={styles.kpiCard} className="glass">
            <div style={styles.kpiTop}>
              <span style={styles.kpiIcon}>{kpi.icon}</span>
              <span style={{ ...styles.kpiLabel }}>{kpi.label}</span>
            </div>
            <div style={{ ...styles.kpiValue, color: kpi.color, textShadow: `0 0 20px ${kpi.color}60` }}>
              {kpi.value}
            </div>
            <div style={{ ...styles.kpiBar, background: `linear-gradient(90deg, ${kpi.color}40, ${kpi.color}10)` }} />
          </div>
        ))}
      </div>

      {/* ── 3-PANEL BODY ───────────────────────────────── */}
      <div style={styles.panels}>

        {/* ─── LEFT PANEL ─── */}
        <aside style={styles.leftPanel} className="glass">
          <p className="section-label">Signal Grid</p>
          <div style={styles.intGrid}>
            {INTERSECTIONS.map((int, idx) => {
              const sig = getSignalState(idx);
              const col = signalColors[sig];
              return (
                <div key={int.id} style={{ ...styles.intCard, borderColor: col + "40" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ ...styles.intId, color: col }}>{int.id}</div>
                      <div style={styles.intLabel}>{int.label}</div>
                    </div>
                    <div style={{ ...styles.sigDot, background: col, animation: sig === "GREEN" ? "greenPulse 1s ease infinite" : sig === "ORANGE" ? "orangePulse 0.8s ease infinite" : "redIdle 2s ease infinite" }} />
                  </div>
                  <div style={{ ...styles.sigBadge, background: col + "18", color: col, borderColor: col + "50" }}>
                    {sig}
                    {sig === "ORANGE" && ` — ${Math.max(0, ETA_OFFSETS[idx] - elapsed)}s`}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="section-label" style={{ marginTop: "1.25rem" }}>Predictive ETA</p>
          <ETACountdown active={isGreen} />

          <div style={{ marginTop: "1.25rem" }}>
            <LivesImpactedCounter corridorsCleared={corridorsCleared} />
          </div>
        </aside>

        {/* ─── CENTER PANEL (MAP) ─── */}
        <main style={styles.centerPanel}>
          <p className="section-label">Live Corridor Map</p>
          <div style={styles.mapWrapper}>
            <LiveMap active={isGreen} />
            {isGreen && (
              <div style={styles.mapOverlayBadge}>
                🚨 AMBULANCE EN ROUTE
              </div>
            )}
          </div>

          {/* Charts */}
          <div style={styles.chartRow}>
            <div className="glass" style={styles.chartCard}>
              <p className="section-label">Activations / 24h</p>
              <CorridorLineChart liveBump={corridorsCleared - 142} />
            </div>
            <div className="glass" style={styles.chartCard}>
              <p className="section-label">Clearance by Intersection</p>
              <ClearanceBarChart />
            </div>
          </div>
        </main>

        {/* ─── RIGHT PANEL ─── */}
        <aside style={styles.rightPanel} className="glass">
          <p className="section-label">Live Incident Log</p>
          <div style={styles.logScroll}>
            {logs.length === 0 ? (
              <div style={styles.logEmpty}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📡</div>
                <div>Awaiting detections…</div>
              </div>
            ) : logs.map(entry => (
              <div key={entry.id} style={styles.logRow} className="animate-slide-in">
                <div style={styles.logRowHead}>
                  <span style={styles.logZone}>{entry.zone}</span>
                  <span style={styles.logTime}>{new Date(entry.receivedAt).toLocaleTimeString()}</span>
                </div>
                <div style={styles.logRowStats}>
                  <span>Conf: <strong style={{ color: "var(--neon-green)" }}>{(entry.confidence * 100).toFixed(0)}%</strong></span>
                  <span>t+<strong style={{ color: "var(--neon-cyan)" }}>{entry.timestamp.toFixed(1)}s</strong></span>
                </div>
                <div style={styles.logRowBar}>
                  <div style={{ ...styles.logConfBar, width: `${entry.confidence * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Driver app link */}
          <a href="/driver" style={styles.driverLink}>
            <span>📱</span>
            <span>Open Driver Alert App</span>
            <span>→</span>
          </a>
        </aside>
      </div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "0.75rem 1rem",
    gap: "0.75rem",
    fontFamily: "var(--font-inter, Inter, sans-serif)",
    position: "relative",
    overflow: "hidden",
  },
  scanLine: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "2px",
    background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)",
    animation: "scanLine 6s linear infinite",
    zIndex: 0,
    pointerEvents: "none",
  },
  /* Topbar */
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.6rem 1rem",
    background: "rgba(4,20,45,0.75)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0,200,255,0.14)",
    borderRadius: 14,
    gap: "1rem",
    flexWrap: "wrap",
  },
  logo: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoIcon: { fontSize: "1.8rem", filter: "drop-shadow(0 0 8px rgba(0,212,255,0.8))" },
  logoTitle: {
    fontFamily: "var(--font-orbitron, 'Orbitron', monospace)",
    fontSize: "1.25rem",
    fontWeight: 900,
    letterSpacing: "0.08em",
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  logoSub: {
    fontSize: "0.55rem",
    letterSpacing: "0.2em",
    color: "var(--text-muted)",
    marginTop: "0.2rem",
    fontFamily: "var(--font-orbitron, monospace)",
  },
  topCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flex: 1 },
  modePill: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.3rem 0.9rem",
    borderRadius: 999,
    border: "1px solid",
    fontSize: "0.65rem",
    fontWeight: 600,
    letterSpacing: "0.12em",
    fontFamily: "var(--font-orbitron, monospace)",
    background: "rgba(0,0,0,0.4)",
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    display: "inline-block",
  },
  corridorBanner: {
    padding: "0.2rem 0.8rem",
    background: "rgba(255,30,30,0.15)",
    border: "1px solid rgba(255,59,59,0.4)",
    borderRadius: 999,
    fontSize: "0.6rem",
    letterSpacing: "0.1em",
    fontWeight: 700,
    color: "var(--neon-red)",
    fontFamily: "var(--font-orbitron, monospace)",
    animation: "blink 0.8s ease infinite",
  },
  topRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  clock: {
    fontFamily: "var(--font-orbitron, monospace)",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "var(--neon-cyan)",
    textShadow: "0 0 12px rgba(0,212,255,0.5)",
    letterSpacing: "0.1em",
  },
  fallbackBtnTop: {
    padding: "0.35rem 0.85rem",
    background: "rgba(255,149,0,0.1)",
    border: "1px solid rgba(255,149,0,0.35)",
    borderRadius: 8,
    color: "var(--neon-orange)",
    fontSize: "0.6rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.08em",
    fontFamily: "var(--font-orbitron, monospace)",
    transition: "all 0.2s ease",
  },
  /* KPI */
  kpiRow: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  kpiCard: {
    flex: "1 1 180px",
    padding: "0.9rem 1rem",
    position: "relative",
    overflow: "hidden",
    cursor: "default",
  },
  kpiTop: { display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" },
  kpiIcon: { fontSize: "1rem" },
  kpiLabel: {
    fontSize: "0.55rem",
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    fontFamily: "var(--font-orbitron, monospace)",
  },
  kpiValue: {
    fontFamily: "var(--font-orbitron, monospace)",
    fontSize: "1.8rem",
    fontWeight: 900,
    letterSpacing: "0.02em",
    lineHeight: 1,
    marginBottom: "0.5rem",
  },
  kpiBar: {
    height: 2,
    borderRadius: 2,
    marginTop: 4,
  },
  /* Panels */
  panels: {
    display: "grid",
    gridTemplateColumns: "280px 1fr 300px",
    gap: "0.75rem",
    flex: 1,
    minHeight: 0,
  },
  leftPanel: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    overflowY: "auto",
  },
  /* Intersection Grid */
  intGrid: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  intCard: {
    padding: "0.65rem 0.75rem",
    background: "rgba(0,20,50,0.5)",
    borderRadius: 10,
    border: "1px solid",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  intId: {
    fontFamily: "var(--font-orbitron, monospace)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  intLabel: { fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 1 },
  sigDot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.2)",
    flexShrink: 0,
  },
  sigBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.18rem 0.55rem",
    borderRadius: 6,
    border: "1px solid",
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    fontFamily: "var(--font-orbitron, monospace)",
    alignSelf: "flex-start",
  },
  /* Center */
  centerPanel: { display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 },
  mapWrapper: {
    flex: "1 1 320px",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid var(--border-bright)",
    position: "relative",
    boxShadow: "0 0 30px rgba(0,212,255,0.08)",
    minHeight: 300,
  },
  mapOverlayBadge: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0.4rem 1rem",
    background: "rgba(255,30,30,0.85)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,80,80,0.5)",
    borderRadius: 999,
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#fff",
    fontFamily: "var(--font-orbitron, monospace)",
    zIndex: 999,
    pointerEvents: "none",
    animation: "blink 1s ease infinite",
  },
  chartRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  chartCard: { padding: "0.85rem", minHeight: 160 },
  /* Right */
  rightPanel: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    gap: "0.75rem",
  },
  logScroll: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  logEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    letterSpacing: "0.1em",
    textAlign: "center",
    paddingTop: "2rem",
  },
  logRow: {
    padding: "0.6rem 0.75rem",
    background: "rgba(0, 30, 70, 0.5)",
    borderRadius: 10,
    border: "1px solid rgba(0,200,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    cursor: "default",
    transition: "border-color 0.2s",
  },
  logRowHead: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  logZone: {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "var(--neon-cyan)",
    fontFamily: "var(--font-orbitron, monospace)",
    letterSpacing: "0.04em",
  },
  logTime: { fontSize: "0.62rem", color: "var(--text-muted)" },
  logRowStats: { display: "flex", gap: "0.75rem", fontSize: "0.68rem", color: "var(--text-muted)" },
  logRowBar: { height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" },
  logConfBar: { height: "100%", background: "linear-gradient(90deg, var(--neon-green), var(--neon-cyan))", borderRadius: 2, transition: "width 0.5s ease" },
  driverLink: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.7rem 1rem",
    background: "rgba(0,212,255,0.06)",
    border: "1px solid rgba(0,212,255,0.2)",
    borderRadius: 10,
    color: "var(--neon-cyan)",
    textDecoration: "none",
    fontSize: "0.72rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
    transition: "all 0.2s ease",
  },
};
