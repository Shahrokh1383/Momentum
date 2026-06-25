import axios from 'axios';

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

// Sanctum CSRF Interceptor: Automatically fetches cookie before state-changing requests
api.interceptors.request.use(async (config) => {
  const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
  const isStateChanging = stateChangingMethods.includes(config.method?.toLowerCase() || '');
  
  const hasCsrfToken = document.cookie.split('; ').some(row => row.startsWith('XSRF-TOKEN='));
  
  if (isStateChanging && !hasCsrfToken && config.url !== '/sanctum/csrf-cookie') {
    await api.get('/sanctum/csrf-cookie');
  }
  
  return config;
});

export default api;