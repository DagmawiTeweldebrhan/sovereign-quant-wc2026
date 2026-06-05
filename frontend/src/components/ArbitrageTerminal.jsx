import React from "react";

function toFairOdds(probability) {
  return probability > 0 ? (1 / probability).toFixed(2) : "∞";
}

export default function ArbitrageTerminal({ prediction }) {
  if (!prediction) {
    return (
      <div className="border border-zinc-800 p-4 font-mono text-xs text-zinc-500 rounded-none">
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
    <div className="rounded-none border border-white bg-black p-4 font-mono text-white">
      <div className="mb-3 border-b border-zinc-800 pb-2 text-xs font-bold uppercase tracking-[0.3em] text-zinc-500">
        Arbitrage Terminal
      </div>
      <div className="grid gap-2 text-xs">
        {Object.entries(probabilities).map(([key, value]) => {
          const fairOdds = toFairOdds(value);
          const marketOdds = toFairOdds(syntheticMarket[key]);
          const edge = ((1 / Number(marketOdds)) - value) * 100;
          return (
            <div key={key} className="grid grid-cols-4 border border-zinc-800 p-2">
              <span className="uppercase text-zinc-400">{key.replace("_", " ")}</span>
              <span className="text-right text-zinc-300">Fair {fairOdds}</span>
              <span className="text-right text-zinc-300">Market {marketOdds}</span>
              <span className={`text-right font-bold ${edge >= 0 ? "text-green-400" : "text-red-400"}`}>
                Edge {edge.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

