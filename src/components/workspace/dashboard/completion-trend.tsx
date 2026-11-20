import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { DashboardType } from "@/types/api.type";

const config = {
  count: { label: "Completed", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

/** Tasks finished per day over the last two weeks. */
const CompletionTrend = ({ data, isLoading }: { data?: DashboardType; isLoading: boolean }) => {
  const days = (data?.completedByDay ?? []).map((d) => ({
    ...d,
    label: format(new Date(`${d.date}T12:00:00`), "EEE d"),
  }));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const lastWeek = days.slice(0, 7).reduce((s, d) => s + d.count, 0);
  const thisWeek = days.slice(7).reduce((s, d) => s + d.count, 0);
  const change = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Completed tasks</CardTitle>
          <p className="text-xs text-muted-foreground">Last 14 days · {total} done</p>
        </div>
        {change !== null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${change >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-500"}`}
            title="Last 7 days compared with the 7 before"
          >
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous week
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] animate-pulse rounded-lg bg-muted/50" />
        ) : (
          <ChartContainer config={config} className="h-[200px] w-full">
            <BarChart data={days} margin={{ left: -24, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary-2))" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} fontSize={11} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent hideIndicator />} />
              <Bar dataKey="count" fill="url(#trendFill)" radius={[6, 6, 2, 2]} maxBarSize={28} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default CompletionTrend;
