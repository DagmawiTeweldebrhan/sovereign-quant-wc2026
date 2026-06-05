const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const AUTH_TOKEN_KEY = "sqwc_access_token";
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) ?? "";

export function setAuthToken(token) {
  authToken = token ?? "";
  if (authToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function clearAuthToken() {
  setAuthToken("");
}

async function requestJson(path, options = {}) {
  const authorizationHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeaders,
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

export function fetchCurrentUser() {
  return requestJson("/auth/me");
}

export function login(email, password) {
  return requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function registerUser(payload) {
  return requestJson("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
