// client/src/services/api.js
import axios from 'axios';
import { auth, db } from './firebase';
import { ref, get, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import analyticsService from './analytics';
import { getApiBaseUrl } from '../utils/apiConfig';

// Create an axios instance with base URL
const api = axios.create({
  baseURL: getApiBaseUrl(),
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

// Firebase Direct Operations - More reliable when backend is causing issues
// =======================================================================

/**
 * Get data from Firebase database
 * @param {string} path - Firebase database path
 * @returns {Promise<any>} The data or null if not found
 */
export const getData = async (path) => {
  try {
    console.log(`Getting data from path: ${path}`);
    const dataRef = ref(db, path);
    const snapshot = await get(dataRef);
    
    if (snapshot.exists()) {
      analyticsService.trackApiSuccess(path, 'read');
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting data from ${path}:`, error);
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
    console.log(`Creating data at path: ${path}`, data);
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
    console.error(`Error creating data at ${path}:`, error);
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
    console.log(`Updating data at path: ${path}`, data);
    const dataRef = ref(db, path);
    await update(dataRef, data);
    analyticsService.trackApiSuccess(path, 'update');
  } catch (error) {
    console.error(`Error updating data at ${path}:`, error);
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
    console.log(`Deleting data at path: ${path}`);
    const dataRef = ref(db, path);
    await remove(dataRef);
    analyticsService.trackApiSuccess(path, 'delete');
  } catch (error) {
    console.error(`Error deleting data at ${path}:`, error);
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
    console.log(`Querying ${path} where ${field} = ${value}`);
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
    console.error(`Error querying ${path} where ${field} = ${value}:`, error);
    analyticsService.trackApiError(path, error.message);
    throw error;
  }
};

// REST API Endpoints with Fallback to Firebase Direct (for reliability)
// ====================================================================

/**
 * Create a lawyer with fallback to direct Firebase
 * @param {Object} lawyerData - Lawyer data
 * @returns {Promise<Object>} Created lawyer data
 */
const createLawyer = async (lawyerData) => {
  try {
    // Try API endpoint first
    console.log('Creating lawyer via API:', lawyerData);
    const response = await api.post('/users/lawyers', lawyerData);
    analyticsService.trackApiSuccess('createLawyer', 'create');
    return response;
  } catch (error) {
    console.error('Error creating lawyer via API:', error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase operation
    try {
      // Implementation would depend on your authentication flow
      // This is a simplified version
      const lawyerUID = lawyerData.uid || Date.now().toString();
      await createData(`lawyers/${lawyerUID}`, lawyerData);
      return { id: lawyerUID, ...lawyerData };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Update a lawyer with fallback to direct Firebase
 * @param {string} id - Lawyer ID
 * @param {Object} lawyerData - Updated lawyer data
 * @returns {Promise<Object>} Response data
 */
const updateLawyer = async (id, lawyerData) => {
  try {
    // Try API endpoint first
    console.log(`Updating lawyer ${id} via API:`, lawyerData);
    const response = await api.put(`/users/lawyers/${id}`, lawyerData);
    analyticsService.trackApiSuccess(`updateLawyer/${id}`, 'update');
    return response;
  } catch (error) {
    console.error(`Error updating lawyer ${id} via API:`, error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase operation
    try {
      await updateData(`lawyers/${id}`, lawyerData);
      return { message: 'Lawyer updated successfully via direct Firebase operation' };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Delete a lawyer with fallback to direct Firebase
 * @param {string} id - Lawyer ID
 * @returns {Promise<Object>} Response data
 */
const deleteLawyer = async (id) => {
  try {
    // Try API endpoint first
    console.log(`Deleting lawyer ${id} via API`);
    const response = await api.delete(`/users/lawyers/${id}`);
    analyticsService.trackApiSuccess(`deleteLawyer/${id}`, 'delete');
    return response;
  } catch (error) {
    console.error(`Error deleting lawyer ${id} via API:`, error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase operation
    try {
      await deleteData(`lawyers/${id}`);
      return { message: 'Lawyer deleted successfully via direct Firebase operation' };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Get all lawyers for a law firm with fallback to direct Firebase
 * @param {string} lawFirm - Law firm name/ID
 * @returns {Promise<Array>} Array of lawyers
 */
const getLawyersByLawFirm = async (lawFirm) => {
  try {
    // Try API endpoint first
    console.log(`Getting lawyers for law firm ${lawFirm} via API`);
    const response = await api.get(`/users/lawyers/law-firm/${encodeURIComponent(lawFirm)}`);
    analyticsService.trackApiSuccess(`getLawyersByLawFirm/${lawFirm}`, 'read');
    return response;
  } catch (error) {
    console.error(`Error getting lawyers for law firm ${lawFirm} via API:`, error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase query
    try {
      return await queryByField('lawyers', 'lawFirm', lawFirm);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Create a secretary with fallback to direct Firebase
 * @param {Object} secretaryData - Secretary data
 * @returns {Promise<Object>} Created secretary data
 */
const createSecretary = async (secretaryData) => {
  try {
    // Try API endpoint first
    console.log('Creating secretary via API:', secretaryData);
    const response = await api.post('/users/secretaries', secretaryData);
    analyticsService.trackApiSuccess('createSecretary', 'create');
    return response;
  } catch (error) {
    console.error('Error creating secretary via API:', error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase operation
    try {
      // Implementation would depend on your authentication flow
      // This is a simplified version
      const secretaryUID = secretaryData.uid || Date.now().toString();
      await createData(`secretaries/${secretaryUID}`, secretaryData);
      return { id: secretaryUID, ...secretaryData };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Update a secretary with fallback to direct Firebase
 * @param {string} id - Secretary ID
 * @param {Object} secretaryData - Updated secretary data
 * @returns {Promise<Object>} Response data
 */
const updateSecretary = async (id, secretaryData) => {
  try {
    // Try API endpoint first
    console.log(`Updating secretary ${id} via API:`, secretaryData);
    const response = await api.put(`/users/secretaries/${id}`, secretaryData);
    analyticsService.trackApiSuccess(`updateSecretary/${id}`, 'update');
    return response;
  } catch (error) {
    console.error(`Error updating secretary ${id} via API:`, error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase operation
    try {
      await updateData(`secretaries/${id}`, secretaryData);
      return { message: 'Secretary updated successfully via direct Firebase operation' };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Delete a secretary with fallback to direct Firebase
 * @param {string} id - Secretary ID
 * @returns {Promise<Object>} Response data
 */
const deleteSecretary = async (id) => {
  try {
    // Try API endpoint first
    console.log(`Deleting secretary ${id} via API`);
    const response = await api.delete(`/users/secretaries/${id}`);
    analyticsService.trackApiSuccess(`deleteSecretary/${id}`, 'delete');
    return response;
  } catch (error) {
    console.error(`Error deleting secretary ${id} via API:`, error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase operation
    try {
      await deleteData(`secretaries/${id}`);
      return { message: 'Secretary deleted successfully via direct Firebase operation' };
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

/**
 * Get the secretary for a law firm with fallback to direct Firebase
 * @param {string} lawFirm - Law firm name/ID
 * @returns {Promise<Object>} Secretary data
 */
const getSecretaryByLawFirm = async (lawFirm) => {
  try {
    // Try API endpoint first
    console.log(`Getting secretary for law firm ${lawFirm} via API`);
    const response = await api.get(`/users/secretaries/law-firm/${encodeURIComponent(lawFirm)}`);
    analyticsService.trackApiSuccess(`getSecretaryByLawFirm/${lawFirm}`, 'read');
    return response;
  } catch (error) {
    console.error(`Error getting secretary for law firm ${lawFirm} via API:`, error);
    console.log('Falling back to direct Firebase operation');
    
    // Fall back to direct Firebase query
    try {
      console.log(`Querying secretaries directly where lawFirm = ${lawFirm}`);
      const secretaries = await queryByField('secretaries', 'lawFirm', lawFirm);
      
      // Return the first secretary found (assuming one per law firm)
      if (secretaries && secretaries.length > 0) {
        console.log(`Found secretary directly:`, secretaries[0]);
        return secretaries[0];
      }
      
      console.log('No secretary found for this law firm');
      return null;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

const apiService = {
  // Original Firebase functions
  getData,
  createData,
  updateData,
  deleteData,
  queryByField,
  
  // API endpoints with fallbacks
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