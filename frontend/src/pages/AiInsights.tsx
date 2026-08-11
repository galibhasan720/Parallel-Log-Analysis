import { Link } from "react-router-dom";
import { AiInsightsPanel } from "../components/AnalysisVisuals";
import { Icon } from "../components/Icon";
import { ResultSelector } from "../components/ResultSelector";
import { EmptyState, ErrorState, LoadingState, PageHeader, Panel } from "../components/ui";
import { useSelectedResult } from "../hooks/useSelectedResult";
import { ApiError, api } from "../api/client";
import { useState } from "react";

export function AiInsightsPage() {
  const {
    completedJobs,
    selectedJobId,
    setSelectedJobId,
    result,
    setResult,
    loading,
    error,
    reload,
  } = useSelectedResult();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const live = Boolean(result);

  async function generateAi() {
    if (!selectedJobId || !result) {
      setAiNote("Select a completed live job to request a local Ollama explanation.");
      return;
    }
    setAiBusy(true);
    setAiNote("");
    try {
      const body = await api.aiSummary(selectedJobId);
      setResult({ ...result, ai_report: body.ai_report ?? result.ai_report });
      setAiNote("Generated locally from aggregates and findings only.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setAiNote("Ollama is unavailable. Core HPC analytics and evidence cards remain available.");
      } else {
        setAiNote(err instanceof Error ? err.message : "AI request failed");
      }
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="page-stack motion-root">
      <PageHeader
        eyebrow="Evidence-grounded intelligence"
        title="AI Insights"
        description="Local interpretation grounded in processed aggregates. Optional Ollama prose never sees raw log lines."
        actions={
          <>
            <Link className="button secondary" to="/security">
              <Icon name="shield" size={16} /> Review security evidence
            </Link>
            <button className="button" type="button" disabled={aiBusy || !live} onClick={() => void generateAi()}>
              <Icon name="ai" size={16} />
              {aiBusy ? "Generating…" : "Generate report"}
            </button>
          </>
        }
      />

      <div className="truth-notice">
        <Icon name="ai" />
        <div>
          <strong>Aggregates and findings only.</strong>
          <span>
            Insight cards summarize heuristic evidence. Ollama, when available, explains those aggregates — it does not invent CUDA claims or scan raw logs.
          </span>
        </div>
      </div>

      <ResultSelector
        jobs={completedJobs}
        value={selectedJobId}
        onChange={setSelectedJobId}
        live={live}
      />

      {loading ? <LoadingState label="Loading insights…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => void reload()} /> : null}
      {aiNote ? <p className="inline-note">{aiNote}</p> : null}

      <Panel title="Insight cards" description="Each card states confidence, evidence, and a recommended next step.">
        {live || !completedJobs.length ? (
          <AiInsightsPanel report={result?.ai_report} findings={result?.security.findings} live={live} />
        ) : (
          <EmptyState
            icon="ai"
            title="Choose a completed job"
            description="AI Insights summarize stored analysis results. Showcase insights remain available when no job is selected."
            to="/analyze"
            action="Run analysis"
          />
        )}
      </Panel>

      <div className="dashboard-grid equal">
        <Panel title="How insights are produced" description="Transparent pipeline from aggregates to narrative.">
          <ol className="ordered-list">
            <li>Parallel workers emit associative partials.</li>
            <li>The reducer merges totals, histograms, and findings.</li>
            <li>Deterministic heuristics score severity, errors, and auth signals.</li>
            <li>Optional Ollama explains those aggregates locally.</li>
          </ol>
        </Panel>
        <Panel title="What this page will not do" description="Honesty constraints for academic demos.">
          <div className="contract-list">
            <div>
              <Icon name="alert" />
              <div>
                <strong>No unverifiable storytelling</strong>
                <span>We do not invent incidents or root causes without evidence.</span>
              </div>
            </div>
            <div>
              <Icon name="explorer" />
              <div>
                <strong>No raw-line search</strong>
                <span>Insights point at aggregates, not a fake log index.</span>
              </div>
            </div>
            <div>
              <Icon name="cpu" />
              <div>
                <strong>No CUDA acceleration claim</strong>
                <span>Intelligence sits on top of CPU parallel backends.</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
