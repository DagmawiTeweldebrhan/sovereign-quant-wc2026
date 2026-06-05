import React, { useEffect, useState } from "react";
import { fetchUpcomingFixtures, triggerSimulation } from "../utils/api";

export default function FixtureMatrix({ onSelectFixture, onSimulationQueued }) {
  const [fixtures, setFixtures] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    let active = true;

    fetchUpcomingFixtures()
      .then((data) => {
        if (!active) {
          return;
        }

        setFixtures(data);
        if (data.length > 0) {
          onSelectFixture?.(data[0]);
        }
      })
      .catch(() => {
        if (active) {
          setFixtures([]);
        }
      });

    return () => {
      active = false;
    };
  }, [onSelectFixture]);

  const handleRunSim = async (fixtureId, event) => {
    event.stopPropagation();
    setProcessingId(fixtureId);
    try {
      await triggerSimulation(fixtureId);
      await onSimulationQueued?.(fixtureId);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Live Tournament Fixture Matrix // 2026_World_Cup
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
              <th className="border-r border-slate-200 p-2">Stage</th>
              <th className="border-r border-slate-200 p-2">Fixture Matchup</th>
              <th className="border-r border-slate-200 p-2">Venue Location</th>
              <th className="p-2 text-center">Action Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture) => (
              <tr
                key={fixture.fixture_id}
                onClick={() => onSelectFixture?.(fixture)}
                className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50"
              >
                <td className="border-r border-slate-100 p-2 font-semibold uppercase text-slate-500">{fixture.stage}</td>
                <td className="border-r border-slate-100 p-2 font-semibold tracking-tight text-slate-900">
                  {fixture.home_team_iso} vs {fixture.away_team_iso}
                </td>
                <td className="border-r border-slate-100 p-2 text-slate-600">
                  {fixture.venue_city} {fixture.venue_altitude_meters != null ? `(${fixture.venue_altitude_meters}m)` : ""}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={(event) => handleRunSim(fixture.fixture_id, event)}
                    disabled={processingId === fixture.fixture_id}
                    className="rounded-2xl border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {processingId === fixture.fixture_id ? "Running 100K MC..." : "Simulate Probabilities"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
