import React, { useEffect, useState } from "react";
import { fetchHealth } from "../utils/api";

export default function SystemStatusStrip({ session }) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setError(null);
      const data = await fetchHealth();
      setHealth(data);
    } catch (fetchError) {
      setError(fetchError.message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">System Status</div>
          <div className="mt-1 text-base font-semibold text-slate-950">API and session heartbeat</div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Backend</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">
            {loading ? "Checking..." : health ? "Online" : "Offline"}
          </div>
          <div className="mt-1 text-xs text-slate-500">{health?.environment ?? error ?? "No response"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Auth</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">{session ? "Signed In" : "Signed Out"}</div>
          <div className="mt-1 text-xs text-slate-500">{session?.role ?? "No active session"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Status</div>
          <div className="mt-1 text-sm font-semibold text-slate-950">
            {error ? "Needs attention" : "Stable"}
          </div>
          <div className="mt-1 text-xs text-slate-500">{error ?? "System healthy"}</div>
        </div>
      </div>
    </div>
  );
}
