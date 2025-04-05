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
  const [debugInfo, setDebugInfo] = useState("");
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setDebugInfo(""); // Clear previous debug info
    setLoading(true);
  
    try {
      setDebugInfo(prev => prev + "Attempting to sign in with Firebase Auth...\n");
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      setDebugInfo(prev => prev + `Authentication successful for user: ${user.uid}\n`);
      
      const adminRef = ref(db, "law_firm_admin/" + user.uid);
      setDebugInfo(prev => prev + `Checking if user is admin at path: law_firm_admin/${user.uid}\n`);
      
      try {
        const snapshot = await get(adminRef);
        
        if (snapshot.exists()) {
          setDebugInfo(prev => prev + "Admin data found. User is authorized.\n");
          const adminData = snapshot.val();
          
          // Log the admin data to debug
          setDebugInfo(prev => prev + `Admin data found: ${JSON.stringify(adminData).substring(0, 100)}...\n`);
          
          if (rememberMe) {
            localStorage.setItem("adminData", JSON.stringify(adminData));
            setDebugInfo(prev => prev + "Storing admin data in localStorage\n");
          } else {
            sessionStorage.setItem("adminData", JSON.stringify(adminData));
            setDebugInfo(prev => prev + "Storing admin data in sessionStorage\n");
          }
          
          // Track successful login event
          if (analytics) {
            logEvent(analytics, "login", { 
              method: "email_password",
              admin_id: user.uid
            });
            setDebugInfo(prev => prev + "Logged login event to analytics\n");
          }
          
          setDebugInfo(prev => prev + "Navigating to dashboard...\n");
          
          // Add a small delay to make sure storage operations complete
          setTimeout(() => {
            navigate("/");
          }, 500);
          
        } else {
          setDebugInfo(prev => prev + "⚠️ NO ADMIN DATA FOUND for this user. Access denied.\n");
          setError("Access Denied: You are not an admin!");
          await signOut(auth);
          
          if (analytics) {
            logEvent(analytics, "login_error", { 
              error_type: "not_admin"
            });
          }
        }
      } catch (dbError) {
        setDebugInfo(prev => prev + `⚠️ Error fetching admin data: ${dbError.message}\n`);
        setError(`Database error: ${dbError.message}`);
        
        if (analytics) {
          logEvent(analytics, "login_error", { 
            error_type: "database_error"
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      setDebugInfo(prev => prev + `⚠️ Authentication error: ${error.code} - ${error.message}\n`);
      
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
          
          {/* Debug information - only visible during troubleshooting */}
          {debugInfo && (
            <div className="debug-info" style={{
              backgroundColor: "#f8f9fa",
              border: "1px solid #dee2e6",
              borderRadius: "4px",
              padding: "10px",
              marginBottom: "15px",
              fontSize: "12px",
              whiteSpace: "pre-line",
              fontFamily: "monospace",
              overflowX: "auto"
            }}>
              <strong>Debug Info:</strong><br/>
              {debugInfo}
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