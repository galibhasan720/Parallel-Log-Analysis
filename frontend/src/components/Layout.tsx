import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { setToken } from "../api/client";
import { AppDataProvider, useAppData } from "../context/AppDataContext";
import { glossary, hardware } from "../data/measuredShowcase";
import { Icon, IconName } from "./Icon";
import { StatusBadge } from "./ui";

type NavItem = { to: string; label: string; icon: IconName; end?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navigation: NavGroup[] = [
  {
    label: "Analyze",
    items: [
      { to: "/", label: "Overview", icon: "overview", end: true },
      { to: "/analyze", label: "New Analysis", icon: "upload" },
      { to: "/explorer", label: "Log Explorer", icon: "explorer" },
    ],
  },
  {
    label: "HPC",
    items: [
      { to: "/parallel", label: "Parallel Processing", icon: "cpu" },
      { to: "/performance", label: "Performance", icon: "performance" },
      { to: "/benchmark", label: "Benchmarks", icon: "benchmark" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/security", label: "Security Analysis", icon: "shield" },
      { to: "/ai-insights", label: "AI Insights", icon: "ai" },
      { to: "/reports", label: "Reports", icon: "report" },
    ],
  },
  {
    label: "Platform",
    items: [
      { to: "/system", label: "System", icon: "system" },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function ProductLogo() {
  return (
    <div className="product-logo" aria-label="Parallel Log Intelligence">
      <span className="logo-orbit">
        <span className="logo-mark">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="logo-type">
        <strong>Parallel Log</strong>
        <small>Intelligence</small>
      </span>
    </div>
  );
}

function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    capabilities,
    datasets,
    jobs,
    selectedDatasetId,
    setSelectedDatasetId,
    preferences,
    updatePreferences,
  } = useAppData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState("");

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    const pages = navigation.flatMap((group) => group.items).map((item) => ({
      type: "Page",
      label: item.label,
      to: item.to,
    }));
    const jobRows = jobs.map((job) => ({
      type: "Job",
      label: `Job #${job.job_id} · ${job.status}`,
      to: `/jobs/${job.job_id}`,
    }));
    return [...pages, ...jobRows].filter((item) => item.label.toLowerCase().includes(query)).slice(0, 7);
  }, [search, jobs]);

  const backend =
    capabilities?.execution_backend === "local_process"
      ? "process"
      : capabilities?.execution_backend ?? "process";
  const activeJobs = jobs.filter((job) => !["completed", "failed"].includes(job.status)).length;

  function logout() {
    setToken(null);
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <ProductLogo />
          <button className="sidebar-close icon-button" type="button" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
            <span className="sr-only">Close navigation</span>
          </button>
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  title={item.label}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-health">
          <div>
            <span className="health-pulse" />
            <span>System operational</span>
          </div>
          <small>{hardware.cpu} · local</small>
        </div>
      </aside>

      {sidebarOpen ? <button className="sidebar-backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="shell-content">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
            <span className="sr-only">Open navigation</span>
          </button>
          <div className="global-search">
            <Icon name="search" size={17} />
            <input
              aria-label="Global search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs, pages, services, IPs…"
            />
            {search ? (
              <div className="search-results">
                {searchResults.length ? (
                  searchResults.map((item) => (
                    <button
                      type="button"
                      key={`${item.type}-${item.to}`}
                      onClick={() => {
                        navigate(item.to);
                        setSearch("");
                      }}
                    >
                      <span>{item.label}</span>
                      <small>{item.type}</small>
                    </button>
                  ))
                ) : (
                  <span>No matching pages or jobs.</span>
                )}
              </div>
            ) : null}
          </div>

          <label className="topbar-select">
            <span>Dataset</span>
            <select
              value={selectedDatasetId ?? ""}
              onChange={(event) => setSelectedDatasetId(event.target.value ? Number(event.target.value) : null)}
              aria-label="Select current dataset"
            >
              <option value="">Measured showcase</option>
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.filename}
                </option>
              ))}
            </select>
          </label>

          <div className="topbar-context desktop-context">
            <span>Backend</span>
            <strong>{backend}</strong>
          </div>
          <div className="topbar-context desktop-context">
            <span>Workers</span>
            <strong>8 / {capabilities?.max_workers ?? 12}</strong>
          </div>
          <StatusBadge status={activeJobs ? "running" : "operational"}>
            {activeJobs ? `${activeJobs} active` : "Operational"}
          </StatusBadge>

          <button className="icon-button" type="button" aria-label="Open terminology" onClick={() => setGlossaryOpen(true)}>
            <Icon name="help" />
          </button>
          <button
            className={`icon-button notification-button ${activeJobs ? "has-active" : ""}`}
            type="button"
            aria-label="Notifications"
          >
            <Icon name="bell" />
            {activeJobs ? <span>{activeJobs}</span> : null}
          </button>
          <div className="account-menu">
            <button
              className="avatar-button"
              type="button"
              aria-label="Open account menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen(!accountOpen)}
            >
              GH
            </button>
            {accountOpen ? (
              <div className="account-popover">
                <strong>Local operator</strong>
                <span>JWT authenticated session</span>
                <button
                  type="button"
                  onClick={() =>
                    updatePreferences({
                      viewMode: preferences.viewMode === "simple" ? "engineering" : "simple",
                    })
                  }
                >
                  <Icon name="settings" size={15} />
                  {preferences.viewMode === "simple" ? "Engineering view" : "Simple view"}
                </button>
                <button type="button" onClick={logout}>
                  <Icon name="logout" size={15} /> Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main id="main-content" className="main-workspace route-anim" key={location.pathname}>
          <Outlet />
        </main>
      </div>

      {glossaryOpen ? (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-label="HPC terminology">
          <button className="drawer-backdrop" aria-label="Close glossary" onClick={() => setGlossaryOpen(false)} />
          <aside className="drawer">
            <div className="drawer-header">
              <div>
                <span className="eyebrow">Explain this platform</span>
                <h2>HPC glossary</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setGlossaryOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <p className="drawer-intro">
              Plain-language definitions for the performance and parallel-computing concepts used across the product.
            </p>
            <dl className="glossary-list">
              {Object.entries(glossary).map(([term, definition]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export function Layout() {
  return (
    <AppDataProvider>
      <Shell />
    </AppDataProvider>
  );
}
