import React from "react";

function ProbabilityBar({ label, value }) {
  const percent = Math.max(0, Math.min(100, value * 100));

  return (
    <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between text-xs uppercase text-slate-500">
        <span>{label}</span>
        <span>{percent.toFixed(1)}%</span>
      </div>
      <div className="h-3 rounded-full border border-slate-200 bg-white">
        <div className="h-full rounded-full bg-sky-600" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function SimulationVisualizer({ prediction }) {
  if (!prediction) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        Awaiting simulation output...
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Simulation Output
      </div>
      <div className="grid gap-3">
        <ProbabilityBar label="Home Win" value={prediction.probabilities.home_win} />
        <ProbabilityBar label="Draw" value={prediction.probabilities.draw} />
        <ProbabilityBar label="Away Win" value={prediction.probabilities.away_win} />
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <div className="mb-2 flex justify-between uppercase text-slate-500">
          <span>Calibration Brier Score</span>
          <span className="font-semibold text-slate-900">
            {prediction.calculated_brier_score != null ? prediction.calculated_brier_score.toFixed(4) : "N/A"}
          </span>
        </div>
        <div className="space-y-2">
          {Object.entries(prediction.score_matrix_distribution)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 5)
            .map(([scoreline, share]) => (
              <div key={scoreline} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="uppercase text-slate-600">{scoreline}</span>
                <span className="font-semibold text-slate-900">{(share * 100).toFixed(2)}%</span>
              </div>
            ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-slate-200 pt-3 text-xs uppercase text-slate-500">
        <div className="flex justify-between">
          <span>Most Probable Scoreline</span>
          <span className="font-semibold text-slate-900">{prediction.most_probable_scoreline}</span>
        </div>
        <div className="flex justify-between">
          <span>Simulations Run</span>
          <span className="font-semibold text-slate-900">{prediction.simulations_run.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Computed At</span>
          <span className="font-semibold text-slate-900">{new Date(prediction.computed_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
