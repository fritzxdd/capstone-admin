import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { auth } from "./services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

// Subscription Protection
import SubscriptionWrapper from "./components/Subscription/SubscriptionWrapper";

// Auth Pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// Admin Pages
import AdminPanel from "./pages/Admin/AdminPanel";
import Profile from "./pages/Admin/Profile";

// Lawyer Pages
import AddLawyer from "./pages/Lawyers/AddLawyer";
import EditLawyer from "./pages/Lawyers/EditLawyer";

// Secretary Pages
import ManageSecretary from "./pages/Secretary/ManageSecretary";

// Legal Pages
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";

// Payment Pages
import PlansSubscription from "./pages/Payments/PlansSubscription";
import PaymentSuccess from "./pages/Payments/PaymentSuccess";

// Components
import Toast from "./components/UI/Toast";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  
  // This ensures we always start from the login page
  useEffect(() => {
    // Check if this is the first load of the application
    const isFirstLoad = sessionStorage.getItem("appInitialized") !== "true";
    
    if (isFirstLoad) {
      // Set the flag to prevent this from running again
      sessionStorage.setItem("appInitialized", "true");
      
      // Clear any stored admin data
      localStorage.removeItem("adminData");
      sessionStorage.removeItem("adminData");
      
      // Sign out the current user
      signOut(auth).then(() => {
        console.log("User signed out on first load");
        setUser(null);
        setLoading(false);
      }).catch(error => {
        console.error("Error signing out:", error);
        setLoading(false);
      });
    } else {
      // Normal auth state monitoring
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("Auth state changed:", currentUser ? "User logged in" : "No user");
        setUser(currentUser);
        setLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        console.log("User logged out successfully");
        // Clear stored data
        localStorage.removeItem("adminData");
        sessionStorage.removeItem("adminData");
        showToast("Logged out successfully", "success");
      })
      .catch((error) => {
        console.error("Error signing out: ", error.message);
        showToast(`Error signing out: ${error.message}`, "error");
      });
  };
  
  // Toast message handler
  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ ...toast, visible: false });
    }, 5000);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h2>Loading...</h2>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {toast.visible && <Toast message={toast.message} type={toast.type} />}
      
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/" /> : <Register />} 
        />
        
        {/* Subscription Pages - Always Accessible */}
        <Route 
          path="/plans" 
          element={user ? <PlansSubscription showToast={showToast} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/payment-success" 
          element={user ? <PaymentSuccess showToast={showToast} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/privacy" 
          element={user ? <PrivacyPolicy /> : <Navigate to="/login" />} 
        />
        
        {/* Dashboard - Always Accessible */}
        <Route 
          path="/" 
          element={user ? (
            <AdminPanel user={user} onLogout={handleLogout} showToast={showToast} />
          ) : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/profile" 
          element={user ? <Profile showToast={showToast} /> : <Navigate to="/login" />} 
        />
        
        {/* Protected Routes - Need Active Subscription */}
        <Route 
          path="/lawyers/add" 
          element={
            user ? (
              <SubscriptionWrapper>
                <AddLawyer showToast={showToast} />
              </SubscriptionWrapper>
            ) : <Navigate to="/login" />
          } 
        />
        
        <Route 
          path="/lawyers/edit/:id" 
          element={
            user ? (
              <SubscriptionWrapper>
                <EditLawyer showToast={showToast} />
              </SubscriptionWrapper>
            ) : <Navigate to="/login" />
          } 
        />
        
        <Route 
          path="/secretary/manage" 
          element={
            user ? (
              <SubscriptionWrapper>
                <ManageSecretary showToast={showToast} />
              </SubscriptionWrapper>
            ) : <Navigate to="/login" />
          } 
        />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;