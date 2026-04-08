import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "./components/AppLayout";
import { AdminAccessGate } from "./components/AdminAccessGate";
import { DashboardPage } from "./pages/DashboardPage";
import { JobsPage } from "./pages/JobsPage";
import { getAdminAccessToken } from "./lib/api";
import type { ApiHealth } from "@geotab-report-admin/shared";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />
      },
      {
        path: "jobs",
        element: <JobsPage />
      }
    ]
  }
]);

export function App() {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetch("/api/health")
      .then((response) => response.json() as Promise<ApiHealth>)
      .then((payload) => setHealth(payload))
      .catch(() => {
        setHealth({
          ok: false,
          providerMode: "mock"
        });
      });
  }, [refreshKey]);

  if (!health) {
    return null;
  }

  if (health.requiresAdminAccess && !getAdminAccessToken()) {
    return <AdminAccessGate onUnlocked={() => setRefreshKey((current) => current + 1)} />;
  }

  return <RouterProvider router={router} />;
}
