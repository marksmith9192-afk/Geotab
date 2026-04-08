import { NavLink, Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="app-shell">
      <div className="layout">
        <aside className="sidebar">
          <h1>Geotab Report Admin</h1>
          <p>Safe bulk template replacement with dry run, backups, and rollback support.</p>
          <nav>
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Dashboard
            </NavLink>
            <NavLink to="/jobs" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              Job History
            </NavLink>
          </nav>
        </aside>
        <main className="main">
          <section className="hero">
            <h2>Bulk report template replacement</h2>
            <p>
              This MVP is designed for internal admin use and prioritizes safe execution. Every report update is previewed,
              backed up, audited, and surfaced in job history before we move toward live Geotab integration.
            </p>
          </section>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
