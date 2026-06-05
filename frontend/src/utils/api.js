const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.detail ?? `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function fetchUpcomingFixtures() {
  return requestJson("/fixtures");
}

export function triggerSimulation(fixtureId) {
  return requestJson(`/simulate/${fixtureId}`, {
    method: "POST",
  });
}

export function fetchFixturePrediction(fixtureId) {
  return requestJson(`/predictions/${fixtureId}`);
}

export async function waitForPrediction(fixtureId, { attempts = 12, intervalMs = 750 } = {}) {
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await fetchFixturePrediction(fixtureId);
    } catch (error) {
      lastError = error;
      if (error?.status !== 404 || attempt === attempts - 1) {
        throw error;
      }
      await sleep(intervalMs);
    }
  }

  throw lastError ?? new Error("Prediction polling failed");
}
