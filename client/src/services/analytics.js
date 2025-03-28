import { logEvent } from 'firebase/analytics';
import { analytics } from './firebase';

/**
 * Track user events safely
 * @param {string} eventName - Name of the event to track
 * @param {Object} eventParams - Parameters for the event
 */
export const trackEvent = (eventName, eventParams = {}) => {
  if (analytics) {
    try {
      logEvent(analytics, eventName, eventParams);
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }
};

/**
 * Track page views
 * @param {string} pageName - Name of the page being viewed
 * @param {Object} additionalParams - Any additional parameters
 */
export const trackPageView = (pageName, additionalParams = {}) => {
  trackEvent('page_view', {
    page_title: pageName,
    page_location: window.location.href,
    ...additionalParams
  });
};

/**
 * Track user actions
 * @param {string} actionName - Name of the action (e.g., 'click', 'submit')
 * @param {string} category - Category of the action (e.g., 'button', 'form')
 * @param {string} label - Label for the action
 */
export const trackAction = (actionName, category, label) => {
  trackEvent('user_action', {
    action: actionName,
    category,
    label
  });
};

/**
 * Track API errors
 * @param {string} endpoint - The API endpoint that failed
 * @param {string} errorMessage - The error message
 * @param {number} statusCode - HTTP status code (if applicable)
 */
export const trackApiError = (endpoint, errorMessage, statusCode = null) => {
  trackEvent('api_error', {
    endpoint,
    error_message: errorMessage,
    status_code: statusCode
  });
};

/**
 * Track successful API operations
 * @param {string} endpoint - The API endpoint
 * @param {string} operation - Type of operation (e.g., 'create', 'update')
 */
export const trackApiSuccess = (endpoint, operation) => {
  trackEvent('api_success', {
    endpoint,
    operation
  });
};

export default {
  trackEvent,
  trackPageView,
  trackAction,
  trackApiError,
  trackApiSuccess
};