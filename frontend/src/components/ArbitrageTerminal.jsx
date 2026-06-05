import React from "react";

function toFairOdds(probability) {
  return probability > 0 ? (1 / probability).toFixed(2) : "∞";
}

export default function ArbitrageTerminal({ prediction }) {
  if (!prediction) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        No market edge computed yet.
      </div>
    );
  }

  const probabilities = prediction.probabilities;
  const syntheticMarket = {
    home_win: probabilities.home_win * 0.96,
    draw: probabilities.draw * 0.96,
    away_win: probabilities.away_win * 0.96,
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
        Arbitrage Terminal
      </div>
      <div className="grid gap-2 text-xs">
        {Object.entries(probabilities).map(([key, value]) => {
          const fairOdds = toFairOdds(value);
          const marketOdds = toFairOdds(syntheticMarket[key]);
          const edge = ((1 / Number(marketOdds)) - value) * 100;
          return (
            <div key={key} className="grid grid-cols-4 rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <span className="uppercase text-slate-500">{key.replace("_", " ")}</span>
              <span className="text-right text-slate-600">Fair {fairOdds}</span>
              <span className="text-right text-slate-600">Market {marketOdds}</span>
              <span className={`text-right font-semibold ${edge >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                Edge {edge.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
