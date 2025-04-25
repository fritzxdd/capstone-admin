/**
 * FirebaseHelper.js - Utility functions for interacting with Firebase
 * These functions can be imported in your components to ensure consistent handling
 * of subscription data.
 */

import { ref, get, update, set } from "firebase/database";
import { db } from "../services/firebase";

/**
 * Calculate remaining days from an end date
 * @param {number} endTimestamp - Timestamp for the end date
 * @returns {number} Number of days remaining
 */
export const calculateRemainingDays = (endTimestamp) => {
  const now = Date.now();
  if (endTimestamp > now) {
    return Math.ceil((endTimestamp - now) / (1000 * 60 * 60 * 24));
  }
  return 0;
};

/**
 * Get plan duration in days
 * @param {string} planId - ID of the subscription plan
 * @returns {number} Duration in days
 */
export const getPlanDuration = (planId) => {
  switch (planId) {
    case 'plan_6months':
      return 180;
    case 'plan_1year':
      return 365;
    case 'plan_1month':
    default:
      return 30;
  }
};

/**
 * Get plan name for display
 * @param {string} planId - ID of the subscription plan
 * @returns {string} Human-readable plan name
 */
export const getPlanName = (planId) => {
  const planNames = {
    'plan_trial': 'Free Trial',
    'plan_1month': '1 Month Plan',
    'plan_6months': '6 Months Plan',
    'plan_1year': '1 Year Plan'
  };
  return planNames[planId] || 'Subscription';
};

/**
 * Update user subscription data in Firebase
 * @param {string} userId - User ID
 * @param {string} planId - ID of the new subscription plan
 * @param {string} paymentId - Payment transaction ID
 * @returns {Promise<Object>} The updated subscription data
 */
export const updateSubscription = async (userId, planId, paymentId) => {
  try {
    console.log(`Updating subscription: User=${userId}, Plan=${planId}, Payment=${paymentId}`);
    
    // Get the user's current data
    const userRef = ref(db, `law_firm_admin/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      throw new Error(`User data not found for ID: ${userId}`);
    }
    
    // Extract current user data
    const userData = snapshot.val();
    console.log("Current user data:", userData);
    
    // Calculate remaining days from current subscription if active
    let additionalDays = 0;
    const now = Date.now();
    
    if (userData.subscriptionStatus === 'active' && userData.subscriptionEndDate > now) {
      additionalDays = calculateRemainingDays(userData.subscriptionEndDate);
      console.log(`Current subscription has ${additionalDays} days remaining`);
    }
    
    // Get plan duration and calculate total duration
    const planDuration = getPlanDuration(planId);
    const totalDuration = planDuration + additionalDays;
    
    // Calculate new end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalDuration);
    
    console.log(`New subscription details:
      - Plan: ${planId} (${planDuration} days)
      - Additional days: ${additionalDays}
      - Total duration: ${totalDuration} days
      - Start date: ${startDate.toISOString()}
      - End date: ${endDate.toISOString()}`);
    
    // Create subscription data object
    const subscriptionData = {
      subscriptionStatus: 'active',
      subscriptionEndDate: endDate.getTime(),
      isTrial: false,
      currentPlan: planId,
      paymentId: paymentId,
      lastPaymentDate: startDate.getTime()
    };
    
    // Update user data in Firebase - only update subscription fields, keep others intact
    await update(userRef, subscriptionData);
    console.log("Subscription data updated in Firebase");
    
    // Create subscription record for tracking
    const subscriptionRef = ref(db, `subscriptions/${paymentId}`);
    await set(subscriptionRef, {
      userId,
      planId,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      status: 'active',
      additionalDays,
      totalDuration,
      paymentId,
      createdAt: Date.now()
    });
    console.log("Subscription record created");
    
    // Update the user record with reference to subscription
    await update(userRef, {
      currentSubscription: paymentId
    });
    
    return {
      ...subscriptionData,
      remainingDays: totalDuration
    };
  } catch (error) {
    console.error("Error updating subscription:", error);
    throw error;
  }
};

/**
 * Get current subscription status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Subscription status information
 */
export const getSubscriptionStatus = async (userId) => {
  try {
    const userRef = ref(db, `law_firm_admin/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return {
        status: 'none',
        isTrial: false,
        remainingDays: 0,
        planName: ''
      };
    }
    
    const userData = snapshot.val();
    const now = Date.now();
    const endDate = userData.subscriptionEndDate || 0;
    const status = userData.subscriptionStatus || 'none';
    const isTrial = userData.isTrial || false;
    const currentPlan = userData.currentPlan || '';
    
    // Calculate remaining days
    const remainingDays = calculateRemainingDays(endDate);
    
    // Determine if subscription has expired
    const isExpired = endDate < now && status === 'active';
    const effectiveStatus = isExpired ? 'expired' : status;
    
    return {
      status: effectiveStatus,
      endDate,
      isTrial,
      remainingDays,
      planName: getPlanName(currentPlan),
      currentPlan
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    throw error;
  }
};