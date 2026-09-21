import axios from "axios";

// In the original same-origin setup Django serves the built frontend, so a
// relative "/api" works. Once the frontend is deployed separately (e.g. on
// Vercel) it has no "/api" of its own, so the Railway backend's URL must be
// supplied at build time via VITE_API_BASE_URL (see frontend/.env.example).
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
          localStorage.setItem("access_token", res.data.access);
          originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
