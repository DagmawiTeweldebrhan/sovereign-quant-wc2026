import React from "react";

export default function TacticalClashPanel({ managerA, managerB, frictionIndex }) {
  if (!managerA || !managerB) {
    return <div className="text-sm text-slate-500">Awaiting technical parameters...</div>;
  }

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-2 border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Managerial Tactical System Clash Matrix
      </div>
      <div className="grid gap-4 text-sm md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 border-b border-slate-200 pb-1 font-semibold uppercase text-slate-900">{managerA.name}</div>
          <p className="text-slate-600">
            Formation: <span className="font-semibold text-slate-900">{managerA.preferred_formation}</span>
          </p>
          <p className="text-slate-600">
            Press Coeff (PPDA): <span className="font-semibold text-slate-900">{managerA.ppda_factor}</span>
          </p>
          <p className="text-slate-600">
            Defensive Line Height: <span className="font-semibold text-slate-900">{managerA.defensive_line_height}m</span>
          </p>
          <p className="text-slate-600">
            Field Tilt Basal: <span className="font-semibold text-slate-900">{(managerA.field_tilt_baseline * 100).toFixed(1)}%</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-1 border-b border-slate-200 pb-1 font-semibold uppercase text-slate-900">{managerB.name}</div>
          <p className="text-slate-600">
            Formation: <span className="font-semibold text-slate-900">{managerB.preferred_formation}</span>
          </p>
          <p className="text-slate-600">
            Press Coeff (PPDA): <span className="font-semibold text-slate-900">{managerB.ppda_factor}</span>
          </p>
          <p className="text-slate-600">
            Defensive Line Height: <span className="font-semibold text-slate-900">{managerB.defensive_line_height}m</span>
          </p>
          <p className="text-slate-600">
            Field Tilt Basal: <span className="font-semibold text-slate-900">{(managerB.field_tilt_baseline * 100).toFixed(1)}%</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-xs">
        <span className="font-semibold uppercase text-slate-500">Mutual Stylistic Friction Coefficient:</span>
        <span className="text-sm font-semibold text-sky-700">{frictionIndex.toFixed(5)}</span>
      </div>
    </div>
  );
}
