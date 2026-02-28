"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

interface Props {
  active: boolean;
}

const INTERSECTIONS = [
  { id: "INT-1", etaOffset: 0 },
  { id: "INT-2", etaOffset: 8 },
  { id: "INT-3", etaOffset: 18 },
  { id: "INT-4", etaOffset: 28 },
];

export default function ETACountdown({ active }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [activatedAt, setActivatedAt] = useState(0);

  useEffect(() => {
    if (active) {
      const now = Date.now();
      requestAnimationFrame(() => {
        setActivatedAt(now);
        setElapsed(0);
      });
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activatedAt) / 1000));
    }, 500);
    return () => clearInterval(interval);
  }, [active, activatedAt]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {INTERSECTIONS.map((int) => {
        const remaining = Math.max(0, int.etaOffset - elapsed);
        const isGreen = active && remaining === 0;
        const isPending = active && remaining > 0;

        let statusText = "STANDBY";
        let statusColor = "var(--text-muted)";
        let leftBorder = "rgba(255,255,255,0.1)";

        if (isGreen) {
          statusText = "GREEN ✓";
          statusColor = "var(--neon-green)";
          leftBorder = "var(--neon-green)";
        } else if (isPending) {
          statusText = `GREEN in ${remaining}s`;
          statusColor = "var(--accent)";
          leftBorder = "var(--accent)";
        }

        return (
          <div
            key={int.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.45rem 0.75rem",
              backgroundColor: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              borderLeft: `3px solid ${leftBorder}`,
              transition: "all 0.3s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Timer size={11} color={statusColor} />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, opacity: 0.85 }}>
                {int.id}
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: statusColor }}>
              {statusText}
            </span>
          </div>
        );
      })}
    </div>
  );
}
