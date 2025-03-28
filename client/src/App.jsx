import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { auth } from "./services/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

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

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
      })
      .catch((error) => {
        console.error("Error signing out: ", error.message);
      });
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
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/" /> : <Register />} 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={user ? <AdminPanel user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/profile" 
          element={user ? <Profile /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/lawyers/add" 
          element={user ? <AddLawyer /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/lawyers/edit/:id" 
          element={user ? <EditLawyer /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/secretary/manage" 
          element={user ? <ManageSecretary /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/privacy" 
          element={user ? <PrivacyPolicy /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/plans" 
          element={user ? <PlansSubscription /> : <Navigate to="/login" />} 
        />
        
        <Route 
          path="/payment-success" 
          element={user ? <PaymentSuccess /> : <Navigate to="/login" />} 
        />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
};

export default App;