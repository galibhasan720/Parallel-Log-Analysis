import { useCallback, useEffect, useState } from "react";
import { AnalysisResult, api } from "../api/client";
import { useAppData } from "../context/AppDataContext";

export function useSelectedResult() {
  const { jobs, selectedJobId, setSelectedJobId } = useAppData();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedJob = jobs.find((job) => job.job_id === selectedJobId) ?? null;
  const completedJobs = jobs.filter((job) => job.status === "completed");

  const load = useCallback(async () => {
    if (!selectedJobId || selectedJob?.status !== "completed") {
      setResult(null);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      setResult(await api.results(selectedJobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analysis result");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId, selectedJob?.status]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    jobs,
    completedJobs,
    selectedJobId,
    setSelectedJobId,
    selectedJob,
    result,
    setResult,
    loading,
    error,
    reload: load,
  };
}
