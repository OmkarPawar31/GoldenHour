"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Zap,
  Target,
  Radio,
  Timer,
  Map,
  FileText,
  Cpu,
  Smartphone,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
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

/* Animation variants */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

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

  /* Clock */
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* isGreen sync */
  useEffect(() => {
    const remaining = activeUntil - Date.now();
    if (remaining <= 0) { setIsGreen(false); return; }
    setIsGreen(true);
    const t = setTimeout(() => setIsGreen(false), remaining);
    return () => clearTimeout(t);
  }, [activeUntil]);

  /* ETA elapsed ticker */
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

  const kpiData = [
    { label: "Corridors Cleared", value: corridorsCleared, unit: "", color: "var(--accent)", Icon: Activity, trend: TrendingUp, trendUp: true },
    { label: "Alerts Sent", value: alertsSent, unit: "", color: "var(--neon-cyan)", Icon: AlertTriangle, trend: TrendingUp, trendUp: true },
    { label: "Avg Response Time", value: "2.8", unit: "s", color: "var(--neon-yellow)", Icon: Zap, trend: TrendingDown, trendUp: false },
    { label: "Detection Accuracy", value: "95.2", unit: "%", color: "var(--neon-green)", Icon: Target, trend: TrendingUp, trendUp: true },
  ];

  return (
    <div style={styles.shell}>
      {/* Ambient background orb */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      {/* Scan line */}
      <div style={styles.scanLine} />

      {/* ── TOPBAR ──────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={styles.topbar}
      >
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIconWrap}>
            <Zap size={18} color="#FF6B00" />
          </div>
          <div>
            <div style={styles.logoTitle}>
              GOLDEN<span style={{ color: "var(--accent)" }}>HOUR</span>
            </div>
            <div style={styles.logoSub}>AI EMERGENCY CORRIDOR SYSTEM</div>
          </div>
        </div>

        {/* Center status */}
        <div style={styles.topCenter}>
          <div style={{
            ...styles.modePill,
            borderColor: mode === "vision" ? "rgba(34,197,94,0.4)" : "rgba(255,107,0,0.4)",
            background: mode === "vision" ? "rgba(34,197,94,0.08)" : "rgba(255,107,0,0.08)",
          }}>
            <span style={{
              ...styles.modeDot,
              background: mode === "vision" ? "var(--neon-green)" : "var(--neon-orange)",
              animation: "blink 1.5s ease infinite",
              boxShadow: mode === "vision" ? "0 0 8px var(--neon-green)" : "0 0 8px var(--neon-orange)",
            }} />
            <Radio size={10} style={{ opacity: 0.7 }} />
            {mode === "vision" ? "AI VISION ACTIVE" : "GPS BEACON MODE"}
          </div>
          {isGreen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={styles.corridorBanner}
            >
              🚨 CORRIDOR ACTIVE — SIGNALS SWITCHING
            </motion.div>
          )}
        </div>

        {/* Right */}
        <div style={styles.topRight}>
          <div style={styles.clock}>{currentTime}</div>
          <button
            style={{
              ...styles.modeToggle,
              borderColor: mode === "vision" ? "rgba(255,107,0,0.3)" : "rgba(34,197,94,0.3)",
              color: mode === "vision" ? "var(--neon-orange)" : "var(--neon-green)",
            }}
            onClick={() => setMode(m => m === "vision" ? "gps_fallback" : "vision")}
          >
            <Cpu size={11} />
            {mode === "vision" ? "SIMULATE DROPOUT" : "RESTORE VISION"}
          </button>
        </div>
      </motion.header>

      {/* ── KPI ROW ─────────────────────────────────────────── */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={styles.kpiRow}
      >
        {kpiData.map((kpi) => (
          <motion.div key={kpi.label} variants={fadeUp} style={styles.kpiCard} className="glass">
            <div style={styles.kpiHeader}>
              <div style={{ ...styles.kpiIconBox, background: kpi.color + "18", borderColor: kpi.color + "30" }}>
                <kpi.Icon size={14} color={kpi.color} />
              </div>
              <div style={{ ...styles.kpiTrend, color: kpi.trendUp ? "var(--neon-green)" : "var(--neon-red)" }}>
                <kpi.trend size={11} />
              </div>
            </div>
            <div style={{ ...styles.kpiValue, color: kpi.color, textShadow: `0 0 24px ${kpi.color}60` }}>
              {kpi.value}<span style={styles.kpiUnit}>{kpi.unit}</span>
            </div>
            <div style={styles.kpiLabel}>{kpi.label}</div>
            <div style={{ ...styles.kpiBar, background: `linear-gradient(90deg, ${kpi.color}50, ${kpi.color}10)` }} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── 3-PANEL BODY ────────────────────────────────────── */}
      <div style={styles.panels}>

        {/* ─── LEFT PANEL ─── */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={styles.leftPanel}
          className="glass"
        >
          <p className="section-label"><Map size={11} />Signal Grid</p>
          <div style={styles.intGrid}>
            {INTERSECTIONS.map((int, idx) => {
              const sig = getSignalState(idx);
              const col = signalColors[sig];
              return (
                <div key={int.id} style={{ ...styles.intCard, borderColor: col + "35" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ ...styles.intId, color: col }}>{int.id}</div>
                      <div style={styles.intLabel}>{int.label}</div>
                    </div>
                    <div style={{
                      ...styles.sigDot,
                      background: col,
                      boxShadow: `0 0 8px ${col}`,
                      animation: sig === "GREEN" ? "greenPulse 1s ease infinite"
                        : sig === "ORANGE" ? "orangePulse 0.8s ease infinite"
                          : "redIdle 2s ease infinite",
                    }} />
                  </div>
                  <div style={{ ...styles.sigBadge, background: col + "14", color: col, borderColor: col + "40" }}>
                    {sig}
                    {sig === "ORANGE" && ` — ${Math.max(0, ETA_OFFSETS[idx] - elapsed)}s`}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="section-label" style={{ marginTop: "1.25rem" }}>
            <Timer size={11} />Predictive ETA
          </p>
          <ETACountdown active={isGreen} />

          <div style={{ marginTop: "1.25rem" }}>
            <LivesImpactedCounter corridorsCleared={corridorsCleared} />
          </div>
        </motion.aside>

        {/* ─── CENTER PANEL (MAP) ─── */}
        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={styles.centerPanel}
        >
          <p className="section-label"><Map size={11} />Live Corridor Map</p>
          <div style={{
            ...styles.mapWrapper,
            borderColor: isGreen ? "var(--accent-border)" : "var(--border)",
            boxShadow: isGreen ? "var(--accent-glow)" : "none",
          }}>
            <LiveMap active={isGreen} />
            {isGreen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.mapBadge}
              >
                🚨 AMBULANCE EN ROUTE
              </motion.div>
            )}
          </div>

          {/* Charts */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            style={styles.chartRow}
          >
            <motion.div variants={fadeUp} className="glass" style={styles.chartCard}>
              <p className="section-label"><Activity size={11} />Activations / 24h</p>
              <CorridorLineChart liveBump={corridorsCleared - 142} />
            </motion.div>
            <motion.div variants={fadeUp} className="glass" style={styles.chartCard}>
              <p className="section-label"><TrendingUp size={11} />Clearance by Intersection</p>
              <ClearanceBarChart />
            </motion.div>
          </motion.div>
        </motion.main>

        {/* ─── RIGHT PANEL ─── */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          style={styles.rightPanel}
          className="glass"
        >
          <p className="section-label"><FileText size={11} />Live Incident Log</p>
          <div style={styles.logScroll}>
            {logs.length === 0 ? (
              <div style={styles.logEmpty}>
                <div style={styles.logEmptyIcon}>
                  <Radio size={28} color="var(--accent)" strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.08em" }}>
                  Awaiting detections…
                </div>
              </div>
            ) : logs.map(entry => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={styles.logRow}
              >
                <div style={styles.logRowHead}>
                  <span style={styles.logZone}>{entry.zone}</span>
                  <span style={styles.logTime}>{new Date(entry.receivedAt).toLocaleTimeString()}</span>
                </div>
                <div style={styles.logRowStats}>
                  <span>Conf: <strong style={{ color: "var(--neon-green)" }}>{(entry.confidence * 100).toFixed(0)}%</strong></span>
                  <span>t+<strong style={{ color: "var(--accent)" }}>{entry.timestamp.toFixed(1)}s</strong></span>
                </div>
                <div style={styles.logRowBar}>
                  <div style={{ ...styles.logConfBar, width: `${entry.confidence * 100}%` }} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Driver app link */}
          <a href="/driver" style={styles.driverLink}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Smartphone size={14} color="var(--accent)" />
              <span>Open Driver Alert App</span>
            </div>
            <ArrowRight size={13} color="var(--accent)" />
          </a>
        </motion.aside>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: "0.75rem 1rem",
    gap: "0.75rem",
    fontFamily: "var(--font-body)",
    position: "relative",
    overflow: "hidden",
  },

  /* Background elements */
  bgOrb1: {
    position: "fixed",
    top: "-15%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "700px",
    height: "700px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 65%)",
    pointerEvents: "none",
    zIndex: 0,
    animation: "orbFloat 8s ease-in-out infinite",
  },
  bgOrb2: {
    position: "fixed",
    bottom: "-20%",
    right: "-10%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(120,40,200,0.07) 0%, transparent 60%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  scanLine: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    height: "1px",
    background: "linear-gradient(90deg, transparent, rgba(255,107,0,0.35), transparent)",
    animation: "scanLine 8s linear infinite",
    zIndex: 1,
    pointerEvents: "none",
  },

  /* Topbar */
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0.65rem 1.1rem",
    background: "rgba(10, 11, 16, 0.8)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    gap: "1rem",
    flexWrap: "wrap",
    position: "relative",
    zIndex: 10,
  },
  logo: { display: "flex", alignItems: "center", gap: "0.75rem" },
  logoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "rgba(255,107,0,0.12)",
    border: "1px solid rgba(255,107,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 16px rgba(255,107,0,0.25)",
  },
  logoTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "1.1rem",
    fontWeight: 900,
    letterSpacing: "0.1em",
    color: "var(--text-primary)",
    lineHeight: 1,
  },
  logoSub: {
    fontSize: "0.48rem",
    letterSpacing: "0.2em",
    color: "var(--text-muted)",
    marginTop: "0.25rem",
    fontFamily: "var(--font-display)",
    textTransform: "uppercase",
  },
  topCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flex: 1 },
  modePill: {
    display: "flex",
    alignItems: "center",
    gap: "0.45rem",
    padding: "0.3rem 0.85rem",
    borderRadius: 999,
    border: "1px solid",
    fontSize: "0.6rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    fontFamily: "var(--font-display)",
  },
  modeDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: 0,
  },
  corridorBanner: {
    padding: "0.2rem 0.85rem",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.4)",
    borderRadius: 999,
    fontSize: "0.58rem",
    letterSpacing: "0.1em",
    fontWeight: 700,
    color: "var(--neon-red)",
    fontFamily: "var(--font-display)",
    animation: "blink 0.8s ease infinite",
  },
  topRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  clock: {
    fontFamily: "var(--font-display)",
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "var(--accent)",
    textShadow: "0 0 16px rgba(255,107,0,0.5)",
    letterSpacing: "0.1em",
  },
  modeToggle: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.35rem 0.8rem",
    background: "rgba(255,107,0,0.06)",
    border: "1px solid",
    borderRadius: 8,
    fontSize: "0.58rem",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.08em",
    fontFamily: "var(--font-display)",
    transition: "all 0.2s ease",
  },

  /* KPI */
  kpiRow: { display: "flex", gap: "0.75rem", flexWrap: "wrap", position: "relative", zIndex: 2 },
  kpiCard: {
    flex: "1 1 180px",
    padding: "1rem 1.1rem",
    position: "relative",
    overflow: "hidden",
    cursor: "default",
  },
  kpiHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  kpiIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiTrend: { display: "flex", alignItems: "center" },
  kpiValue: {
    fontFamily: "var(--font-display)",
    fontSize: "1.9rem",
    fontWeight: 900,
    letterSpacing: "0.02em",
    lineHeight: 1,
    marginBottom: "0.3rem",
  },
  kpiUnit: { fontSize: "0.9rem", fontWeight: 600, marginLeft: "0.1rem", opacity: 0.8 },
  kpiLabel: {
    fontSize: "0.6rem",
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    marginBottom: "0.75rem",
  },
  kpiBar: { height: 2, borderRadius: 2 },

  /* Panels */
  panels: {
    display: "grid",
    gridTemplateColumns: "280px 1fr 300px",
    gap: "0.75rem",
    flex: 1,
    minHeight: 0,
    position: "relative",
    zIndex: 2,
  },

  /* Left Panel */
  leftPanel: { padding: "1rem", display: "flex", flexDirection: "column", gap: 0, overflowY: "auto" },
  intGrid: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  intCard: {
    padding: "0.65rem 0.75rem",
    background: "rgba(15,16,22,0.6)",
    borderRadius: 10,
    border: "1px solid",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  intId: {
    fontFamily: "var(--font-display)",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
  },
  intLabel: { fontSize: "0.62rem", color: "var(--text-muted)", marginTop: 1 },
  sigDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.15)",
    flexShrink: 0,
  },
  sigBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.18rem 0.55rem",
    borderRadius: 6,
    border: "1px solid",
    fontSize: "0.58rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    fontFamily: "var(--font-display)",
    alignSelf: "flex-start",
  },

  /* Center */
  centerPanel: { display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 },
  mapWrapper: {
    flex: "1 1 320px",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid",
    position: "relative",
    transition: "border-color 0.4s ease, box-shadow 0.4s ease",
    minHeight: 300,
  },
  mapBadge: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "0.4rem 1rem",
    background: "rgba(239,68,68,0.85)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(239,68,68,0.5)",
    borderRadius: 999,
    fontSize: "0.62rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#fff",
    fontFamily: "var(--font-display)",
    zIndex: 999,
    pointerEvents: "none",
    animation: "blink 1s ease infinite",
    whiteSpace: "nowrap",
  },
  chartRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  chartCard: { padding: "0.9rem", minHeight: 160 },

  /* Right Panel */
  rightPanel: { padding: "1rem", display: "flex", flexDirection: "column", minHeight: 0, gap: "0.75rem" },
  logScroll: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.45rem" },
  logEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    gap: "0.75rem",
    paddingTop: "2rem",
  },
  logEmptyIcon: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: "rgba(255,107,0,0.08)",
    border: "1px solid rgba(255,107,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logRow: {
    padding: "0.6rem 0.75rem",
    background: "rgba(15,16,22,0.65)",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.06)",
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
    color: "var(--accent)",
    fontFamily: "var(--font-display)",
    letterSpacing: "0.04em",
  },
  logTime: { fontSize: "0.6rem", color: "var(--text-muted)" },
  logRowStats: { display: "flex", gap: "0.75rem", fontSize: "0.66rem", color: "var(--text-muted)" },
  logRowBar: { height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" },
  logConfBar: {
    height: "100%",
    background: "linear-gradient(90deg, var(--accent), var(--neon-yellow))",
    borderRadius: 2,
    transition: "width 0.5s ease",
  },
  driverLink: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.7rem 1rem",
    background: "rgba(255,107,0,0.06)",
    border: "1px solid rgba(255,107,0,0.2)",
    borderRadius: 10,
    color: "var(--text-primary)",
    textDecoration: "none",
    fontSize: "0.72rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    transition: "all 0.2s ease",
  },
};
