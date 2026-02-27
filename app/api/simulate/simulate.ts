import axios from 'axios';

const API_URL = 'http://localhost:3000/api/detection';

const intersections = [
  { zone: "INT-1 (Main St)", confidence: 0.95, direction: "NORTH", timestamp: 5.2 },
  { zone: "INT-2 (Broad St)", confidence: 0.88, direction: "NORTH", timestamp: 12.1 },
  { zone: "INT-3 (Oak Ave)", confidence: 0.92, direction: "EAST", timestamp: 18.5 },
  { zone: "INT-4 (Hospital Rd)", confidence: 0.99, direction: "EAST", timestamp: 25.0 }
];

const SECOND = 1000;

async function simulate() {
  console.log("🚑 Starting Multi-Intersection Simulation...");
  let trackId = Math.floor(Math.random() * 1000) + 100;

  for (let i = 0; i < intersections.length; i++) {
    const data = intersections[i];

    console.log(`\n⏳ Driving to ${data.zone}...`);
    // Wait 5-8 seconds between intersections
    await new Promise(r => setTimeout(r, Math.random() * 3000 + 5000));

    console.log(`🚨 AMBULANCE DETECTED AT ${data.zone}! Sending event...`);

    try {
      await axios.post(API_URL, {
        zone: data.zone,
        confidence: data.confidence,
        timestamp: data.timestamp,
        trackId: trackId,
        direction: data.direction,
        velocity: { dx: Math.random() * 5 + 2, dy: Math.random() * -5 - 2 }
      });
      console.log(`✅ Event accepted by backend for ${data.zone}`);
    } catch (err: any) {
      console.error(`❌ Event failed: ${err.message}`);
    }
  }

  console.log("\n🏁 Simulation Complete (Ambulance Reached Dest) 🏁");
}

simulate();
