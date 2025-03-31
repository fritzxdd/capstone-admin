import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../../services/firebase';
import { ref, onValue } from 'firebase/database';
import Loading from '../UI/Loading';

// List of routes that need active subscription
const PROTECTED_ROUTES = [
  '/lawyers/add',
  '/lawyers/edit',
  '/secretary/manage',
  '/reports',
  '/analytics'
];

// Routes that will remain accessible even after trial expiration
const ALWAYS_ACCESSIBLE = [
  '/',
  '/login',
  '/register',
  '/plans',
  '/profile',
  '/privacy',
  '/terms',
  '/payment-success'
];

/**
 * A wrapper component that checks subscription status and restricts access
 * to certain features after trial expiration
 */
const SubscriptionWrapper = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const location = useLocation();
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setHasAccess(false);
      return;
    }
    
    // Check if current route needs protection
    const needsProtection = PROTECTED_ROUTES.some(route => 
      location.pathname.startsWith(route)
    );
    
    // If route doesn't need protection, allow access
    if (!needsProtection || ALWAYS_ACCESSIBLE.includes(location.pathname)) {
      setLoading(false);
      setHasAccess(true);
      return;
    }
    
    // Otherwise, check subscription status
    const userRef = ref(db, `law_firm_admin/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Check subscription status
        const now = Date.now();
        const endDate = userData.subscriptionEndDate || 0;
        const status = userData.subscriptionStatus || 'none';
        
        // Set access based on active subscription
        setHasAccess(status === 'active' && endDate > now);
      } else {
        setHasAccess(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [location.pathname]);
  
  if (loading) {
    return <Loading fullScreen message="Checking access..." />;
  }
  
  // If no access, redirect to plans page
  if (!hasAccess && !ALWAYS_ACCESSIBLE.includes(location.pathname)) {
    return <Navigate to="/plans" state={{ 
      from: location,
      message: "Your trial or subscription has expired. Please upgrade to continue using this feature."
    }} />;
  }
  
  return children;
};

export default SubscriptionWrapper;