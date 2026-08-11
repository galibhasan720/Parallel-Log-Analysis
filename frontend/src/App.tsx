import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./api/client";
import { Layout } from "./components/Layout";
import { LoadingState } from "./components/ui";

const LoginPage = lazy(() => import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const NewAnalysis = lazy(() => import("./pages/NewAnalysis").then((m) => ({ default: m.NewAnalysis })));
const LogExplorerPage = lazy(() =>
  import("./pages/LogExplorer").then((m) => ({ default: m.LogExplorerPage })),
);
const ParallelProcessingPage = lazy(() =>
  import("./pages/ParallelProcessing").then((m) => ({ default: m.ParallelProcessingPage })),
);
const PerformancePage = lazy(() =>
  import("./pages/Performance").then((m) => ({ default: m.PerformancePage })),
);
const BenchmarkPage = lazy(() =>
  import("./pages/Benchmark").then((m) => ({ default: m.BenchmarkPage })),
);
const AnalysisResultPage = lazy(() =>
  import("./pages/AnalysisResult").then((m) => ({ default: m.AnalysisResultPage })),
);
const SecurityAnalysisPage = lazy(() =>
  import("./pages/SecurityAnalysis").then((m) => ({ default: m.SecurityAnalysisPage })),
);
const AiInsightsPage = lazy(() =>
  import("./pages/AiInsights").then((m) => ({ default: m.AiInsightsPage })),
);
const ReportsPage = lazy(() => import("./pages/Reports").then((m) => ({ default: m.ReportsPage })));
const SystemHealthPage = lazy(() =>
  import("./pages/SystemHealth").then((m) => ({ default: m.SystemHealthPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="route-fallback">
      <LoadingState label="Loading workspace…" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyze" element={<NewAnalysis />} />
          <Route path="/explorer" element={<LogExplorerPage />} />
          <Route path="/parallel" element={<ParallelProcessingPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/security" element={<SecurityAnalysisPage />} />
          <Route path="/ai-insights" element={<AiInsightsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/system" element={<SystemHealthPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/jobs/:id" element={<AnalysisResultPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
