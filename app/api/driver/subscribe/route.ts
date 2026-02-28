import { NextRequest, NextResponse } from "next/server";
import { activeSubscriptions } from "../../../../lib/push";

export async function POST(req: NextRequest) {
  try {
    const { sub, lat, lng } = await req.json();

    if (!sub || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert subscription into our in-memory array (demo only)
    const existingIdx = activeSubscriptions.findIndex((s) => s.sub.endpoint === sub.endpoint);
    if (existingIdx >= 0) {
      activeSubscriptions[existingIdx] = { sub, lat, lng };
    } else {
      activeSubscriptions.push({ sub, lat, lng });
    }

    console.log(`Driver subscribed at (${lat}, ${lng}). Total active: ${activeSubscriptions.length}`);
    return NextResponse.json({ success: true, count: activeSubscriptions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
