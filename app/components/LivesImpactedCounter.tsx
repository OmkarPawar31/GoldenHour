"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";

interface Props {
  corridorsCleared: number;
}

export default function LivesImpactedCounter({ corridorsCleared }: Props) {
  const target = Math.round(corridorsCleared * 0.05 * 100) / 100;
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 800;
    const start = display;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (target - start) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div style={{
      textAlign: "center",
      padding: "1rem",
      backgroundColor: "rgba(255,107,0,0.05)",
      borderRadius: 12,
      border: "1px solid rgba(255,107,0,0.18)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
        <Heart size={12} color="var(--accent)" />
        <span style={{
          fontSize: "0.62rem",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
          fontFamily: "var(--font-display)",
        }}>
          Estimated Lives Impacted
        </span>
      </div>
      <div style={{
        fontSize: "2rem",
        fontWeight: 900,
        color: "var(--accent)",
        textShadow: "0 0 24px rgba(255,107,0,0.5)",
        fontFamily: "var(--font-display)",
        letterSpacing: "0.02em",
      }}>
        {display.toFixed(1)}
      </div>
    </div>
  );
}
