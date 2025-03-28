import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, analytics } from "../../services/firebase";
import { logEvent } from "firebase/analytics";
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const adminRef = ref(db, "law_firm_admin/" + user.uid);
      const snapshot = await get(adminRef);
      
      if (snapshot.exists()) {
        const adminData = snapshot.val();
        
        if (rememberMe) {
          localStorage.setItem("adminData", JSON.stringify(adminData));
        } else {
          sessionStorage.setItem("adminData", JSON.stringify(adminData));
        }
        
        // Track successful login event
        if (analytics) {
          logEvent(analytics, "login", { 
            method: "email_password",
            admin_id: user.uid
          });
        }
        
        navigate("/");
      } else {
        setError("Access Denied: You are not an admin!");
        await signOut(auth);
        
        if (analytics) {
          logEvent(analytics, "login_error", { 
            error_type: "not_admin"
          });
        }
      }
    } catch (error) {
      setError(`${error.message.includes("auth/invalid-credential") ? 
        "Invalid email or password. Please try again." : 
        `Login failed: ${error.message}`}`);
      
      if (analytics) {
        logEvent(analytics, "login_error", { 
          error_type: error.code || "unknown_error"
        });
      }
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
          <h1>Welcome to WeAssist</h1>
          <p className="login-subtitle">Sign in to manage your law firm</p>
          
          {error && (
            <div className="error-message">
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
          <div className="login-illustration-text">
            <h2>Legal Management Made Simple</h2>
            <p>Manage your law firm with our comprehensive platform designed specifically for legal professionals.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;