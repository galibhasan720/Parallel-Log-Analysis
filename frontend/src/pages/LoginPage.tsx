import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password12");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(mode: "login" | "register", event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result =
        mode === "login" ? await api.login(email, password) : await api.register(email, password);
      setToken(result.access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth card">
      <h1>Sign in</h1>
      <p className="muted">JWT gate for the four product views. HPC still runs from the CLI.</p>
      <form className="form" onSubmit={(e) => submit("login", e)}>
        <label>
          Email
          <br />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password (min 8)
          <br />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            minLength={8}
            required
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={busy}>
          Log in
        </button>
        <button type="button" className="secondary" disabled={busy} onClick={(e) => submit("register", e)}>
          Register
        </button>
      </form>
    </main>
  );
}
