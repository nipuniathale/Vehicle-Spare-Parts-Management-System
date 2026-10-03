import axios from "axios";

const TOKEN_KEY = "autohub_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:8080";

/** Pictures served by the backend come back as "/api/..." - turn them into a full URL. */
export const assetUrl = (url) => (url && url.startsWith("/api/") ? `${API_ORIGIN}${url}` : url || null);

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    const err = new Error(
      data?.message || (error.response ? `Request failed (${error.response.status})` : "Cannot reach the server. Is the backend running?")
    );
    err.status = error.response?.status;
    err.fieldErrors = data?.fieldErrors || {};

    if (err.status === 401 && tokenStorage.get() && !error.config.url.includes("/auth/")) {
      tokenStorage.clear();
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(err);
  }
);

/** Standard REST helpers for one resource, e.g. crud("/categories"). */
export function crud(path) {
  return {
    list: (params) => api.get(path, { params }),
    get: (id) => api.get(`${path}/${id}`),
    create: (body) => api.post(path, body),
    update: (id, body) => api.put(`${path}/${id}`, body),
    remove: (id) => api.delete(`${path}/${id}`),
  };
}

export default api;
