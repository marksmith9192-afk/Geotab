import { useState } from "react";
import { getAdminAccessToken, setAdminAccessToken } from "../lib/api";

interface AdminAccessGateProps {
  onUnlocked: () => void;
}

export function AdminAccessGate({ onUnlocked }: AdminAccessGateProps) {
  const [token, setToken] = useState(getAdminAccessToken());

  function submit() {
    if (!token.trim()) {
      return;
    }

    setAdminAccessToken(token.trim());
    onUnlocked();
  }

  return (
    <main className="stack" style={{ maxWidth: 420, margin: "4rem auto" }}>
      <section className="panel stack">
        <div>
          <h2>Admin Access Required</h2>
          <p className="inline-note">
            This deployment is protected with a shared admin access token before any report data or live actions are exposed.
          </p>
        </div>
        <label>
          Admin Access Token
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submit();
              }
            }}
          />
        </label>
        <button className="button primary" type="button" onClick={submit}>
          Unlock App
        </button>
      </section>
    </main>
  );
}
