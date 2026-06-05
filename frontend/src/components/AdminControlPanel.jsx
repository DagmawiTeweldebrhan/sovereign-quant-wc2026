import React, { useMemo, useState } from "react";
import { createVenue, ingestMatchResult } from "../utils/api";

const emptyVenue = {
  venue_id: "",
  name: "",
  city: "",
  country: "USA",
  altitude_meters: "",
  historical_june_humidity: "",
  historical_june_temp_c: "",
};

const emptyResult = {
  fixture_id: "",
  home_score: "",
  away_score: "",
};

export default function AdminControlPanel({ onCompleted }) {
  const [activeTab, setActiveTab] = useState("result");
  const [venueForm, setVenueForm] = useState(emptyVenue);
  const [resultForm, setResultForm] = useState(emptyResult);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const venuePayload = useMemo(
    () => ({
      ...venueForm,
      altitude_meters: Number(venueForm.altitude_meters),
      historical_june_humidity: Number(venueForm.historical_june_humidity),
      historical_june_temp_c: Number(venueForm.historical_june_temp_c),
    }),
    [venueForm],
  );

  const resultPayload = useMemo(
    () => ({
      fixture_id: resultForm.fixture_id,
      home_score: Number(resultForm.home_score),
      away_score: Number(resultForm.away_score),
      status: "COMPLETED",
    }),
    [resultForm],
  );

  const submitVenue = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await createVenue(venuePayload);
      setVenueForm(emptyVenue);
      setNotice("Venue saved and available in the ledger.");
      onCompleted?.();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const submitResult = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await ingestMatchResult(resultPayload);
      setResultForm(emptyResult);
      setNotice("Match result ingested and cached prediction invalidated.");
      onCompleted?.();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Admin Console</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">Ledger Writes</div>
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
          <button
            className={`rounded-xl px-4 py-2 transition ${activeTab === "result" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setActiveTab("result")}
            type="button"
          >
            Match Result
          </button>
          <button
            className={`rounded-xl px-4 py-2 transition ${activeTab === "venue" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setActiveTab("venue")}
            type="button"
          >
            Venue
          </button>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{notice}</div>
      ) : null}

      {activeTab === "result" ? (
        <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={submitResult}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Fixture ID
            <input
              className={inputClass}
              value={resultForm.fixture_id}
              onChange={(event) => setResultForm((current) => ({ ...current, fixture_id: event.target.value }))}
              placeholder="fixture_usa_mex"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Home Score
            <input
              type="number"
              min="0"
              className={inputClass}
              value={resultForm.home_score}
              onChange={(event) => setResultForm((current) => ({ ...current, home_score: event.target.value }))}
              placeholder="2"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Away Score
            <input
              type="number"
              min="0"
              className={inputClass}
              value={resultForm.away_score}
              onChange={(event) => setResultForm((current) => ({ ...current, away_score: event.target.value }))}
              placeholder="1"
            />
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Ingest Match Result"}
            </button>
          </div>
        </form>
      ) : (
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitVenue}>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Venue ID
            <input
              className={inputClass}
              value={venueForm.venue_id}
              onChange={(event) => setVenueForm((current) => ({ ...current, venue_id: event.target.value }))}
              placeholder="stadium_azteca"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Venue Name
            <input
              className={inputClass}
              value={venueForm.name}
              onChange={(event) => setVenueForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Estadio Azteca"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            City
            <input
              className={inputClass}
              value={venueForm.city}
              onChange={(event) => setVenueForm((current) => ({ ...current, city: event.target.value }))}
              placeholder="Mexico City"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Country
            <input
              className={inputClass}
              value={venueForm.country}
              onChange={(event) => setVenueForm((current) => ({ ...current, country: event.target.value.toUpperCase() }))}
              placeholder="MEX"
              maxLength={3}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Altitude (m)
            <input
              type="number"
              min="0"
              className={inputClass}
              value={venueForm.altitude_meters}
              onChange={(event) => setVenueForm((current) => ({ ...current, altitude_meters: event.target.value }))}
              placeholder="2240"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            June Humidity
            <input
              type="number"
              min="0"
              className={inputClass}
              value={venueForm.historical_june_humidity}
              onChange={(event) =>
                setVenueForm((current) => ({ ...current, historical_june_humidity: event.target.value }))
              }
              placeholder="58"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            June Temperature C
            <input
              type="number"
              min="-10"
              className={inputClass}
              value={venueForm.historical_june_temp_c}
              onChange={(event) => setVenueForm((current) => ({ ...current, historical_june_temp_c: event.target.value }))}
              placeholder="22"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create Venue"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
