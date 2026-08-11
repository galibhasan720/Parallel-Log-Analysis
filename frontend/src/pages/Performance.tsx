import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { PerformanceCharts } from "../components/PerformanceCharts";
import { PageHeader, Panel, SourceLabel, StatusBadge } from "../components/ui";
import {
  backendComparison,
  strong100,
  strong500,
  weakScaling,
} from "../data/measuredShowcase";

export function PerformancePage() {
  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Measured on Intel i5-1235U"
        title="Performance"
        description="Strong scaling, backend comparison, weak scaling, and CPU-versus-I/O evidence from the local HPC runs."
        actions={
          <Link className="button secondary" to="/benchmark">
            <Icon name="benchmark" size={16} /> Live benchmark
          </Link>
        }
      />

      <div className="metric-grid">
        <article className="metric-card tone-success">
          <div className="metric-label">Best 100 MB</div>
          <div className="metric-value">1.95×</div>
          <div className="metric-footer">
            <span>8 workers · 3.899s</span>
            <SourceLabel />
          </div>
        </article>
        <article className="metric-card tone-cyan">
          <div className="metric-label">Best 500 MB</div>
          <div className="metric-value">2.53×</div>
          <div className="metric-footer">
            <span>12 workers · 17.287s</span>
            <SourceLabel />
          </div>
        </article>
        <article className="metric-card tone-primary">
          <div className="metric-label">Best 10 MB backend</div>
          <div className="metric-value">OpenMP</div>
          <div className="metric-footer">
            <span>0.516s · 8 threads</span>
            <SourceLabel />
          </div>
        </article>
        <article className="metric-card tone-warning">
          <div className="metric-label">Workload class</div>
          <div className="metric-value">CPU-bound</div>
          <div className="metric-footer">
            <span>0.048s read vs 8.955s full</span>
            <SourceLabel />
          </div>
        </article>
      </div>

      <div className="truth-notice">
        <Icon name="performance" />
        <div>
          <strong>All charts cite measured laptop runs.</strong>
          <span>
            Numbers come from docs/PERFORMANCE.md on Intel i5-1235U. Live ProcessPool matrices belong on Benchmarks.
          </span>
        </div>
      </div>

      <Panel
        title="Parallel Performance"
        description="Use the tabs to switch between strong scaling, backends, weak scaling, and the I/O breakdown."
      >
        <PerformanceCharts />
      </Panel>

      <div className="dashboard-grid equal">
        <Panel title="100 MB strong scaling" description="ProcessPool static schedule.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workers</th>
                  <th>Seconds</th>
                  <th>Speedup</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {strong100.map((row) => (
                  <tr key={row.workers}>
                    <td>{row.workers}</td>
                    <td className="mono">{row.seconds.toFixed(3)}</td>
                    <td>{row.speedup.toFixed(2)}×</td>
                    <td>{Math.round(row.efficiency * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="500 MB strong scaling" description="ProcessPool static schedule.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workers</th>
                  <th>Seconds</th>
                  <th>Speedup</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {strong500.map((row) => (
                  <tr key={row.workers}>
                    <td>{row.workers}</td>
                    <td className="mono">{row.seconds.toFixed(3)}</td>
                    <td>{row.speedup.toFixed(2)}×</td>
                    <td>{Math.round(row.efficiency * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="dashboard-grid equal">
        <Panel title="10 MB backend comparison" description="Launch overhead matters more on small files.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Backend</th>
                  <th>Workers</th>
                  <th>Seconds</th>
                  <th>Speedup</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {backendComparison.map((row) => (
                  <tr key={row.backend}>
                    <td>{row.backend}</td>
                    <td>{row.workers}</td>
                    <td className="mono">{row.seconds.toFixed(3)}</td>
                    <td>{row.speedup.toFixed(2)}×</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Weak scaling" description="Approximately 50 MB of work per worker.">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Workers</th>
                  <th>Dataset</th>
                  <th>Seconds</th>
                  <th>T1 / Tp</th>
                </tr>
              </thead>
              <tbody>
                {weakScaling.map((row) => (
                  <tr key={row.workers}>
                    <td>{row.workers}</td>
                    <td>{row.dataset}</td>
                    <td className="mono">{row.seconds.toFixed(3)}</td>
                    <td>{row.efficiency.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="inline-note">
            Efficiency falls as worker and data pressure rise on this hybrid P/E laptop. That is expected, not hidden.
          </p>
          <StatusBadge status="warning">Sublinear scaling documented</StatusBadge>
        </Panel>
      </div>
    </div>
  );
}
