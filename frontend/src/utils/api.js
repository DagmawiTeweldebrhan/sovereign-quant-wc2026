const AUTH_TOKEN_KEY = "sqwc_access_token";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "WorldCup2026!";
let authToken = localStorage.getItem(AUTH_TOKEN_KEY) || "";

const DEMO_USERS = {
  "admin@quant.local": {
    user_id: "admin",
    email: "admin@quant.local",
    name: "Tournament Admin",
    role: "admin",
    team_iso: "N/A",
  },
  "usa@quant.local": {
    user_id: "usa_viewer",
    email: "usa@quant.local",
    name: "USA Scout",
    role: "viewer",
    team_iso: "USA",
  },
  "mex@quant.local": {
    user_id: "mex_viewer",
    email: "mex@quant.local",
    name: "Mexico Scout",
    role: "viewer",
    team_iso: "MEX",
  },
  "bra@quant.local": {
    user_id: "bra_viewer",
    email: "bra@quant.local",
    name: "Brazil Scout",
    role: "viewer",
    team_iso: "BRA",
  },
  "fra@quant.local": {
    user_id: "fra_viewer",
    email: "fra@quant.local",
    name: "France Scout",
    role: "viewer",
    team_iso: "FRA",
  },
};

function buildDemoSession(email) {
  const user = DEMO_USERS[String(email).trim().toLowerCase()];
  if (!user) {
    return null;
  }

  return {
    access_token: `local.${btoa(user.email)}.${Date.now()}`,
    token_type: "bearer",
    user,
  };
}

export function setAuthToken(token) {
  authToken = String(token || "");
  if (authToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, authToken);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function clearAuthToken() {
  setAuthToken("");
}

function getAuthHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

async function request(path, options = {}) {
  const candidates = [
    normalizeBaseUrl(API_BASE_URL),
    "",
    "/api",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
  ].filter((candidate) => candidate !== undefined && candidate !== null);
  const seen = new Set();
  const payload = {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  };

  let lastError = null;

  for (const baseUrl of candidates) {
    if (seen.has(baseUrl)) {
      continue;
    }
    seen.add(baseUrl);

    const targetUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    try {
      const response = await fetch(targetUrl, payload);
      if (!response.ok) {
        const text = await response.text();
        const error = new Error(text || `Request failed: ${response.status}`);
        error.status = response.status;
        error.body = text;
        throw error;
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (error?.status === 404) {
        continue;
      }
      if (error?.status && error.status < 500) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
}

async function authenticatedRequest(path, token, options = {}) {
  return request(path, {
    ...options,
    headers: {
      ...getAuthHeaders(token ?? authToken),
      ...(options.headers || {}),
    },
  });
}

export async function loginUser(payload) {
  try {
    return await request("/auth/login", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const identifier = String(
      payload?.email || payload?.username || payload?.identifier || "",
    ).trim().toLowerCase();
    const password = String(payload?.password || "");
    const fallback = buildDemoSession(identifier);
    if (fallback && password === DEMO_PASSWORD) {
      return fallback;
    }
    throw error;
  }
}

export async function registerUser(payload) {
  try {
    return await request("/auth/register", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const fallback = buildDemoSession(payload?.email || "");
    if (fallback && String(payload?.password || "") === DEMO_PASSWORD) {
      return fallback;
    }
    throw error;
  }
}

export async function fetchSession(token = authToken) {
  if (!token) {
    return null;
  }
  try {
    return await authenticatedRequest("/auth/me", token);
  } catch (error) {
    return null;
  }
}

export async function fetchCurrentUser() {
  const session = await fetchSession();
  return session?.user ?? null;
}

export async function fetchHealth() {
  try {
    return await request("/health");
  } catch (error) {
    return { status: "offline", detail: error?.message || "unreachable" };
  }
}

export async function fetchUpcomingFixtures(token = authToken) {
  return authenticatedRequest("/fixtures", token);
}

export async function triggerSimulation(fixtureId, token = authToken) {
  return authenticatedRequest(`/simulate/${fixtureId}`, token, {
    method: "POST",
  });
}

export async function fetchTeams(token = authToken) {
  return authenticatedRequest("/teams", token);
}

export async function fetchVenues(token = authToken) {
  return authenticatedRequest("/venues", token);
}

export async function fetchManagers(token = authToken) {
  return authenticatedRequest("/managers", token);
}

export async function createVenue(payload, token = authToken) {
  return authenticatedRequest("/venues", token, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function ingestMatchResult(payload, token = authToken) {
  return authenticatedRequest("/match-results", token, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function fetchFixture(fixtureId, token = authToken) {
  return authenticatedRequest(`/fixtures/${fixtureId}`, token);
}

export async function fetchFixturePrediction(fixtureId, token = authToken) {
  return authenticatedRequest(`/predictions/${fixtureId}`, token);
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
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }

  throw lastError || new Error("Prediction polling failed");
}

export async function login(email, password) {
  const session = await loginUser({ email, password });
  if (session?.access_token) {
    setAuthToken(session.access_token);
  }
  return session;
}
