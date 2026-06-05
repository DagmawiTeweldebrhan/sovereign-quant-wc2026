import React, { useEffect, useMemo, useState } from "react";
import { fetchManagers, fetchTeams, fetchVenues } from "../utils/api";

function ListItem({ title, subtitle, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
        selected ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{subtitle}</div>
    </button>
  );
}

export default function ReferenceDeskPanel() {
  const [tab, setTab] = useState("teams");
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([fetchTeams(), fetchVenues(), fetchManagers()])
      .then(([teamData, venueData, managerData]) => {
        if (!active) {
          return;
        }
        setTeams(teamData);
        setVenues(venueData);
        setManagers(managerData);
        setSelectedId(teamData[0]?.team_iso ?? venueData[0]?.venue_id ?? managerData[0]?.manager_id ?? null);
      })
      .catch((fetchError) => {
        if (active) {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (tab === "teams") {
      return teams.filter((team) => `${team.team_iso} ${team.name}`.toLowerCase().includes(query));
    }

    if (tab === "venues") {
      return venues.filter((venue) => `${venue.venue_id} ${venue.name} ${venue.city}`.toLowerCase().includes(query));
    }

    return managers.filter((manager) => `${manager.manager_id} ${manager.name} ${manager.team_iso}`.toLowerCase().includes(query));
  }, [tab, teams, venues, managers, search]);

  const selectedRecord = useMemo(() => {
    if (tab === "teams") {
      return teams.find((team) => team.team_iso === selectedId) ?? entries[0] ?? null;
    }
    if (tab === "venues") {
      return venues.find((venue) => venue.venue_id === selectedId) ?? entries[0] ?? null;
    }
    return managers.find((manager) => manager.manager_id === selectedId) ?? entries[0] ?? null;
  }, [tab, teams, venues, managers, selectedId, entries]);

  useEffect(() => {
    if (selectedRecord) {
      const nextId = tab === "teams" ? selectedRecord.team_iso : tab === "venues" ? selectedRecord.venue_id : selectedRecord.manager_id;
      setSelectedId(nextId);
    }
  }, [selectedRecord, tab]);

  const tabs = [
    { key: "teams", label: `Teams (${teams.length})` },
    { key: "venues", label: `Venues (${venues.length})` },
    { key: "managers", label: `Managers (${managers.length})` },
  ];

  const renderDetail = () => {
    if (!selectedRecord) {
      return <div className="text-sm text-slate-500">Select a record to inspect its ledger details.</div>;
    }

    if (tab === "teams") {
      return (
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex justify-between"><span>Team</span><span className="font-semibold text-slate-900">{selectedRecord.team_iso}</span></div>
          <div className="flex justify-between"><span>Name</span><span className="font-semibold text-slate-900">{selectedRecord.name}</span></div>
          <div className="flex justify-between"><span>Baseline ELO</span><span className="font-semibold text-slate-900">{selectedRecord.baseline_elo}</span></div>
          <div className="flex justify-between"><span>DC Alpha</span><span className="font-semibold text-slate-900">{selectedRecord.dixon_coles_alpha}</span></div>
          <div className="flex justify-between"><span>DC Beta</span><span className="font-semibold text-slate-900">{selectedRecord.dixon_coles_beta}</span></div>
        </div>
      );
    }

    if (tab === "venues") {
      return (
        <div className="grid gap-2 text-sm text-slate-600">
          <div className="flex justify-between"><span>Venue</span><span className="font-semibold text-slate-900">{selectedRecord.venue_id}</span></div>
          <div className="flex justify-between"><span>Name</span><span className="font-semibold text-slate-900">{selectedRecord.name}</span></div>
          <div className="flex justify-between"><span>City</span><span className="font-semibold text-slate-900">{selectedRecord.city}</span></div>
          <div className="flex justify-between"><span>Country</span><span className="font-semibold text-slate-900">{selectedRecord.country}</span></div>
          <div className="flex justify-between"><span>Altitude</span><span className="font-semibold text-slate-900">{selectedRecord.altitude_meters} m</span></div>
          <div className="flex justify-between"><span>June Humidity</span><span className="font-semibold text-slate-900">{selectedRecord.historical_june_humidity}</span></div>
          <div className="flex justify-between"><span>June Temp</span><span className="font-semibold text-slate-900">{selectedRecord.historical_june_temp_c} C</span></div>
        </div>
      );
    }

    return (
      <div className="grid gap-2 text-sm text-slate-600">
        <div className="flex justify-between"><span>Manager</span><span className="font-semibold text-slate-900">{selectedRecord.manager_id}</span></div>
        <div className="flex justify-between"><span>Name</span><span className="font-semibold text-slate-900">{selectedRecord.name}</span></div>
        <div className="flex justify-between"><span>Team</span><span className="font-semibold text-slate-900">{selectedRecord.team_iso}</span></div>
        <div className="flex justify-between"><span>Formation</span><span className="font-semibold text-slate-900">{selectedRecord.preferred_formation}</span></div>
        <div className="flex justify-between"><span>PPDA</span><span className="font-semibold text-slate-900">{selectedRecord.ppda_factor}</span></div>
        <div className="flex justify-between"><span>Line Height</span><span className="font-semibold text-slate-900">{selectedRecord.defensive_line_height} m</span></div>
      </div>
    );
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Reference Desk</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">Scoped database ledger browser</div>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teams, venues, managers..."
          className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white sm:max-w-md"
        />
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-slate-500">Loading reference data...</div>
      ) : error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid gap-2">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
              {tabs.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    setTab(entry.key);
                    setSelectedId(null);
                  }}
                  className={`rounded-xl px-4 py-2 transition ${tab === entry.key ? "bg-slate-900 text-white" : "text-slate-600"}`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              {entries.map((entry) => {
                const title =
                  tab === "teams" ? entry.name : tab === "venues" ? entry.name : entry.name;
                const subtitle =
                  tab === "teams"
                    ? `${entry.team_iso} · ELO ${entry.baseline_elo}`
                    : tab === "venues"
                      ? `${entry.city} · ${entry.country}`
                      : `${entry.team_iso} · ${entry.preferred_formation}`;
                const id = tab === "teams" ? entry.team_iso : tab === "venues" ? entry.venue_id : entry.manager_id;
                return (
                  <ListItem
                    key={id}
                    title={title}
                    subtitle={subtitle}
                    selected={selectedId === id}
                    onClick={() => setSelectedId(id)}
                  />
                );
              })}
              {!entries.length ? <div className="text-sm text-slate-500">No records match your search.</div> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Detail View
            </div>
            {renderDetail()}
          </div>
        </div>
      )}
    </section>
  );
}
