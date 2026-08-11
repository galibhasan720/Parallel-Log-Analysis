import { Icon } from "../components/Icon";
import { PageHeader, Panel, StatusBadge } from "../components/ui";
import { useAppData } from "../context/AppDataContext";
import { uploadTruth } from "../data/measuredShowcase";

export function SettingsPage() {
  const { preferences, updatePreferences, capabilities } = useAppData();
  const backends = capabilities?.execution_backends?.length
    ? capabilities.execution_backends
    : ["process", "dynamic", "openmp", "mpi"];

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Workspace preferences"
        title="Settings"
        description="Persist demo defaults for backend, workers, density, and motion. Preferences stay in this browser."
      />

      <div className="dashboard-grid equal">
        <Panel title="Analysis defaults" description="Used to prefill the New Analysis wizard.">
          <div className="form-grid">
            <label className="field">
              <span>Default backend</span>
              <select
                value={preferences.defaultBackend}
                onChange={(event) => updatePreferences({ defaultBackend: event.target.value })}
              >
                {backends.map((backend) => (
                  <option key={backend} value={backend}>
                    {backend}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Default workers</span>
              <input
                type="number"
                min={1}
                max={capabilities?.max_workers ?? 12}
                value={preferences.defaultWorkers}
                onChange={(event) =>
                  updatePreferences({ defaultWorkers: Number(event.target.value) || 1 })
                }
              />
            </label>
            <label className="field">
              <span>Explanation level</span>
              <select
                value={preferences.viewMode}
                onChange={(event) =>
                  updatePreferences({ viewMode: event.target.value as "simple" | "engineering" })
                }
              >
                <option value="simple">Simple</option>
                <option value="engineering">Engineering</option>
              </select>
            </label>
            <label className="field">
              <span>Density</span>
              <select
                value={preferences.density}
                onChange={(event) =>
                  updatePreferences({ density: event.target.value as "comfortable" | "compact" })
                }
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </label>
          </div>
        </Panel>

        <Panel title="Presentation" description="Accessibility and demo controls.">
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={!preferences.motion}
              onChange={(event) => updatePreferences({ motion: !event.target.checked })}
            />
            <span>
              <strong>Prefer reduced motion</strong>
              <small>
                Disables ambient loops, page transitions, pipeline cycles, and chart entrance replay in this
                session.
              </small>
            </span>
          </label>
          <div className="inline-note">
            Current host max workers{" "}
            <StatusBadge status="ready">{capabilities?.max_workers ?? "—"}</StatusBadge>
          </div>
        </Panel>
      </div>

      <Panel title="Upload truth" description="Constraints enforced by the web API.">
        <div className="contract-list">
          <div>
            <Icon name="check" />
            <div>
              <strong>Accepted types</strong>
              <span>{uploadTruth.extensions.join(" and ")} only</span>
            </div>
          </div>
          <div>
            <Icon name="database" />
            <div>
              <strong>Web upload ceiling</strong>
              <span>{uploadTruth.webLimit} through the browser API</span>
            </div>
          </div>
          <div>
            <Icon name="alert" />
            <div>
              <strong>Larger datasets</strong>
              <span>Use CLI / HPC scripts documented in docs/DATASETS.md</span>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
