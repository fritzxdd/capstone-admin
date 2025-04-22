// client/src/utils/apiConfig.js
export const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    return '/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

export const getServerBaseUrl = () => {
  if (import.meta.env.PROD) {
    return '';
  }
  return 'http://localhost:5000';
};

export const getAppDomain = () => {
  return window.location.origin;
};

export default {
  getApiBaseUrl,
  getServerBaseUrl,
  getAppDomain
};