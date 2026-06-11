import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// Custom error class for offline scenarios (SRP)
export class OfflineError extends Error {
  public readonly isOffline = true;
  constructor(message = "You're offline. Please check your internet connection.") {
    super(message);
    this.name = 'OfflineError';
  }
}

// Request interceptor: block mutations when offline
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);

  if (!navigator.onLine && isMutation) {
    return Promise.reject(new OfflineError());
  }
  return config;
});

// Response interceptor: convert network errors to OfflineError
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Network error (no response received) + browser is offline
    if (!error.response && !navigator.onLine) {
      return Promise.reject(new OfflineError());
    }
    return Promise.reject(error);
  }
);

export default api;