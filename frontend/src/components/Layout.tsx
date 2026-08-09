import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { setToken } from "../api/client";

export function Layout() {
  const navigate = useNavigate();
  return (
    <div className="layout">
      <header>
        <strong>Parallel Log Intelligence</strong>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/analyze">New Analysis</NavLink>
          <NavLink to="/benchmark">Benchmark</NavLink>
        </nav>
        <button
          className="secondary"
          onClick={() => {
            setToken(null);
            navigate("/login");
          }}
        >
          Log out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
