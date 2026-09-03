"use client";

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { getDayLabel, isToday } from "@/utils/date";
import { cn } from "@/lib/utils";

interface ActivityChartProps {
  data: { date: string; steps: number }[];
  goal?: number;
}

export function ActivityChart({ data, goal }: ActivityChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: getDayLabel(d.date).slice(0, 3),
    isCurrent: isToday(d.date),
  }));

  return (
    <Card className="p-4">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={({ x, y, payload, index }) => {
                const item = chartData[index];
                return (
                  <g transform={`translate(${x},${y})`}>
                    {item?.isCurrent ? (
                      <foreignObject x={-20} y={0} width={40} height={24}>
                        <div className="flex justify-center">
                          <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                            {item.label}
                          </span>
                        </div>
                      </foreignObject>
                    ) : (
                      <text y={12} textAnchor="middle" fill="var(--muted)" fontSize={10}>
                        {payload.value}
                      </text>
                    )}
                  </g>
                );
              }}
            />
            <YAxis hide domain={[0, "auto"]} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value) => [Number(value ?? 0).toLocaleString(), "Steps"]}
            />
            {goal && (
              <Line
                type="monotone"
                dataKey={() => goal}
                stroke="var(--muted)"
                strokeDasharray="4 4"
                dot={false}
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="steps"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={({ cx, cy, index }) => {
                const item = chartData[index];
                if (!item?.isCurrent) return <circle key={index} cx={cx} cy={cy} r={0} />;
                return (
                  <circle key={index} cx={cx} cy={cy} r={6} fill="var(--accent)" stroke="var(--background)" strokeWidth={2} />
                );
              }}
              activeDot={{ r: 5, fill: "var(--accent)" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
