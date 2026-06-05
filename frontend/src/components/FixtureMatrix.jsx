import React, { useEffect, useState } from "react";
import { fetchUpcomingFixtures, triggerSimulation } from "../utils/api";

export default function FixtureMatrix({ onSelectFixture, onSimulationQueued }) {
  const [fixtures, setFixtures] = useState([]);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    let active = true;

    fetchUpcomingFixtures()
      .then((data) => {
        if (active) {
          setFixtures(data);
          if (data.length > 0) {
            onSelectFixture?.(data[0]);
          }
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
    <div className="w-full border border-white bg-black p-4 font-mono text-white rounded-none">
      <div className="mb-3 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
        Live Tournament Fixture Matrix // 2026_World_Cup
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-700 bg-zinc-900 text-zinc-400 uppercase">
              <th className="border-r border-zinc-800 p-2">Stage</th>
              <th className="border-r border-zinc-800 p-2">Fixture Matchup</th>
              <th className="border-r border-zinc-800 p-2">Venue Location</th>
              <th className="p-2 text-center">Action Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture) => (
              <tr
                key={fixture.fixture_id}
                onClick={() => onSelectFixture?.(fixture)}
                className="cursor-pointer border-b border-zinc-800 transition-colors hover:bg-zinc-950"
              >
                <td className="border-r border-zinc-800 p-2 font-bold uppercase text-zinc-400">{fixture.stage}</td>
                <td className="border-r border-zinc-800 p-2 font-bold tracking-tight">
                  {fixture.home_team_iso} vs {fixture.away_team_iso}
                </td>
                <td className="border-r border-zinc-800 p-2 text-zinc-400">
                  {fixture.venue_city} {fixture.venue_altitude_meters != null ? `(${fixture.venue_altitude_meters}m)` : ""}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={(event) => handleRunSim(fixture.fixture_id, event)}
                    disabled={processingId === fixture.fixture_id}
                    className="rounded-none border border-white bg-white px-3 py-1 text-xs font-bold uppercase text-black transition-all hover:bg-black hover:text-white disabled:opacity-30"
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
