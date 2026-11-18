/**
 * Fetch wrapper for TheCarePal API.
 * Automatically attaches Authorization header if token is stored in localStorage,
 * and passes credentials for httpOnly cookies.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('carepal_token');
  
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // Send httpOnly cookies
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // If response is unauthorized, clear token
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('carepal_token');
    localStorage.removeItem('carepal_user');
  }

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `HTTP error ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data;
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body) => apiRequest(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};

export default api;

