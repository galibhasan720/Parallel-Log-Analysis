import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { getToken } from "./api/client";
import { Layout } from "./components/Layout";
import { AnalysisResultPage } from "./pages/AnalysisResult";
import { BenchmarkPage } from "./pages/Benchmark";
import { Dashboard } from "./pages/Dashboard";
import { LoginPage } from "./pages/LoginPage";
import { NewAnalysis } from "./pages/NewAnalysis";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
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
        <Route path="/jobs/:id" element={<AnalysisResultPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
