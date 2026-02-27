import webpush from "web-push";

// Keys generated from `bunx web-push generate-vapid-keys`
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BBSH6Rk2v9zN9mO-F4Fp_B9_E0E_4F_N0_D-Fp-XqE2N_X_C_c_Z_q_Q_H-N_K_-_0_9_E_q_y_v_6_Y_";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "pw0_W_x_Z_X_c-x_A_b_x_y_H_k_z_B_i_R_z_u_e_Q_3_";

// Configure web-push
try {
  webpush.setVapidDetails(
    "mailto:admin@goldenhour.local",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn("Failed to set VAPID details. Push might not work.", e);
}

// In-memory subscription store (for demo purposes)
interface DriverSub {
  lat: number;
  lng: number;
  sub: webpush.PushSubscription;
}

export const activeSubscriptions: DriverSub[] = [];

/**
 * Sends a push notification to drivers near a given coordinate
 */
export async function sendGeofencedAlert(
  ambulanceLat: number,
  ambulanceLng: number,
  title: string,
  body: string
) {
  const radiusMeters = 500;
  let sentCount = 0;

  // Simple haversine / Pythagoras (rough given local distance)
  for (const driver of activeSubscriptions) {
    const pLat = driver.lat;
    const pLng = driver.lng;

    // Convert lat/lng diff to approximate meters
    // 1 deg lat ~= 111km. At equator, 1 deg lng ~= 111km.
    const dLat = (pLat - ambulanceLat) * 111000;
    const dLng = (pLng - ambulanceLng) * 111000 * Math.cos(ambulanceLat * Math.PI / 180);
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);

    if (distance <= radiusMeters) {
      try {
        await webpush.sendNotification(
          driver.sub,
          JSON.stringify({ title, body })
        );
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid
        }
      }
    }
  }

  // Also emit to socket so the Dashboard can see how many alerts were sent
  const io = (global as any).io;
  if (io) {
    io.emit("alert_sent", { count: sentCount, radius: radiusMeters });
  }

  return sentCount;
}
