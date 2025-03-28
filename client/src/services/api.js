import { ref, get, set, update, remove, push, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase';
import analyticsService from './analytics';

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

// Specialized functions for common operations

/**
 * Get a lawyer by ID
 * @param {string} id - Lawyer ID
 * @returns {Promise<Object>} Lawyer data
 */
export const getLawyer = async (id) => {
  return getData(`lawyers/${id}`);
};

/**
 * Get all lawyers for a law firm
 * @param {string} lawFirmId - Law firm ID/name
 * @returns {Promise<Array>} Array of lawyers
 */
export const getLawyersByLawFirm = async (lawFirmId) => {
  return queryByField('lawyers', 'lawFirm', lawFirmId);
};

/**
 * Update a lawyer
 * @param {string} id - Lawyer ID
 * @param {Object} data - Updated lawyer data
 * @returns {Promise<void>}
 */
export const updateLawyer = async (id, data) => {
  return updateData(`lawyers/${id}`, data);
};

export default {
  getData,
  createData,
  updateData,
  deleteData,
  queryByField,
  getLawyer,
  getLawyersByLawFirm,
  updateLawyer
};