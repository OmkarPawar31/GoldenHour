"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

function generateHourlyData() {
  const now = new Date();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 3600_000);
    const label = hour.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const h = hour.getHours();
    const base =
      (h >= 8 && h <= 10) || (h >= 17 && h <= 19)
        ? 12 + Math.floor(Math.random() * 8)
        : 2 + Math.floor(Math.random() * 5);
    data.push({ time: label, activations: base });
  }
  return data;
}

interface Props {
  liveBump?: number;
}

export default function CorridorLineChart({ liveBump = 0 }: Props) {
  const data = generateHourlyData();
  if (data.length > 0) {
    data[data.length - 1].activations += liveBump;
  }

  return (
    <div style={{ width: "100%", height: 130 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="orangeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            interval={5}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0F1016",
              border: "1px solid rgba(255,107,0,0.25)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 11,
            }}
            itemStyle={{ color: "#FF6B00" }}
            cursor={{ stroke: "rgba(255,107,0,0.3)" }}
          />
          <Area
            type="monotone"
            dataKey="activations"
            stroke="#FF6B00"
            strokeWidth={2}
            fill="url(#orangeGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#FF6B00", stroke: "rgba(255,107,0,0.4)", strokeWidth: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
