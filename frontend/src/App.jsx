import React, { useEffect, useMemo, useState } from "react";
import AuthPanel from "./components/AuthPanel";
import AdminControlPanel from "./components/AdminControlPanel";
import ArbitrageTerminal from "./components/ArbitrageTerminal";
import FixtureMatrix from "./components/FixtureMatrix";
import ReferenceDeskPanel from "./components/ReferenceDeskPanel";
import SimulationVisualizer from "./components/SimulationVisualizer";
import SystemLedgerPanel from "./components/SystemLedgerPanel";
import TacticalClashPanel from "./components/TacticalClashPanel";
import {
  clearAuthToken,
  fetchCurrentUser,
  fetchFixture,
  fetchFixturePrediction,
  login,
  registerUser,
  setAuthToken,
  waitForPrediction,
} from "./utils/api";

export default function App() {
  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [fixtureRefreshKey, setFixtureRefreshKey] = useState(0);

  const managerA = selectedFixture?.home_manager ?? null;
  const managerB = selectedFixture?.away_manager ?? null;

  const frictionIndex = useMemo(() => {
    if (!managerA || !managerB) {
      return 0;
    }

    const values = [
      managerA.ppda_factor * managerB.directness_index,
      Math.abs(managerA.defensive_line_height - managerB.defensive_line_height) / 75,
      Math.abs(managerA.directness_index - managerB.directness_index),
      Math.abs(managerA.field_tilt_baseline - managerB.field_tilt_baseline),
    ];

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [managerA, managerB]);

  const loadPrediction = async (fixtureId) => {
    try {
      setError(null);
      const data = await fetchFixturePrediction(fixtureId);
      setPrediction(data);
    } catch (exception) {
      setPrediction(null);
      setError(exception.message);
    }
  };

  useEffect(() => {
    let active = true;

    fetchCurrentUser()
      .then((user) => {
        if (active) {
          setSession(user);
        }
      })
      .catch(() => {
        clearAuthToken();
        if (active) {
          setSession(null);
        }
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (selectedFixture?.fixture_id) {
      loadPrediction(selectedFixture.fixture_id);
    }
  }, [selectedFixture]);

  const handleAuthSubmit = async (payload) => {
    try {
      setAuthError(null);
      setIsSubmittingAuth(true);
      const response =
        authMode === "login"
          ? await login(payload.email, payload.password)
          : await registerUser(payload);
      setAuthToken(response.access_token);
      setSession(response.user);
      setSelectedFixture(null);
      setPrediction(null);
    } catch (exception) {
      setAuthError(exception.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setSession(null);
    setSelectedFixture(null);
    setPrediction(null);
    setError(null);
    setAuthError(null);
    setAuthMode("login");
  };

  const handleSimulationQueued = async (fixtureId) => {
    if (selectedFixture?.fixture_id !== fixtureId) {
      return;
    }

    try {
      setIsPolling(true);
      setError(null);
      const data = await waitForPrediction(fixtureId);
      setPrediction(data);
    } catch (exception) {
      setPrediction(null);
      setError(exception.message);
    } finally {
      setIsPolling(false);
    }
  };

  const handleLedgerUpdated = async () => {
    setFixtureRefreshKey((current) => current + 1);
    if (selectedFixture?.fixture_id) {
      const updatedFixture = await fetchFixture(selectedFixture.fixture_id);
      setSelectedFixture(updatedFixture);
      setPrediction(null);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center rounded-3xl border border-slate-200 bg-white px-8 py-12 text-sm text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          Loading secure session...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
        <AuthPanel
          mode={authMode}
          onModeChange={setAuthMode}
          onSubmit={handleAuthSubmit}
          loading={isSubmittingAuth}
          error={authError}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Sovereign Quant World Cup 2026
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Forecast Control Terminal
              </div>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Light, authenticated analytics workspace for fixture selection, simulation queueing, tactical friction, and calibrated probabilities.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-500">Signed in as</div>
                <div className="font-semibold text-slate-950">{session.display_name}</div>
                <div className="text-xs text-slate-500">{session.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
          <FixtureMatrix
            key={fixtureRefreshKey}
            onSelectFixture={setSelectedFixture}
            onSimulationQueued={handleSimulationQueued}
          />
          <div className="grid gap-4">
            <SimulationVisualizer prediction={prediction} />
            <TacticalClashPanel managerA={managerA} managerB={managerB} frictionIndex={frictionIndex} />
            <SystemLedgerPanel fixture={selectedFixture} />
            <ArbitrageTerminal prediction={prediction} />
          </div>
        </section>

        {session.role === "admin" ? <AdminControlPanel onCompleted={handleLedgerUpdated} /> : null}

        <ReferenceDeskPanel />

        <section className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          {selectedFixture ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Selected fixture</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {selectedFixture.home_team_iso} vs {selectedFixture.away_team_iso}
                </div>
                <div className="text-slate-600">{selectedFixture.venue_name ?? selectedFixture.venue_city}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Current state</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">
                  {isPolling ? "Polling simulation cache..." : error ?? "Ready"}
                </div>
                <div className="text-slate-600">
                  {session.role === "admin"
                    ? "Admin access can ingest results and manage venue records."
                    : "Viewer access is restricted to scoped fixture and simulation reads."}
                </div>
              </div>
            </div>
          ) : (
            <div>Select a fixture to inspect its simulation pipeline.</div>
          )}
        </section>
      </div>
    </main>
  );
}
