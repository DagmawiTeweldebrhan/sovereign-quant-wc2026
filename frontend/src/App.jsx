import React, { useEffect, useMemo, useState } from "react";
import ArbitrageTerminal from "./components/ArbitrageTerminal";
import FixtureMatrix from "./components/FixtureMatrix";
import SimulationVisualizer from "./components/SimulationVisualizer";
import TacticalClashPanel from "./components/TacticalClashPanel";
import { fetchFixturePrediction } from "./utils/api";

export default function App() {
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

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
    if (selectedFixture?.fixture_id) {
      loadPrediction(selectedFixture.fixture_id);
    }
  }, [selectedFixture]);

  const handleSimulationQueued = (fixtureId) => {
    if (selectedFixture?.fixture_id !== fixtureId) {
      return;
    }

    window.setTimeout(() => {
      loadPrediction(fixtureId);
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="border border-white bg-black p-4 font-mono">
          <div className="text-xs uppercase tracking-[0.35em] text-zinc-500">Sovereign Quant World Cup 2026</div>
          <div className="mt-2 text-2xl font-bold uppercase tracking-tight">Forecast Control Terminal</div>
          <p className="mt-2 max-w-4xl text-xs leading-6 text-zinc-400">
            Brutalist tournament analysis console for fixture selection, Monte Carlo queueing, tactical friction, and calibrated probabilities.
          </p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <FixtureMatrix onSelectFixture={setSelectedFixture} onSimulationQueued={handleSimulationQueued} />
          <div className="grid gap-4">
            <SimulationVisualizer prediction={prediction} />
            <TacticalClashPanel managerA={managerA} managerB={managerB} frictionIndex={frictionIndex} />
            <ArbitrageTerminal prediction={prediction} />
          </div>
        </section>

        <section className="border border-zinc-800 p-4 font-mono text-xs text-zinc-400">
          {selectedFixture ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <div className="uppercase text-zinc-500">Selected Fixture</div>
                <div className="font-bold text-white">
                  {selectedFixture.home_team_iso} vs {selectedFixture.away_team_iso}
                </div>
                <div>{selectedFixture.venue_name ?? selectedFixture.venue_city}</div>
              </div>
              <div>
                <div className="uppercase text-zinc-500">Current State</div>
                <div className="font-bold text-white">{error ?? "Ready"}</div>
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

