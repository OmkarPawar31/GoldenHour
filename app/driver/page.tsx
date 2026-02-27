"use client";

import { useState, useEffect, useRef } from "react";

type AppMode = "driver" | "ambulance" | null;

const INTERSECTIONS = [
  { id: "INT-1", label: "Main St × 1st Ave", etaOffset: 0 },
  { id: "INT-2", label: "Broad St × 2nd Ave", etaOffset: 8 },
  { id: "INT-3", label: "Oak Ave × 3rd St", etaOffset: 18 },
  { id: "INT-4", label: "Hospital Rd × 4th Ave", etaOffset: 28 },
];

export default function DriverApp() {
  const [mode, setMode] = useState<AppMode>(null);
  const [alertActive, setAlertActive] = useState(false);
  const [beaconStatus, setBeaconStatus] = useState("Ready");
  const [alertCount, setAlertCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isGreen, setIsGreen] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clock tick
  useEffect(() => {
    const tick = () => setCurrentTime(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ETA elapsed
  useEffect(() => {
    if (!isGreen) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [isGreen]);

  // Poll detections when in driver mode
  useEffect(() => {
    if (mode !== "driver") return;
    const iv = setInterval(async () => {
      try {
        const d = await fetch("/api/detection").then(r => r.json());
        if (d.detection) triggerAlert();
      } catch { /* ignore */ }
    }, 1500);
    return () => clearInterval(iv);
  }, [mode]);

  // GPS beacon when in ambulance mode
  useEffect(() => {
    if (mode !== "ambulance") return;
    timerRef.current = setInterval(() => {
      navigator.geolocation?.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        fetch("/api/beacon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => { });
        setBeaconStatus(`Sent at ${new Date().toLocaleTimeString("en-IN", { hour12: false })}`);
      });
    }, 2000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode]);

  function triggerAlert() {
    setAlertActive(true);
    setIsGreen(true);
    setAlertCount(c => c + 1);
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        const msg = new SpeechSynthesisUtterance("Emergency vehicle approaching. Please move to the left lane immediately.");
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
      }
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }
    alertTimerRef.current = setTimeout(() => {
      setAlertActive(false);
      setIsGreen(false);
    }, 10_000);
  }

  function dismissAlert() {
    setAlertActive(false);
    setIsGreen(false);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
  }

  // Mode selection screen
  if (!mode) {
    return (
      <div style={S.modeShell}>
        <style>{KEYFRAMES}</style>
        {/* Animated background particles */}
        <div style={S.bgGlow1} />
        <div style={S.bgGlow2} />

        <div style={S.modeCard}>
          <div style={S.appIcon}>⚡</div>
          <h1 style={S.appTitle}>
            GOLDEN<span style={{ color: "var(--neon-cyan, #00d4ff)" }}>HOUR</span>
          </h1>
          <p style={S.appSubtitle}>AI Emergency Corridor System</p>

          <div style={S.divider} />

          <p style={S.selectLabel}>SELECT YOUR MODE</p>

          <div style={S.modeBtns}>
            <button style={S.modeBtn} onClick={() => setMode("driver")} className="mode-btn-driver">
              <div style={S.modeBtnIcon}>🚗</div>
              <div style={S.modeBtnTitle}>DRIVER MODE</div>
              <div style={S.modeBtnDesc}>Receive emergency alerts &amp; route guidance</div>
              <div style={S.modeBtnArrow}>→</div>
            </button>
            <button style={{ ...S.modeBtn, ...S.modeBtnAmb }} onClick={() => setMode("ambulance")}>
              <div style={S.modeBtnIcon}>🚑</div>
              <div style={S.modeBtnTitle}>AMBULANCE MODE</div>
              <div style={S.modeBtnDesc}>Broadcast beacon &amp; view corridor status</div>
              <div style={S.modeBtnArrow}>→</div>
            </button>
          </div>

          <a href="/" style={S.backLink}>← Back to Control Dashboard</a>
        </div>
      </div>
    );
  }

  // DRIVER MODE
  if (mode === "driver") {
    return (
      <div style={alertActive ? S.driverShellAlert : S.driverShell}>
        <style>{KEYFRAMES}</style>
        <div style={S.bgGlow1} />

        {/* Emergency Overlay */}
        {alertActive && (
          <div style={S.emergencyOverlay}>
            <div style={S.emergencyContent}>
              <div style={S.sirenIcons}>🚨 🚑 🚨</div>
              <h1 style={S.emergencyTitle}>AMBULANCE APPROACHING</h1>
              <p style={S.emergencySubtitle}>MOVE TO THE LEFT LANE IMMEDIATELY</p>
              <div style={S.emergencyPulseRing} />
              <div style={{ ...S.emergencyPulseRing, animationDelay: "0.5s", width: 200, height: 200 }} />
              <div style={{ ...S.emergencyPulseRing, animationDelay: "1s", width: 260, height: 260 }} />
              <button style={S.dismissBtn} onClick={dismissAlert}>✓ Acknowledged — Moving Left</button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <header style={S.driverHeader}>
          <div>
            <div style={S.driverTitle}>🚗 DRIVER MODE</div>
            <div style={S.driverSub}>Green Corridor Alert System</div>
          </div>
          <div style={S.clock}>{currentTime}</div>
          <button style={S.backBtn} onClick={() => setMode(null)}>← BACK</button>
        </header>

        {/* Status Card */}
        <div style={{ ...S.statusCard, borderColor: alertActive ? "rgba(255,59,59,0.5)" : "rgba(0,212,255,0.2)" }}>
          <div style={S.statusDot(alertActive)} />
          <div>
            <div style={{ ...S.statusTitle, color: alertActive ? "var(--neon-red, #ff3b3b)" : "var(--neon-green, #00ff88)" }}>
              {alertActive ? "⚠ EMERGENCY VEHICLE NEARBY" : "✓ ALL CLEAR"}
            </div>
            <div style={S.statusDesc}>
              {alertActive ? "Pull over to the left lane now" : "Monitoring active corridors…"}
            </div>
          </div>
          <div style={S.alertCount}>
            <div style={S.alertCountNum}>{alertCount}</div>
            <div style={S.alertCountLabel}>ALERTS</div>
          </div>
        </div>

        {/* Intersection ETA Grid */}
        <div style={S.etaGrid}>
          {INTERSECTIONS.map((int, idx) => {
            const rem = Math.max(0, int.etaOffset - elapsed);
            const state = (isGreen && rem === 0) ? "GREEN" : (isGreen && rem > 0) ? "ORANGE" : "RED";
            const col = state === "GREEN" ? "#00ff88" : state === "ORANGE" ? "#ff9500" : "#ff3b3b";
            return (
              <div key={int.id} style={{ ...S.etaCard, borderColor: col + "40" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ ...S.etaId, color: col }}>{int.id}</div>
                  <div style={{ ...S.etaDot, background: col, animation: state === "GREEN" ? "greenPulse 1s infinite" : state === "ORANGE" ? "orangePulse 0.8s infinite" : "redIdle 2s infinite" }} />
                </div>
                <div style={S.etaLabel}>{int.label}</div>
                <div style={{ ...S.etaStatus, color: col }}>
                  {state === "GREEN" ? "🟢 GREEN — ACTIVE" : state === "ORANGE" ? `🟠 GREEN IN ${rem}s` : "🔴 RED"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Test alert button for demo */}
        <button style={S.testBtn} onClick={triggerAlert}>
          📡 SIMULATE EMERGENCY ALERT (DEMO)
        </button>

        <button style={S.backBtnFull} onClick={() => setMode(null)}>← Return to Mode Selection</button>
      </div>
    );
  }

  // AMBULANCE MODE
  return (
    <div style={S.ambShell}>
      <style>{KEYFRAMES}</style>
      <div style={S.bgGlow2} />

      <header style={S.ambHeader}>
        <div style={S.sirenLight} />
        <div>
          <div style={S.ambTitle}>🚑 AMBULANCE MODE</div>
          <div style={S.ambSub}>GPS Beacon Active</div>
        </div>
        <div style={S.clock}>{currentTime}</div>
        <button style={S.backBtn} onClick={() => setMode(null)}>← BACK</button>
      </header>

      {/* Beacon status */}
      <div style={S.beaconCard}>
        <div style={S.beaconPulse}>
          <div style={S.beaconCore}>📡</div>
          <div style={S.beaconRing1} />
          <div style={S.beaconRing2} />
          <div style={S.beaconRing3} />
        </div>
        <div>
          <div style={S.beaconTitle}>BEACON TRANSMITTING</div>
          <div style={S.beaconSub}>{beaconStatus}</div>
          {coords && (
            <div style={S.coordsText}>
              {coords.lat.toFixed(6)}°N, {coords.lng.toFixed(6)}°E
            </div>
          )}
        </div>
      </div>

      {/* Corridor Status */}
      <div style={S.corridorLabel}>CORRIDOR STATUS</div>
      <div style={S.corridorGrid}>
        {INTERSECTIONS.map((int, idx) => (
          <div key={int.id} style={S.corridorCard}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={S.corrId}>{int.id}</span>
              <span style={S.corrEta}>ETA +{int.etaOffset}s</span>
            </div>
            <div style={S.corrLabel}>{int.label}</div>
            <div style={S.corrBar}>
              <div style={{ ...S.corrBarFill, width: `${100 - (int.etaOffset / 28) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <button style={S.backBtnFull} onClick={() => setMode(null)}>← Return to Mode Selection</button>
    </div>
  );
}

/* ── Keyframes injected as a string ────────────────────────────── */
const KEYFRAMES = `
  @keyframes greenPulse { 0%,100%{box-shadow:0 0 8px 2px rgba(0,255,136,.6),0 0 20px rgba(0,255,136,.2)}50%{box-shadow:0 0 16px 6px rgba(0,255,136,.9),0 0 40px rgba(0,255,136,.4)} }
  @keyframes orangePulse{ 0%,100%{box-shadow:0 0 8px 2px rgba(255,149,0,.5)}50%{box-shadow:0 0 14px 5px rgba(255,149,0,.8)} }
  @keyframes redIdle    { 0%,100%{box-shadow:0 0 6px 2px rgba(255,59,59,.4)}50%{box-shadow:0 0 10px 3px rgba(255,59,59,.6)} }
  @keyframes blink      { 0%,100%{opacity:1}50%{opacity:.3} }
  @keyframes sirenFlash { 0%,100%{opacity:1;background:rgba(255,30,30,.9)}50%{opacity:.5;background:rgba(255,150,0,.7)} }
  @keyframes pulsering  { 0%{transform:scale(.8);opacity:.8}100%{transform:scale(2);opacity:0} }
  @keyframes emergPulse { 0%,100%{background:rgba(180,0,0,.9)}50%{background:rgba(255,20,20,.97)} }
  @keyframes beaconSpin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }
  @keyframes glow1Ani   { 0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.2);opacity:.8} }
  @keyframes glow2Ani   { 0%,100%{transform:scale(1.1);opacity:.4}50%{transform:scale(.9);opacity:.7} }
`;

const FONT_DISPLAY = "'Orbitron', 'var(--font-orbitron)', monospace";
const FONT_BODY = "'Inter', 'var(--font-inter)', sans-serif";

/* ── Styles ──────────────────────────────────────────────────── */
const S: Record<string, any> = {
  /* ── Shared BG glows ── */
  bgGlow1: {
    position: "fixed", top: "-20%", left: "-10%",
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,100,200,.18) 0%, transparent 70%)",
    animation: "glow1Ani 6s ease-in-out infinite",
    pointerEvents: "none", zIndex: 0,
  },
  bgGlow2: {
    position: "fixed", bottom: "-20%", right: "-10%",
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,200,100,.1) 0%, transparent 70%)",
    animation: "glow2Ani 7s ease-in-out infinite",
    pointerEvents: "none", zIndex: 0,
  },

  /* ── Mode Selection ── */
  modeShell: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1.5rem", position: "relative", overflow: "hidden",
    background: "#020b18",
    fontFamily: FONT_BODY,
  },
  modeCard: {
    width: "100%", maxWidth: 460, position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "2.5rem 2rem",
    background: "rgba(4,20,45,0.7)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0,212,255,0.2)",
    borderRadius: 24,
    boxShadow: "0 0 60px rgba(0,100,200,0.15), 0 0 120px rgba(0,50,120,0.1)",
  },
  appIcon: {
    fontSize: "3rem",
    filter: "drop-shadow(0 0 16px rgba(0,212,255,0.8))",
    marginBottom: "0.75rem",
  },
  appTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "2rem", fontWeight: 900,
    letterSpacing: "0.08em", color: "#e8f4ff", margin: 0, lineHeight: 1,
  },
  appSubtitle: {
    fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase",
    color: "rgba(180,210,255,0.5)", marginTop: "0.5rem",
    fontFamily: FONT_DISPLAY,
  },
  divider: {
    width: "100%", height: 1, marginTop: "1.5rem", marginBottom: "1.5rem",
    background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)",
  },
  selectLabel: {
    fontFamily: FONT_DISPLAY, fontSize: "0.6rem", letterSpacing: "0.2em",
    color: "rgba(0,212,255,0.6)", marginBottom: "1.25rem",
  },
  modeBtns: { display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" },
  modeBtn: {
    display: "flex", flexDirection: "column", alignItems: "flex-start",
    padding: "1.25rem 1.5rem", width: "100%", cursor: "pointer",
    background: "rgba(0,100,200,0.1)", border: "1px solid rgba(0,212,255,0.25)",
    borderRadius: 14, color: "#e8f4ff", textAlign: "left", position: "relative",
    transition: "all 0.25s ease",
  },
  modeBtnAmb: {
    background: "rgba(200,30,30,0.1)",
    border: "1px solid rgba(255,59,59,0.25)",
  },
  modeBtnIcon: { fontSize: "1.5rem", marginBottom: "0.5rem" },
  modeBtnTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "0.8rem", fontWeight: 700,
    letterSpacing: "0.08em", marginBottom: "0.25rem", color: "#00d4ff",
  },
  modeBtnDesc: { fontSize: "0.72rem", color: "rgba(180,210,255,0.6)", lineHeight: 1.5 },
  modeBtnArrow: {
    position: "absolute", right: "1.25rem", top: "50%", transform: "translateY(-50%)",
    fontSize: "1.2rem", color: "rgba(0,212,255,0.5)",
  },
  backLink: {
    marginTop: "2rem", fontSize: "0.68rem", color: "rgba(0,212,255,0.5)",
    textDecoration: "none", letterSpacing: "0.08em",
  },

  /* ── Driver Mode ── */
  driverShell: {
    minHeight: "100vh", display: "flex", flexDirection: "column", gap: "0.75rem",
    padding: "0.75rem 1rem", position: "relative",
    background: "#020b18", fontFamily: FONT_BODY, color: "#e8f4ff",
  },
  driverShellAlert: {
    minHeight: "100vh", display: "flex", flexDirection: "column", gap: "0.75rem",
    padding: "0.75rem 1rem", position: "relative",
    background: "#120002", fontFamily: FONT_BODY, color: "#e8f4ff",
  },
  driverHeader: {
    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem",
    background: "rgba(4,20,45,0.7)", backdropFilter: "blur(16px)",
    border: "1px solid rgba(0,212,255,0.15)", borderRadius: 14, zIndex: 10,
  },
  driverTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "0.9rem", fontWeight: 700,
    letterSpacing: "0.06em", color: "#e8f4ff",
  },
  driverSub: { fontSize: "0.58rem", color: "rgba(0,212,255,0.5)", marginTop: 2, letterSpacing: "0.12em" },

  /* Emergency Overlay */
  emergencyOverlay: {
    position: "fixed", inset: 0, zIndex: 9999, display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "rgba(140,0,0,0.93)",
    backdropFilter: "blur(6px)",
    animation: "emergPulse 0.6s ease infinite",
  },
  emergencyContent: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
    position: "relative", zIndex: 2,
  },
  sirenIcons: { fontSize: "3rem", animation: "sirenFlash 0.4s ease infinite" },
  emergencyTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "clamp(1.4rem,5vw,2.5rem)", fontWeight: 900,
    letterSpacing: "0.06em", color: "#fff", textAlign: "center",
    textShadow: "0 0 40px rgba(255,80,80,0.8)",
    margin: 0,
  },
  emergencySubtitle: {
    fontFamily: FONT_DISPLAY, fontSize: "clamp(0.7rem,2.5vw,1rem)",
    color: "rgba(255,200,200,0.9)", letterSpacing: "0.12em", textAlign: "center",
  },
  emergencyPulseRing: {
    position: "absolute", width: 140, height: 140, borderRadius: "50%",
    border: "3px solid rgba(255,100,100,0.6)",
    animation: "pulsering 1.5s ease-out infinite",
  },
  dismissBtn: {
    marginTop: "2rem", padding: "1rem 2rem",
    background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: 999, color: "#fff", fontSize: "0.85rem", fontWeight: 700,
    cursor: "pointer", letterSpacing: "0.06em",
    fontFamily: FONT_DISPLAY, position: "relative", zIndex: 3,
  },

  /* Status Card */
  statusCard: {
    display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem",
    background: "rgba(4,20,45,0.7)", backdropFilter: "blur(16px)",
    border: "1px solid", borderRadius: 14, zIndex: 1,
  },
  statusDot: (alert: boolean) => ({
    width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
    background: alert ? "#ff3b3b" : "#00ff88",
    animation: alert ? "sirenFlash 0.5s ease infinite" : "greenPulse 1.5s ease infinite",
  }),
  statusTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.06em",
  },
  statusDesc: { fontSize: "0.65rem", color: "rgba(180,210,255,0.6)", marginTop: 3 },
  alertCount: { marginLeft: "auto", textAlign: "center" },
  alertCountNum: {
    fontFamily: FONT_DISPLAY, fontSize: "1.6rem", fontWeight: 900,
    color: "#00d4ff", textShadow: "0 0 12px rgba(0,212,255,0.6)",
  },
  alertCountLabel: { fontSize: "0.55rem", color: "rgba(0,212,255,0.5)", letterSpacing: "0.12em" },

  /* ETA Grid */
  etaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", zIndex: 1 },
  etaCard: {
    padding: "0.75rem", background: "rgba(4,20,45,0.65)", backdropFilter: "blur(10px)",
    border: "1px solid", borderRadius: 12, display: "flex", flexDirection: "column", gap: "0.4rem",
  },
  etaId: {
    fontFamily: FONT_DISPLAY, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em",
  },
  etaDot: { width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.15)" },
  etaLabel: { fontSize: "0.58rem", color: "rgba(180,210,255,0.5)", lineHeight: 1.4 },
  etaStatus: { fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.06em", fontFamily: FONT_DISPLAY },

  /* Test Alert */
  testBtn: {
    padding: "0.85rem 1.25rem", background: "rgba(0,212,255,0.08)",
    border: "1px solid rgba(0,212,255,0.3)", borderRadius: 12,
    color: "#00d4ff", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.08em", fontFamily: FONT_DISPLAY, zIndex: 1,
    transition: "all 0.2s ease",
  },

  /* Back Buttons */
  backBtn: {
    marginLeft: "auto", padding: "0.4rem 0.9rem",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "rgba(180,210,255,0.7)", fontSize: "0.62rem", cursor: "pointer",
    letterSpacing: "0.08em", fontFamily: FONT_DISPLAY,
  },
  backBtnFull: {
    padding: "0.75rem", background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
    color: "rgba(180,210,255,0.5)", fontSize: "0.65rem", cursor: "pointer",
    letterSpacing: "0.08em", fontFamily: FONT_DISPLAY, zIndex: 1,
  },
  clock: {
    fontFamily: FONT_DISPLAY, fontSize: "1rem", fontWeight: 700,
    color: "#00d4ff", textShadow: "0 0 10px rgba(0,212,255,0.5)",
    letterSpacing: "0.08em",
  },

  /* ── Ambulance Mode ── */
  ambShell: {
    minHeight: "100vh", display: "flex", flexDirection: "column", gap: "0.75rem",
    padding: "0.75rem 1rem", position: "relative",
    background: "#020b18", fontFamily: FONT_BODY, color: "#e8f4ff",
  },
  ambHeader: {
    display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem",
    background: "rgba(30,4,4,0.8)", backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,59,59,0.2)", borderRadius: 14,
  },
  sirenLight: {
    width: 20, height: 20, borderRadius: "50%",
    background: "#ff3b3b", animation: "sirenFlash 0.4s ease infinite",
    boxShadow: "0 0 12px rgba(255,59,59,0.8)",
    flexShrink: 0,
  },
  ambTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "0.9rem", fontWeight: 700,
    letterSpacing: "0.06em", color: "#ff3b3b",
  },
  ambSub: { fontSize: "0.58rem", color: "rgba(255,100,100,0.5)", marginTop: 2, letterSpacing: "0.12em" },

  /* Beacon */
  beaconCard: {
    display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem",
    background: "rgba(30,4,4,0.5)", backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,59,59,0.2)", borderRadius: 16,
  },
  beaconPulse: { position: "relative", width: 80, height: 80, flexShrink: 0 },
  beaconCore: {
    position: "absolute", inset: "50%", transform: "translate(-50%,-50%)",
    fontSize: "2rem", width: 48, height: 48,
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2,
  },
  beaconRing1: {
    position: "absolute", inset: 0, borderRadius: "50%",
    border: "2px solid rgba(255,59,59,0.6)",
    animation: "pulsering 2s ease infinite",
  },
  beaconRing2: {
    position: "absolute", inset: 0, borderRadius: "50%",
    border: "2px solid rgba(255,59,59,0.4)",
    animation: "pulsering 2s ease infinite 0.6s",
  },
  beaconRing3: {
    position: "absolute", inset: 0, borderRadius: "50%",
    border: "2px solid rgba(255,59,59,0.2)",
    animation: "pulsering 2s ease infinite 1.2s",
  },
  beaconTitle: {
    fontFamily: FONT_DISPLAY, fontSize: "0.85rem", fontWeight: 700,
    letterSpacing: "0.08em", color: "#ff3b3b", marginBottom: "0.3rem",
  },
  beaconSub: { fontSize: "0.68rem", color: "rgba(255,100,100,0.6)" },
  coordsText: {
    fontSize: "0.6rem", color: "rgba(180,210,255,0.5)", marginTop: "0.3rem",
    fontFamily: FONT_DISPLAY, letterSpacing: "0.04em",
  },

  /* Corridor Status */
  corridorLabel: {
    fontFamily: FONT_DISPLAY, fontSize: "0.58rem", letterSpacing: "0.2em",
    color: "rgba(0,212,255,0.5)", padding: "0 0.25rem",
  },
  corridorGrid: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  corridorCard: {
    padding: "0.8rem 1rem", background: "rgba(4,20,45,0.55)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(0,212,255,0.12)", borderRadius: 12,
    display: "flex", flexDirection: "column", gap: "0.4rem",
  },
  corrId: {
    fontFamily: FONT_DISPLAY, fontSize: "0.72rem", fontWeight: 700,
    color: "#00d4ff", letterSpacing: "0.06em",
  },
  corrEta: { fontSize: "0.62rem", color: "rgba(0,212,255,0.5)" },
  corrLabel: { fontSize: "0.62rem", color: "rgba(180,210,255,0.5)" },
  corrBar: { height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" },
  corrBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #00d4ff, #00ff88)",
    borderRadius: 3,
  },
};
