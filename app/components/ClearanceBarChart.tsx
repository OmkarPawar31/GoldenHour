"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const INTERSECTION_DATA = [
  { name: "INT-1", avgClearance: 2.8 },
  { name: "INT-2", avgClearance: 4.1 },
  { name: "INT-3", avgClearance: 5.6 },
  { name: "INT-4", avgClearance: 3.3 },
];

// Orange gradient: brightest at lowest clearance
const BAR_OPACITIES = ["ff", "cc", "99", "bb"];

export default function ClearanceBarChart() {
  return (
    <div style={{ width: "100%", height: 130 }}>
      <ResponsiveContainer>
        <BarChart
          data={INTERSECTION_DATA}
          margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
            stroke="rgba(255,255,255,0.06)"
            tickLine={false}
            label={{
              value: "sec",
              angle: -90,
              position: "insideLeft",
              fill: "rgba(255,255,255,0.2)",
              fontSize: 9,
            }}
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
            cursor={{ fill: "rgba(255,107,0,0.05)" }}
            formatter={(value: unknown) => [`${value}s`, "Avg Clearance"]}
          />
          <Bar dataKey="avgClearance" radius={[4, 4, 0, 0]}>
            {INTERSECTION_DATA.map((_, idx) => (
              <Cell key={idx} fill={`#FF6B00${BAR_OPACITIES[idx]}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
