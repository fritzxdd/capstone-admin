import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import "../../styles/index.css";
import logo from "../../assets/logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
  
    try {
      console.log("Attempting login with:", email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User authenticated:", user);
      
      const adminRef = ref(db, "law_firm_admin/" + user.uid);
      const snapshot = await get(adminRef);
      
      console.log("Admin data check:", snapshot.exists());
      
      if (snapshot.exists()) {
        const adminData = snapshot.val();
        
        if (rememberMe) {
          localStorage.setItem("adminData", JSON.stringify(adminData));
        } else {
          sessionStorage.setItem("adminData", JSON.stringify(adminData));
        }
        
        console.log("Login successful, redirecting to dashboard");
        navigate("/");
      } else {
        console.log("Not an admin, signing out");
        setError("Access Denied: You are not an admin!");
        await signOut(auth);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-logo">
          <img src={logo} alt="WeAssist Logo" />
        </div>
        
        <div className="login-form-container">
          <h1>Welcome back</h1>
          <p className="login-subtitle">Please enter your details</p>
          
          {error && (
            <div className="error-message" style={{ color: 'red', marginBottom: '15px' }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ color: "black" }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ color: "black" }}
              />
            </div>
            
            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>
            
            <button 
              type="submit" 
              className="signin-button"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          
          <div className="signup-prompt">
            Don't have an account? <button className="signup-link" onClick={() => navigate("/register")}>Sign up</button>
          </div>
        </div>
      </div>
      
      <div className="login-right">
        <div className="illustration-container">
          {/* Illustration container */}
        </div>
      </div>
    </div>
  );
};

export default Login;