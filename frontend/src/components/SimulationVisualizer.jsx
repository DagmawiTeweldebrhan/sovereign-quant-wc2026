import React from "react";

function ProbabilityBar({ label, value }) {
  const percent = Math.max(0, Math.min(100, value * 100));

  return (
    <div className="space-y-1 border border-zinc-800 p-2">
      <div className="flex items-center justify-between text-xs uppercase text-zinc-400">
        <span>{label}</span>
        <span>{percent.toFixed(1)}%</span>
      </div>
      <div className="h-3 border border-zinc-700 bg-black">
        <div className="h-full bg-white" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export default function SimulationVisualizer({ prediction }) {
  if (!prediction) {
    return (
      <div className="border border-zinc-800 p-4 text-xs font-mono text-zinc-500 rounded-none">
        Awaiting simulation output...
      </div>
    );
  }

  return (
    <div className="border border-white bg-black p-4 font-mono text-white rounded-none">
      <div className="mb-3 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
        Simulation Output
      </div>
      <div className="grid gap-3">
        <ProbabilityBar label="Home Win" value={prediction.probabilities.home_win} />
        <ProbabilityBar label="Draw" value={prediction.probabilities.draw} />
        <ProbabilityBar label="Away Win" value={prediction.probabilities.away_win} />
      </div>
      <div className="mt-4 border border-zinc-800 p-3 text-xs">
        <div className="mb-2 flex justify-between uppercase text-zinc-400">
          <span>Calibration Brier Score</span>
          <span className="font-bold text-white">
            {prediction.calculated_brier_score != null ? prediction.calculated_brier_score.toFixed(4) : "N/A"}
          </span>
        </div>
        <div className="space-y-2">
          {Object.entries(prediction.score_matrix_distribution)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 5)
            .map(([scoreline, share]) => (
              <div key={scoreline} className="flex items-center justify-between border border-zinc-800 px-2 py-1">
                <span className="uppercase text-zinc-300">{scoreline}</span>
                <span className="font-bold text-white">{(share * 100).toFixed(2)}%</span>
              </div>
            ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-zinc-800 pt-3 text-xs uppercase text-zinc-400">
        <div className="flex justify-between">
          <span>Most Probable Scoreline</span>
          <span className="font-bold text-white">{prediction.most_probable_scoreline}</span>
        </div>
        <div className="flex justify-between">
          <span>Simulations Run</span>
          <span className="font-bold text-white">{prediction.simulations_run.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Computed At</span>
          <span className="font-bold text-white">{new Date(prediction.computed_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
