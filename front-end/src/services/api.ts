import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Crucial for Sanctum cookies
});

// Request interceptor to attach CSRF token for non-GET requests
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
    // Fetch CSRF cookie if not already set (Sanctum requirement)
    await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/sanctum/csrf-cookie`, {
      withCredentials: true,
    });
  }
  return config;
});

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if session expires
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;