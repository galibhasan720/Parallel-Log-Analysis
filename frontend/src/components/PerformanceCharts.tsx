import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  backendComparison,
  ioProfile,
  strong100,
  strong500,
  weakScaling,
} from "../data/measuredShowcase";
import { chartTooltipStyle, series, viz } from "../data/vizPalette";
import { InfoTip, SegmentedControl, SourceLabel } from "./ui";

type Tab = "strong" | "backend" | "weak" | "breakdown";

export function PerformanceCharts({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<Tab>("strong");
  const strongData = strong100.map((row, index) => ({
    workers: row.workers,
    "100 MB": row.seconds,
    "500 MB": strong500[index]?.seconds,
  }));

  return (
    <div className={`performance-module ${compact ? "compact" : ""}`}>
      <div className="module-toolbar">
        <SegmentedControl
          ariaLabel="Performance view"
          value={tab}
          onChange={(value) => setTab(value as Tab)}
          options={[
            { value: "strong", label: "Strong scaling" },
            { value: "backend", label: "Backends" },
            { value: "weak", label: "Weak scaling" },
            { value: "breakdown", label: "CPU vs I/O" },
          ]}
        />
        <SourceLabel />
      </div>

      <div className="performance-content">
        <div className="chart-wrap" aria-label="Measured performance visualization" key={tab}>
          {tab === "strong" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={strongData} margin={{ top: 10, right: 18, bottom: 4, left: -12 }}>
                <defs>
                  <linearGradient id="lineTeal" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={viz.teal} />
                    <stop offset="100%" stopColor={viz.sky} />
                  </linearGradient>
                  <linearGradient id="lineAzure" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={viz.azure} />
                    <stop offset="100%" stopColor={viz.indigo} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={viz.grid} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="workers" stroke={viz.axis} tickLine={false} axisLine={false} />
                <YAxis
                  stroke={viz.axis}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "seconds", angle: -90, position: "insideLeft", fill: viz.axis }}
                />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="100 MB"
                  stroke="url(#lineTeal)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: viz.teal, stroke: "#0b1220", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: viz.sky }}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="500 MB"
                  stroke="url(#lineAzure)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: viz.azure, stroke: "#0b1220", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: viz.indigo }}
                  animationDuration={1400}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
          {tab === "backend" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={backendComparison} margin={{ top: 10, right: 18, bottom: 4, left: -12 }}>
                <defs>
                  <linearGradient id="barBackend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={viz.azure} stopOpacity={1} />
                    <stop offset="100%" stopColor={viz.indigo} stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={viz.grid} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="backend" stroke={viz.axis} tickLine={false} axisLine={false} />
                <YAxis stroke={viz.axis} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar
                  dataKey="seconds"
                  name="Execution time (s)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1100}
                >
                  {backendComparison.map((_, index) => (
                    <Cell key={backendComparison[index].backend} fill={series[index % series.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
          {tab === "weak" ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weakScaling} margin={{ top: 10, right: 18, bottom: 4, left: -12 }}>
                <CartesianGrid stroke={viz.grid} strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="dataset" stroke={viz.axis} tickLine={false} axisLine={false} />
                <YAxis stroke={viz.axis} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="seconds"
                  name="Wall-clock (s)"
                  stroke={viz.amber}
                  strokeWidth={3}
                  dot={{ r: 5, fill: viz.amber, stroke: "#0b1220", strokeWidth: 2 }}
                  activeDot={{ r: 7, fill: "#FFD060" }}
                  animationDuration={1200}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
          {tab === "breakdown" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ioProfile} layout="vertical" margin={{ top: 10, right: 28, bottom: 4, left: 18 }}>
                <CartesianGrid stroke={viz.grid} strokeDasharray="3 5" horizontal={false} />
                <XAxis type="number" stroke={viz.axis} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={105} stroke={viz.axis} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="seconds" name="Seconds" radius={[0, 8, 8, 0]} animationDuration={1100}>
                  {ioProfile.map((_, index) => (
                    <Cell key={ioProfile[index].name} fill={[viz.teal, viz.azure, viz.coral][index] ?? viz.mint} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>

        <aside className="chart-summary" key={`summary-${tab}`}>
          {tab === "strong" ? (
            <>
              <div>
                <span>Best 100 MB</span>
                <strong>8 workers</strong>
                <small>3.899s · 1.95×</small>
              </div>
              <div>
                <span>Best 500 MB</span>
                <strong>12 workers</strong>
                <small>17.287s · 2.53×</small>
              </div>
              <p>
                More workers help, but process startup and the hybrid P/E architecture prevent linear scaling.
              </p>
            </>
          ) : null}
          {tab === "backend" ? (
            <>
              <div>
                <span>Lowest 10 MB time</span>
                <strong>OpenMP</strong>
                <small>0.516s · 8 threads</small>
              </div>
              <p>MPI includes rank-launch overhead; its slower small-file time does not mean the model is incorrect.</p>
            </>
          ) : null}
          {tab === "weak" ? (
            <>
              <div>
                <span>Experiment</span>
                <strong>~50 MB / worker</strong>
                <small>1 → 4 workers</small>
              </div>
              <p>Weak efficiency drops on this laptop as worker and data pressure increase.</p>
            </>
          ) : null}
          {tab === "breakdown" ? (
            <>
              <div>
                <span>Classification</span>
                <strong>CPU-bound</strong>
                <small>0.048s read vs 8.955s full</small>
              </div>
              <p>
                Parsing and histogram updates dominate disk I/O.
                <InfoTip text="Measured on the 100 MB synthetic dataset." />
              </p>
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
