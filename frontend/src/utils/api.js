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

