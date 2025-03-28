import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      const success = await login(email, password, rememberMe);
      
      if (success) {
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
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
          
          {error && <div className="error-message">{error}</div>}
          
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
              
              <button type="button" className="forgot-password" onClick={() => setError("Password reset functionality coming soon.")}>
                Forgot password?
              </button>
            </div>
            
            <button 
              type="submit" 
              className="signin-button"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
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