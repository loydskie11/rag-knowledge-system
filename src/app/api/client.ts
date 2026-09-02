import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

// Request Interceptor: Attach bearer token automatically if present
apiClient.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("userToken");
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
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
