// client/src/services/api.js
import axios from 'axios';
import { auth } from './firebase';
import analyticsService from './analytics';

// Create an axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    console.error('Error adding token to request:', error);
    return config;
  }
});

// Handle errors globally
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API error:', error);
    analyticsService.trackApiError(
      error.config?.url || 'unknown',
      error.response?.data?.error || error.message,
      error.response?.status
    );
    return Promise.reject(error);
  }
);

// Original functions from Firebase

/**
 * Get data from Firebase database
 * @param {string} path - Firebase database path
 * @returns {Promise<any>} The data or null if not found
 */
export const getData = async (path) => {
  try {
    const dataRef = ref(db, path);
    const snapshot = await get(dataRef);
    
    if (snapshot.exists()) {
      analyticsService.trackApiSuccess(path, 'read');
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    analyticsService.trackApiError(path, error.message);
    throw error;
  }
};

/**
 * Create data in Firebase database
 * @param {string} path - Firebase database path
 * @param {any} data - The data to store
 * @returns {Promise<string>} The key of the created data
 */
export const createData = async (path, data) => {
  try {
    if (path.endsWith('/')) {
      // Generate a new key
      const newRef = push(ref(db, path));
      await set(newRef, data);
      analyticsService.trackApiSuccess(path, 'create');
      return newRef.key;
    } else {
      // Use specified path
      const dataRef = ref(db, path);
      await set(dataRef, data);
      analyticsService.trackApiSuccess(path, 'create');
      return path.split('/').pop();
    }
  } catch (error) {
    analyticsService.trackApiError(path, error.message);
    throw error;
  }
};

/**
 * Update data in Firebase database
 * @param {string} path - Firebase database path
 * @param {any} data - The data to update
 * @returns {Promise<void>}
 */
export const updateData = async (path, data) => {
  try {
    const dataRef = ref(db, path);
    await update(dataRef, data);
    analyticsService.trackApiSuccess(path, 'update');
  } catch (error) {
    analyticsService.trackApiError(path, error.message);
    throw error;
  }
};

/**
 * Delete data from Firebase database
 * @param {string} path - Firebase database path
 * @returns {Promise<void>}
 */
export const deleteData = async (path) => {
  try {
    const dataRef = ref(db, path);
    await remove(dataRef);
    analyticsService.trackApiSuccess(path, 'delete');
  } catch (error) {
    analyticsService.trackApiError(path, error.message);
    throw error;
  }
};

/**
 * Query data by a specific field
 * @param {string} path - Firebase database path
 * @param {string} field - Field to query by
 * @param {any} value - Value to match
 * @returns {Promise<Array>} Array of matching items
 */
export const queryByField = async (path, field, value) => {
  try {
    const dataRef = ref(db, path);
    const dataQuery = query(dataRef, orderByChild(field), equalTo(value));
    const snapshot = await get(dataQuery);
    
    if (snapshot.exists()) {
      analyticsService.trackApiSuccess(`${path}?${field}=${value}`, 'query');
      const data = snapshot.val();
      return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    }
    
    return [];
  } catch (error) {
    analyticsService.trackApiError(path, error.message);
    throw error;
  }
};

// New API endpoints using the backend service

/**
 * Create a lawyer through the backend API
 * @param {Object} lawyerData - Lawyer data including name, email, etc.
 * @returns {Promise<Object>} Created lawyer data
 */
const createLawyer = async (lawyerData) => {
  try {
    const response = await api.post('/users/lawyers', lawyerData);
    analyticsService.trackApiSuccess('createLawyer', 'create');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a lawyer through the backend API
 * @param {string} id - Lawyer ID
 * @param {Object} lawyerData - Updated lawyer data
 * @returns {Promise<Object>} Response data
 */
const updateLawyer = async (id, lawyerData) => {
  try {
    const response = await api.put(`/users/lawyers/${id}`, lawyerData);
    analyticsService.trackApiSuccess(`updateLawyer/${id}`, 'update');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a lawyer through the backend API
 * @param {string} id - Lawyer ID
 * @returns {Promise<Object>} Response data
 */
const deleteLawyer = async (id) => {
  try {
    const response = await api.delete(`/users/lawyers/${id}`);
    analyticsService.trackApiSuccess(`deleteLawyer/${id}`, 'delete');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all lawyers for a law firm through the backend API
 * @param {string} lawFirm - Law firm name/ID
 * @returns {Promise<Array>} Array of lawyers
 */
const getLawyersByLawFirm = async (lawFirm) => {
  try {
    const response = await api.get(`/users/lawyers/law-firm/${encodeURIComponent(lawFirm)}`);
    analyticsService.trackApiSuccess(`getLawyersByLawFirm/${lawFirm}`, 'read');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a secretary through the backend API
 * @param {Object} secretaryData - Secretary data
 * @returns {Promise<Object>} Created secretary data
 */
const createSecretary = async (secretaryData) => {
  try {
    const response = await api.post('/users/secretaries', secretaryData);
    analyticsService.trackApiSuccess('createSecretary', 'create');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Update a secretary through the backend API
 * @param {string} id - Secretary ID
 * @param {Object} secretaryData - Updated secretary data
 * @returns {Promise<Object>} Response data
 */
const updateSecretary = async (id, secretaryData) => {
  try {
    const response = await api.put(`/users/secretaries/${id}`, secretaryData);
    analyticsService.trackApiSuccess(`updateSecretary/${id}`, 'update');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a secretary through the backend API
 * @param {string} id - Secretary ID
 * @returns {Promise<Object>} Response data
 */
const deleteSecretary = async (id) => {
  try {
    const response = await api.delete(`/users/secretaries/${id}`);
    analyticsService.trackApiSuccess(`deleteSecretary/${id}`, 'delete');
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Get the secretary for a law firm through the backend API
 * @param {string} lawFirm - Law firm name/ID
 * @returns {Promise<Object>} Secretary data
 */
const getSecretaryByLawFirm = async (lawFirm) => {
  try {
    const response = await api.get(`/users/secretaries/law-firm/${encodeURIComponent(lawFirm)}`);
    analyticsService.trackApiSuccess(`getSecretaryByLawFirm/${lawFirm}`, 'read');
    return response;
  } catch (error) {
    throw error;
  }
};

const apiService = {
  // Original Firebase functions
  getData,
  createData,
  updateData,
  deleteData,
  queryByField,
  
  // New API endpoints
  createLawyer,
  updateLawyer,
  deleteLawyer,
  getLawyersByLawFirm,
  createSecretary,
  updateSecretary,
  deleteSecretary,
  getSecretaryByLawFirm,
};

export default apiService;