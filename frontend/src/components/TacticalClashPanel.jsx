import React from "react";

export default function TacticalClashPanel({ managerA, managerB, frictionIndex }) {
  if (!managerA || !managerB) {
    return <div className="font-mono text-xs text-zinc-500">Awaiting technical parameters...</div>;
  }

  return (
    <div className="w-full rounded-none border border-white bg-black p-4 font-mono text-white">
      <div className="mb-2 border-b border-zinc-800 pb-1 text-xs font-bold uppercase tracking-wider text-yellow-500">
        Managerial Tactical System Clash Matrix
      </div>
      <div className="grid gap-4 text-xs md:grid-cols-2">
        <div className="rounded-none border border-zinc-800 p-2">
          <div className="mb-1 border-b border-zinc-800 font-bold uppercase text-white">{managerA.name}</div>
          <p className="text-zinc-400">
            Formation: <span className="font-bold text-white">{managerA.preferred_formation}</span>
          </p>
          <p className="text-zinc-400">
            Press Coeff (PPDA): <span className="font-bold text-red-500">{managerA.ppda_factor}</span>
          </p>
          <p className="text-zinc-400">
            Defensive Line Height: <span className="font-bold text-white">{managerA.defensive_line_height}m</span>
          </p>
          <p className="text-zinc-400">
            Field Tilt Basal: <span className="font-bold text-white">{(managerA.field_tilt_baseline * 100).toFixed(1)}%</span>
          </p>
        </div>
        <div className="rounded-none border border-zinc-800 p-2">
          <div className="mb-1 border-b border-zinc-800 font-bold uppercase text-white">{managerB.name}</div>
          <p className="text-zinc-400">
            Formation: <span className="font-bold text-white">{managerB.preferred_formation}</span>
          </p>
          <p className="text-zinc-400">
            Press Coeff (PPDA): <span className="font-bold text-blue-500">{managerB.ppda_factor}</span>
          </p>
          <p className="text-zinc-400">
            Defensive Line Height: <span className="font-bold text-white">{managerB.defensive_line_height}m</span>
          </p>
          <p className="text-zinc-400">
            Field Tilt Basal: <span className="font-bold text-white">{(managerB.field_tilt_baseline * 100).toFixed(1)}%</span>
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-zinc-700 bg-zinc-950 p-2 text-xs">
        <span className="font-bold uppercase text-zinc-400">Mutual Stylistic Friction Coefficient:</span>
        <span className="font-mono text-sm font-bold text-yellow-400">{frictionIndex.toFixed(5)}</span>
      </div>
    </div>
  );
}

