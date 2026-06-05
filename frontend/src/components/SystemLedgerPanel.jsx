import React from "react";

function TeamCard({ label, team, manager }) {
  if (!team) {
    return (
      <div className="border border-zinc-800 p-3 text-xs text-zinc-500">
        {label}: no team selected
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-1">
        <span className="uppercase tracking-[0.3em] text-zinc-500">{label}</span>
        <span className="font-bold text-white">{team.team_iso}</span>
      </div>
      <div className="grid gap-1 text-zinc-400">
        <div className="flex justify-between">
          <span>Name</span>
          <span className="font-bold text-white">{team.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Baseline ELO</span>
          <span className="font-bold text-white">{team.baseline_elo}</span>
        </div>
        <div className="flex justify-between">
          <span>DC Alpha</span>
          <span className="font-bold text-white">{team.dixon_coles_alpha}</span>
        </div>
        <div className="flex justify-between">
          <span>DC Beta</span>
          <span className="font-bold text-white">{team.dixon_coles_beta}</span>
        </div>
        <div className="flex justify-between">
          <span>Coach</span>
          <span className="font-bold text-white">{manager?.name ?? "Unassigned"}</span>
        </div>
      </div>
    </div>
  );
}

export default function SystemLedgerPanel({ fixture }) {
  if (!fixture) {
    return (
      <div className="border border-zinc-800 p-4 font-mono text-xs text-zinc-500 rounded-none">
        Fixture ledger data will appear here once a matchup is selected.
      </div>
    );
  }

  return (
    <div className="border border-white bg-black p-4 font-mono text-white rounded-none">
      <div className="mb-3 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
        System Ledger
      </div>
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <TeamCard label="Home Ledger" team={fixture.home_team} manager={fixture.home_manager} />
          <TeamCard label="Away Ledger" team={fixture.away_team} manager={fixture.away_manager} />
        </div>
        <div className="border border-zinc-800 p-3 text-xs">
          <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-1">
            <span className="uppercase tracking-[0.3em] text-zinc-500">Venue Climate</span>
            <span className="font-bold text-white">{fixture.venue_name ?? fixture.venue_id}</span>
          </div>
          <div className="grid gap-1 text-zinc-400">
            <div className="flex justify-between">
              <span>City</span>
              <span className="font-bold text-white">{fixture.venue_city ?? "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span>Altitude</span>
              <span className="font-bold text-white">
                {fixture.venue_altitude_meters != null ? `${fixture.venue_altitude_meters} m` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
