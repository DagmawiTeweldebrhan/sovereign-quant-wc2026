import React from "react";

function TeamCard({ label, team, manager }) {
  if (!team) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-500">{label}: no team selected</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
      <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
        <span className="uppercase tracking-[0.3em] text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900">{team.team_iso}</span>
      </div>
      <div className="grid gap-1 text-slate-600">
        <div className="flex justify-between">
          <span>Name</span>
          <span className="font-semibold text-slate-900">{team.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Baseline ELO</span>
          <span className="font-semibold text-slate-900">{team.baseline_elo}</span>
        </div>
        <div className="flex justify-between">
          <span>DC Alpha</span>
          <span className="font-semibold text-slate-900">{team.dixon_coles_alpha}</span>
        </div>
        <div className="flex justify-between">
          <span>DC Beta</span>
          <span className="font-semibold text-slate-900">{team.dixon_coles_beta}</span>
        </div>
        <div className="flex justify-between">
          <span>Coach</span>
          <span className="font-semibold text-slate-900">{manager?.name ?? "Unassigned"}</span>
        </div>
      </div>
    </div>
  );
}

export default function SystemLedgerPanel({ fixture }) {
  if (!fixture) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        Fixture ledger data will appear here once a matchup is selected.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        System Ledger
      </div>
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          <TeamCard label="Home Ledger" team={fixture.home_team} manager={fixture.home_manager} />
          <TeamCard label="Away Ledger" team={fixture.away_team} manager={fixture.away_manager} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-1">
            <span className="uppercase tracking-[0.3em] text-slate-500">Venue Climate</span>
            <span className="font-semibold text-slate-900">{fixture.venue_name ?? fixture.venue_id}</span>
          </div>
          <div className="grid gap-1 text-slate-600">
            <div className="flex justify-between">
              <span>City</span>
              <span className="font-semibold text-slate-900">{fixture.venue_city ?? "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span>Altitude</span>
              <span className="font-semibold text-slate-900">
                {fixture.venue_altitude_meters != null ? `${fixture.venue_altitude_meters} m` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
