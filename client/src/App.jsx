import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const AppRoutes = () => {
  const { currentUser, logout } = useAuth();
  
  return (
    <Routes>
      {/* Auth Routes */}
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to="/" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={currentUser ? <Navigate to="/" /> : <Register />} 
      />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <AdminPanel onLogout={logout} />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/lawyers/add" 
        element={
          <ProtectedRoute>
            <AddLawyer />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/lawyers/edit/:id" 
        element={
          <ProtectedRoute>
            <EditLawyer />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/secretary/manage" 
        element={
          <ProtectedRoute>
            <ManageSecretary />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/privacy" 
        element={
          <ProtectedRoute>
            <PrivacyPolicy />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/plans" 
        element={
          <ProtectedRoute>
            <PlansSubscription />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/payment-success" 
        element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;