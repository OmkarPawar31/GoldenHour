import { NextRequest, NextResponse } from "next/server";
import { sendGeofencedAlert } from "../../../lib/push";

let lastBeacon: { lat: number; lng: number; receivedAt: number } | null = null;

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json();

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    lastBeacon = { lat, lng, receivedAt: Date.now() };

    // Broadcast beacon update to Dashboard mapping
    const io = (global as any).io;
    if (io) {
      io.emit("beacon_update", lastBeacon);
    }

    // In a real system, we cross-reference this ongoing beacon with the active corridor 
    // to dynamically push "Safe to Merge" alerts as it passes drivers.
    // For demo purposes, we will trigger an alert right now if it gets close.
    await sendGeofencedAlert(
      lat,
      lng,
      "Ambulance Location Update",
      "Emergency Vehicle is nearby. Stay left."
    );

    return NextResponse.json({ success: true, lastBeacon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ lastBeacon });
}
