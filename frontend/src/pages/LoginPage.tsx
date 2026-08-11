import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";
import { Icon } from "../components/Icon";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password12");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "login" ? await api.login(email, password) : await api.register(email, password);
      setToken(result.access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="ambient-blobs" aria-hidden="true">
          <span className="blob-a" />
          <span className="blob-b" />
          <span className="blob-c" />
        </div>
        <div className="auth-particles" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="auth-brand">
          <span className="logo-orbit">
            <span className="logo-mark large">
              <span />
              <span />
              <span />
            </span>
          </span>
          <div>
            <strong>Parallel Log Intelligence</strong>
            <span>High-Performance Parallel Log Processing & Analytics</span>
          </div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">Local-first HPC observability</span>
          <h1>Turn large logs into trustworthy evidence—across every CPU core.</h1>
          <p>
            Decompose complete log records, execute in parallel with ProcessPool, OpenMP, or MPI,
            then reduce the results into performance and security insight.
          </p>
        </div>
        <div className="auth-flow">
          {[
            ["file", "Log dataset"],
            ["explorer", "Safe chunks"],
            ["cpu", "Parallel workers"],
            ["database", "Reduced evidence"],
            ["ai", "Local explanation"],
          ].map(([icon, label], index) => (
            <div key={label}>
              <span>
                <Icon name={icon as Parameters<typeof Icon>[0]["name"]} />
              </span>
              <strong>{label}</strong>
              {index < 4 ? <Icon name="arrow" className="auth-arrow" /> : null}
            </div>
          ))}
        </div>
        <div className="auth-trust">
          <span>
            <Icon name="system" /> Intel i5-1235U measured
          </span>
          <span>
            <Icon name="shield" /> Raw logs never sent to AI
          </span>
          <span>
            <Icon name="check" /> Sequential ≡ parallel
          </span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <div className="auth-form-heading">
            <span className="eyebrow">{mode === "login" ? "Welcome back" : "Create local account"}</span>
            <h2>{mode === "login" ? "Sign in to the platform" : "Register for this workspace"}</h2>
            <p>JWT-protected product access. The standalone HPC CLI remains independent.</p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label className="field">
              <span>Email</span>
              <div className="input-with-icon">
                <Icon name="user" size={17} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="operator@example.com"
                  required
                />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="input-with-icon">
                <Icon name="shield" size={17} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <small>Minimum 8 characters.</small>
            </label>
            {error ? (
              <div className="form-error" role="alert">
                <Icon name="alert" size={17} />
                {error}
              </div>
            ) : null}
            <button className="button auth-submit" type="submit" disabled={busy}>
              {busy ? <span className="spinner small" /> : <Icon name={mode === "login" ? "arrow" : "user"} size={17} />}
              {busy ? "Authenticating…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="auth-local-note">
            <Icon name="system" size={17} />
            <span>
              <strong>Runs on your laptop</strong>
              FastAPI, SQLite, CPU backends, and optional Ollama stay local.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
