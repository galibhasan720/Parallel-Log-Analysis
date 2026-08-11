import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, Capabilities, Dataset, JobStatus } from "../api/client";

export type ViewMode = "simple" | "engineering";
export type Density = "comfortable" | "compact";

export type Preferences = {
  viewMode: ViewMode;
  density: Density;
  motion: boolean;
  defaultBackend: string;
  defaultWorkers: number;
};

const defaultPreferences: Preferences = {
  viewMode: "simple",
  density: "comfortable",
  motion: true,
  defaultBackend: "process",
  defaultWorkers: 8,
};

type AppDataValue = {
  capabilities: Capabilities | null;
  datasets: Dataset[];
  jobs: JobStatus[];
  loading: boolean;
  error: string;
  selectedDatasetId: number | null;
  selectedJobId: number | null;
  setSelectedDatasetId: (id: number | null) => void;
  setSelectedJobId: (id: number | null) => void;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  refresh: () => Promise<void>;
};

const AppDataContext = createContext<AppDataValue | null>(null);
const PREF_KEY = "pli_preferences_v2";

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem(PREF_KEY);
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(readPreferences);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [caps, nextDatasets, nextJobs] = await Promise.all([
        api.capabilities(),
        api.datasets(),
        api.jobs(),
      ]);
      setCapabilities(caps);
      setDatasets(nextDatasets);
      setJobs(nextJobs);
      setSelectedDatasetId((current) => current ?? nextDatasets[0]?.id ?? null);
      setSelectedJobId(
        (current) =>
          current ??
          nextJobs.find((job) => job.status === "completed")?.job_id ??
          nextJobs[0]?.job_id ??
          null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load platform data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updatePreferences = useCallback((patch: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = preferences.density;
    document.documentElement.dataset.motion = preferences.motion ? "on" : "off";
  }, [preferences.density, preferences.motion]);

  const value = useMemo(
    () => ({
      capabilities,
      datasets,
      jobs,
      loading,
      error,
      selectedDatasetId,
      selectedJobId,
      setSelectedDatasetId,
      setSelectedJobId,
      preferences,
      updatePreferences,
      refresh,
    }),
    [
      capabilities,
      datasets,
      jobs,
      loading,
      error,
      selectedDatasetId,
      selectedJobId,
      preferences,
      updatePreferences,
      refresh,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside AppDataProvider");
  return value;
}

export function resetPreferences() {
  localStorage.removeItem(PREF_KEY);
}
