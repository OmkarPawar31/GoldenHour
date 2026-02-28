import { NextRequest, NextResponse } from "next/server";
import { sendGeofencedAlert } from "../../../lib/push";

// ── Types ────────────────────────────────────────────────────────────────
interface Detection {
  zone: string;
  confidence: number;
  timestamp: number;
  receivedAt: number;
  trackId?: number;
  direction?: string;
  velocity?: { dx: number; dy: number };
}

interface SignalState {
  intersectionId: string;
  state: "NORMAL_RED" | "CORRIDOR_GREEN" | "PRE_CLEAR_ORANGE" | "COOLDOWN";
  activatedAt: number | null;
  eta: number;
  revertAfter: number;
}

interface Incident {
  id: number;
  trackId: number;
  zone: string;
  confidence: number;
  timestamp: number;
  detectedAt: number;
  direction: string;
  signalSwitches: { intersectionId: string; switchedAt: number; revertedAt: number | null }[];
  corridorClearedAt: number | null;
  timeSavedEstimate: number;
  mode: "vision" | "gps_fallback";
}

// ── In-memory stores ─────────────────────────────────────────────────────
let latestDetection: Detection | null = null;

const incidents: Incident[] = [];
let incidentCounter = 0;

const signalStates: SignalState[] = [
  { intersectionId: "INT-1", state: "NORMAL_RED", activatedAt: null, eta: 0, revertAfter: 0 },
  { intersectionId: "INT-2", state: "NORMAL_RED", activatedAt: null, eta: 0, revertAfter: 0 },
  { intersectionId: "INT-3", state: "NORMAL_RED", activatedAt: null, eta: 0, revertAfter: 0 },
  { intersectionId: "INT-4", state: "NORMAL_RED", activatedAt: null, eta: 0, revertAfter: 0 },
];

// ETA offsets for each intersection (seconds from detection)
const ETA_OFFSETS = [0, 8, 18, 28];
const CORRIDOR_DURATION_MS = 5_000;

// ── Signal cascade logic ─────────────────────────────────────────────────
function activateCorridor(detection: Detection) {
  const now = Date.now();

  // Create incident record
  incidentCounter++;
  const incident: Incident = {
    id: incidentCounter,
    trackId: detection.trackId ?? 0,
    zone: detection.zone,
    confidence: detection.confidence,
    timestamp: detection.timestamp,
    detectedAt: now,
    direction: detection.direction ?? "UNKNOWN",
    signalSwitches: [],
    corridorClearedAt: null,
    timeSavedEstimate: Math.round(Math.random() * 30 + 15), // 15-45s saved
    mode: "vision",
  };

  // Activate signals in sequence based on ETA offsets
  signalStates.forEach((signal, idx) => {
    const activateAt = now + ETA_OFFSETS[idx] * 1000;
    const revertAt = activateAt + CORRIDOR_DURATION_MS;

    signal.state = idx === 0 ? "CORRIDOR_GREEN" : "PRE_CLEAR_ORANGE";
    signal.activatedAt = activateAt;
    signal.eta = ETA_OFFSETS[idx];
    signal.revertAfter = revertAt;

    incident.signalSwitches.push({
      intersectionId: signal.intersectionId,
      switchedAt: activateAt,
      revertedAt: revertAt,
    });

    // Schedule state transitions
    if (idx > 0) {
      setTimeout(() => {
        signal.state = "CORRIDOR_GREEN";
      }, ETA_OFFSETS[idx] * 1000);
    }

    setTimeout(() => {
      signal.state = "COOLDOWN";
      setTimeout(() => {
        signal.state = "NORMAL_RED";
        signal.activatedAt = null;
      }, 2000);
    }, ETA_OFFSETS[idx] * 1000 + CORRIDOR_DURATION_MS);
  });

  // Mark corridor cleared after last intersection reverts
  const totalDuration = (ETA_OFFSETS[ETA_OFFSETS.length - 1] * 1000) + CORRIDOR_DURATION_MS + 2000;
  setTimeout(() => {
    incident.corridorClearedAt = Date.now();
  }, totalDuration);

  incidents.unshift(incident);
  // Keep last 200 incidents
  if (incidents.length > 200) incidents.length = 200;

  // Emit to socket if available in global context
  const io = (global as any).io;
  if (io) {
    io.emit("detection_event", { detection: incident });
    io.emit("signal_update", { signals: signalStates });
  }
}

// ── POST /api/detection ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { zone, confidence, timestamp, trackId, direction, velocity } = body;

    latestDetection = {
      zone: zone ?? "UNKNOWN",
      confidence: confidence ?? 0,
      timestamp: timestamp ?? 0,
      receivedAt: Date.now(),
      trackId: trackId ?? 0,
      direction: direction ?? "UNKNOWN",
      velocity: velocity ?? { dx: 0, dy: 0 },
    };

    // Trigger corridor activation
    activateCorridor(latestDetection);

    // Mock Intersection 1 coordinate (demo city center)
    const MOCK_INT1_LAT = 19.043;
    const MOCK_INT1_LNG = 72.875;

    // Send background push notification to all subscribed drivers near INT1
    sendGeofencedAlert(
      MOCK_INT1_LAT,
      MOCK_INT1_LNG,
      "🚨 AMBULANCE APPROACHING",
      "Move to the left lane immediately."
    ).catch((err) => console.error("Web Push Error", err));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}

// ── GET /api/detection ───────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    detection: latestDetection,
    signals: signalStates,
    recentIncidents: incidents.slice(0, 50),
    stats: {
      totalCorridorsCleared: incidents.filter((i) => i.corridorClearedAt).length,
      totalIncidents: incidents.length,
      avgTimeSaved:
        incidents.length > 0
          ? Math.round(incidents.reduce((s, i) => s + i.timeSavedEstimate, 0) / incidents.length)
          : 0,
    },
  });
}
