import { API_BASE_URL } from "../constants/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("caredify_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiFetch = async (endpoint, options = {}) => {
  const { headers, ...rest } = options;
  const config = {
    ...rest,
    headers: {
      ...getAuthHeaders(),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (response.status === 401) {
    // Handle unauthorized (optional: redirect to login or clear token)
    // localStorage.removeItem("caredify_token");
  }

  return response;
};

export const apiGet = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: "GET" });
export const apiPost = (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: "POST", body: JSON.stringify(body) });
export const apiPut = (endpoint, body, options = {}) => apiFetch(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (endpoint, options = {}) => apiFetch(endpoint, { ...options, method: "DELETE" });
