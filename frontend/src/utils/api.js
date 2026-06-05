const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
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

function buildCandidateUrls(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = [API_BASE_URL, "/api", "http://localhost:8000", "http://127.0.0.1:8000"];
  const uniqueCandidates = [...new Set(candidates.filter(Boolean))];
  return uniqueCandidates.map((baseUrl) => {
    const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${trimmedBase}${normalizedPath}`;
  });
}

async function requestJson(path, options = {}) {
  const authorizationHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  const requestInit = {
    headers: {
      "Content-Type": "application/json",
      ...authorizationHeaders,
      ...(options.headers ?? {}),
    },
    ...options,
  };

  const urls = buildCandidateUrls(path);
  let networkError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, requestInit);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload.detail ?? `Request failed: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.message === "Failed to fetch") {
        networkError = error;
        continue;
      }
      throw error;
    }
  }

  throw networkError ?? new Error(`Unable to reach API at ${urls.join(", ")}`);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function fetchUpcomingFixtures() {
  return requestJson("/fixtures");
}

export function fetchFixture(fixtureId) {
  return requestJson(`/fixtures/${fixtureId}`);
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

export function fetchTeams() {
  return requestJson("/teams");
}

export function fetchVenues() {
  return requestJson("/venues");
}

export function fetchManagers() {
  return requestJson("/managers");
}

export function fetchHealth() {
  return requestJson("/health");
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

export function createVenue(payload) {
  return requestJson("/venues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function ingestMatchResult(payload) {
  return requestJson("/match-results", {
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
