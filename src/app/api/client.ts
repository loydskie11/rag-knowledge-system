import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

/**
 * Centralized Axios instance for all API communication.
 * Automatically handles baseURL, session tokens, and credentials.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Accept": "application/json",
  },
});

function readCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// HttpOnly cookie is the primary credential. Add the double-submit CSRF token
// to state-changing requests authenticated by that cookie.
apiClient.interceptors.request.use(
  (config) => {
    const method = (config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrf = readCookie("csrf_token");
      if (csrf) config.headers["X-CSRF-Token"] = csrf;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/signup" && path !== "/") {
        // Session expired or unauthenticated
        console.warn("[API] 401 Unauthorized encountered.");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
