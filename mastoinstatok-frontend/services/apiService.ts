// aiFE/services/apiService.ts

const BASE_URL = 'https://bbd-grad-project.co.za/api';

/**
 * A wrapper around the native fetch API for session-based authentication.
 * - Automatically includes credentials (cookies) on every request.
 * - Handles 401 Unauthorized responses by redirecting to the login page,
 * unless the user is already on the login page.
 * - Throws an error for other non-successful responses.
 */
async function fetcher(endpoint: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // DO NOT REMOVE. Needed for sessions.
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
    
    // We still throw an error so the calling function knows the request failed.
    throw new Error('Session expired or not authenticated.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  return {};
}

export const apiService = {
  get: (endpoint: string, options?: RequestInit) => fetcher(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body?: any, options?: RequestInit) => fetcher(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : null, headers: { 'Content-Type': 'application/json', ...options?.headers } }),
// add delete, put, patch here
};
