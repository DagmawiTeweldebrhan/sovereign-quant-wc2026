import React, { useState } from "react";

export default function AuthPanel({ mode, onModeChange, onSubmit, loading, error }) {
  const [form, setForm] = useState({
    email: "admin@quant.local",
    password: "WorldCup2026!",
    display_name: "Tournament Admin",
    team_iso: "",
  });

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      email: form.email,
      password: form.password,
      display_name: form.display_name,
      role: "viewer",
      team_iso: form.team_iso.trim() ? form.team_iso.trim().toUpperCase() : null,
    });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Authentication</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Sign in to the World Cup prediction ledger
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Access is now protected by signed sessions and database row-level security. Use a demo account or register a new viewer profile.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Display name
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                  value={form.display_name}
                  onChange={(event) => updateField("display_name", event.target.value)}
                  placeholder="Tournament Analyst"
                />
              </label>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="admin@quant.local"
                autoComplete="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="WorldCup2026!"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </label>
          </div>

          {mode === "register" && (
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Team ISO
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white"
                value={form.team_iso}
                onChange={(event) => updateField("team_iso", event.target.value)}
                placeholder="USA"
                maxLength={3}
              />
            </label>
          )}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : mode === "register" ? "Create session" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => onModeChange(mode === "login" ? "register" : "login")}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {mode === "login" ? "Need a new account?" : "Use existing account"}
            </button>
          </div>
        </form>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-slate-700">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Demo Access</div>
        <div className="mt-3 text-xl font-semibold text-slate-950">Ready-made test accounts</div>
        <div className="mt-6 grid gap-3 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold text-slate-950">Admin</div>
            <div className="mt-1 font-mono text-sm text-slate-600">admin@quant.local</div>
            <div className="font-mono text-sm text-slate-600">WorldCup2026!</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold text-slate-950">Team viewers</div>
            <div className="mt-1 font-mono text-sm text-slate-600">usa@quant.local / mex@quant.local / bra@quant.local / fra@quant.local</div>
            <div className="font-mono text-sm text-slate-600">WorldCup2026!</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="font-semibold text-slate-950">What changes now</div>
            <p className="mt-1 leading-6 text-slate-600">
              Fixtures, players, and simulations are filtered by session scope. Admins can ingest results and manage venues; viewers stay read-only.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
