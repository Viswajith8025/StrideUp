"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDayLabel, isToday } from "@/utils/date";

interface ActivityChartProps {
  data: { date: string; steps: number }[];
  goal?: number;
}

export function ActivityChart({ data, goal }: ActivityChartProps) {
  const [showTable, setShowTable] = useState(false);
  const chartData = data.map((d) => ({
    ...d,
    label: getDayLabel(d.date).slice(0, 3),
    isCurrent: isToday(d.date),
  }));

  const summary = chartData.reduce((sum, row) => sum + row.steps, 0);

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Activity chart</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="sr-only focus:not-sr-only focus:absolute focus:right-4 focus:top-4 focus:z-10"
          onClick={() => setShowTable((value) => !value)}
          aria-pressed={showTable}
        >
          {showTable ? "Show chart" : "Show data table"}
        </Button>
      </div>

      <div
        className="h-40 w-full"
        role="img"
        aria-label={`Step activity chart. ${chartData.length} days shown, ${summary.toLocaleString()} total steps.`}
        hidden={showTable}
      >
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

      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Step activity data table">
            <caption className="sr-only">Daily step counts for the selected period</caption>
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th scope="col" className="py-2 pr-4">Date</th>
                <th scope="col" className="py-2">Steps</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.date} className="border-b border-border/60">
                  <td className="py-2 pr-4">{row.date}</td>
                  <td className="py-2 tabular-nums">{row.steps.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
