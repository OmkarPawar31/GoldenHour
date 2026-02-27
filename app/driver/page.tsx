"use client";

import { useState, useEffect } from "react";
import { io as socketIO } from "socket.io-client";

// Very simple public key for the browser to register Push
const PUBLIC_VAPID_KEY = "BBSH6Rk2v9zN9mO-F4Fp_B9_E0E_4F_N0_D-Fp-XqE2N_X_C_c_Z_q_Q_H-N_K_-_0_9_E_q_y_v_6_Y_";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function DriverApp() {
  const [mode, setMode] = useState<"driver" | "ambulance" | null>(null);
  const [status, setStatus] = useState("Idle");
  const [alertActive, setAlertActive] = useState(false);

  // Try subscribing to Push
  async function subscribeToPush() {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
        });

        // Get location and send to backend
        navigator.geolocation.getCurrentPosition(async (pos) => {
          await fetch("/api/driver/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sub: subscription,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          setStatus("Subscribed for Alerts ✅");
        });
      } catch (err: any) {
        console.error("Push subscription failed", err);
        setStatus(`Push Error: ${err.message}`);
      }
    } else {
      setStatus("Push logic not supported on this browser.");
    }
  }

  // Socket listener for real-time overlay
  useEffect(() => {
    if (mode === "driver") {
      const socket = socketIO({ path: "/socket.io" });
      socket.on("detection_event", () => {
        // Just trigger overlay for demo, in real life you check distance
        setAlertActive(true);
        // Play TTS
        if ("speechSynthesis" in window) {
          const msg = new SpeechSynthesisUtterance("Emergency vehicle approaching. Please move to the left lane immediately.");
          window.speechSynthesis.speak(msg);
        }
        // Vibrate
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      });
      return () => { socket.disconnect(); };
    }
  }, [mode]);

  // Ambulance logic (GPS beacon)
  useEffect(() => {
    if (mode === "ambulance") {
      const interval = setInterval(() => {
        navigator.geolocation.getCurrentPosition((pos) => {
          fetch("/api/beacon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });
          setStatus(`Beacon sent: ${new Date().toLocaleTimeString()}`);
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [mode]);

  if (!mode) {
    return (
      <div style={S.page}>
        <h1>🚑 Green Corridor App</h1>
        <p>Select your mode:</p>
        <button style={S.btnBlue} onClick={() => { setMode("driver"); subscribeToPush(); }}>🚗 Driver Mode</button>
        <button style={S.btnRed} onClick={() => setMode("ambulance")}>🚑 Ambulance Mode</button>
      </div>
    );
  }

  return (
    <div style={{ ...S.page, ...(alertActive && S.pulsingBg) }}>
      {alertActive && (
        <div style={S.overlay}>
          <h1 style={S.flashText}>🚨 AMBULANCE APPROACHING 🚨<br />MOVE LEFT</h1>
          <button style={S.btnDark} onClick={() => setAlertActive(false)}>Dismiss</button>
        </div>
      )}
      <h1>{mode === "driver" ? "🚗 Driver Mode" : "🚑 Ambulance Beacon"}</h1>
      <p>Status: {status}</p>

      {mode === "driver" && (
        <div style={S.mapDemo}>
          [Map Placeholder]
        </div>
      )}

      {mode === "ambulance" && (
        <div style={S.mapDemo}>
          [Upcoming Corridors View Placeholder]
        </div>
      )}

      <button style={S.btnDark} onClick={() => setMode(null)}>🔙 Back</button>
    </div>
  );
}

const S = {
  page: { padding: 20, fontFamily: "sans-serif", textAlign: "center" as const, minHeight: "100vh" },
  btnBlue: { padding: "15px 30px", fontSize: 18, background: "#1e88e5", color: "#fff", border: "none", borderRadius: 8, margin: 10, cursor: "pointer" },
  btnRed: { padding: "15px 30px", fontSize: 18, background: "#e53935", color: "#fff", border: "none", borderRadius: 8, margin: 10, cursor: "pointer" },
  btnDark: { padding: "10px 20px", fontSize: 16, background: "#333", color: "#fff", border: "none", borderRadius: 8, margin: 10, cursor: "pointer" },
  mapDemo: { margin: "20px auto", width: "90%", height: 300, background: "#eee", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" },
  pulsingBg: { animation: "pulseBg 1s infinite alternate" },
  overlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,0,0,0.9)", zIndex: 999, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center" },
  flashText: { color: "#fff", fontSize: "2rem", fontWeight: "bold", textAlign: "center" as const, marginBottom: 40, animation: "flash 1s infinite" }
};
