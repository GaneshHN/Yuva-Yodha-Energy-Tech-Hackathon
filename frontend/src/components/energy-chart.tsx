"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { EnergyPoint } from "@/lib/api";

const chartConfig = {
  energy_kwh: { label: "Energy use", color: "var(--chart-1)" },
} satisfies ChartConfig;

type EnergyChartProps = { points: EnergyPoint[]; loading: boolean };

export function EnergyChart({ points, loading }: EnergyChartProps) {
  const chartData = points.map((point) => ({
    ...point,
    time: new Date(point.timestamp).toLocaleTimeString("en-US", { hour: "numeric" }),
  }));

  if (loading) return <div className="chart-state" role="status">Loading measured energy…</div>;
  if (!points.length) return <div className="chart-state"><span className="empty-wave" aria-hidden="true"><span /><span /><span /><span /><span /></span><strong>No readings in this period</strong><span>Energy readings appear here as your machines report data.</span></div>;

  return (
    <ChartContainer config={chartConfig} className="h-[280px] min-h-[280px] w-full">
      <AreaChart data={chartData} margin={{ left: -12, right: 8, top: 8, bottom: 0 }} accessibilityLayer>
        <defs><linearGradient id="energyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-energy_kwh)" stopOpacity={0.24} /><stop offset="100%" stopColor="var(--color-energy_kwh)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
        <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={12} minTickGap={30} />
        <YAxis tickLine={false} axisLine={false} tickMargin={10} width={48} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.time ?? ""} />} />
        <Area type="monotone" dataKey="energy_kwh" stroke="var(--color-energy_kwh)" strokeWidth={2.5} fill="url(#energyFill)" activeDot={{ r: 4, fill: "var(--color-energy_kwh)", stroke: "var(--background)", strokeWidth: 2 }} />
      </AreaChart>
    </ChartContainer>
  );
}
