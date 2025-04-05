import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "../../services/firebase";
import logo from "../../assets/logo.png";
import "../../styles/index.css";
import axios from "axios";
import { getApiBaseUrl, getAppDomain } from '../utils/apiConfig';

const RegistrationDescription = () => {
  return (
    <div className="registration-description-frame">
      <div className="description-content">
        <h2>WeAssist: Transforming Legal Services</h2>
        <p>
          At WeAssist, we understand that the legal landscape is evolving, and so are the needs of our clients. Our cutting-edge platform bridges the critical gap between traditional legal services and modern technological solutions.
        </p>
        <p>
          We recognize the challenges professionals face in delivering efficient, accessible legal assistance: time constraints, communication barriers, and the complex process of document management.
        </p>
        <p>
          WeAssist is a comprehensive legal technology solution designed to streamline legal workflows, enhance client communication, and optimize practice management.
        </p>
        <p>
          <strong>Start with a FREE 30-day trial today!</strong> No credit card required. Experience all premium features before deciding on a subscription plan.
        </p>
      </div>
    </div>
  );
};

const Register = () => {
  const [formData, setFormData] = useState({
    lawFirm: "",
    phoneNumber: "",
    email: "",
    specialization: "",
    operatingHours: "",
    licenseNumber: "",
    officeAddress: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      
      // Calculate trial end date (30 days from now)
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);
      
      // Create law firm admin record with trial info
      const lawFirmAdminRef = ref(db, "law_firm_admin/" + user.uid);
      await set(lawFirmAdminRef, {
        lawFirm: formData.lawFirm,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        specialization: formData.specialization || "",
        operatingHours: formData.operatingHours,
        licenseNumber: formData.licenseNumber,
        officeAddress: formData.officeAddress,
        uid: user.uid,
        createdAt: Date.now(),
        subscriptionStatus: 'active',
        subscriptionEndDate: endDate.getTime(),
        isTrial: true
      });
      
      // Create trial subscription on server
      try {
        // Send info to backend
        const response = await axios.post(`${getApiBaseUrl()}/subscriptions`, {
          userId: user.uid,
          planId: 'plan_trial',
          startDate: startDate.getTime()
        });
        
        // Update admin record with subscription ID if successful
        if (response.data && response.data.id) {
          const subscriptionId = response.data.id;
          const updateRef = ref(db, `law_firm_admin/${user.uid}`);
          await set(updateRef, {
            currentSubscription: subscriptionId
          }, { merge: true });
        }
      } catch (subError) {
        console.error("Error creating trial subscription:", subError);
        // Continue registration process even if subscription creation fails
      }
      
      setSuccessMessage("Registration successful! Your 30-day free trial has started.");
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        {/* Add the description frame */}
        <RegistrationDescription />

        <div className="register-logo-side">
          <div className="logo-hexagon">
            <div className="logo-content">
              <img src={logo} alt="WeAssist Logo" />
            </div>
          </div>
          <div className="free-trial-badge">
            <span>FREE 30-DAY TRIAL</span>
            <small>No credit card required</small>
          </div>
        </div>

        <div className="register-form-side">
          <div className="form-header">
            <h2>REGISTER</h2>
            <p className="subtitle">SIGN-UP NOW!</p>
          </div>

          {error && <p className="error-message">{error}</p>}
          {successMessage && <p className="success-message">{successMessage}</p>}

          <form onSubmit={handleRegister} autoComplete="off">
            <div className="form-group">
              <label>FIRM NAME</label>
              <input 
                type="text" 
                name="lawFirm" 
                value={formData.lawFirm}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
              />
            </div>

            <div className="form-group">
              <label>PHONE NUMBER</label>
              <input 
                type="tel" 
                name="phoneNumber" 
                value={formData.phoneNumber}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
              />
            </div>

            <div className="form-group">
              <label>EMAIL</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>PASSWORD</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
                autoComplete="new-password" 
              />
            </div>

            <div className="form-group">
              <label>CONFIRM PASSWORD</label>
              <input 
                type="password" 
                name="confirmPassword" 
                value={formData.confirmPassword}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>OPERATING HOURS</label>
              <input 
                type="text" 
                name="operatingHours" 
                value={formData.operatingHours}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
              />
            </div>

            <div className="form-group">
              <label>LICENSE NUMBER</label>
              <input 
                type="text" 
                name="licenseNumber" 
                value={formData.licenseNumber}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
              />
            </div>

            <div className="form-group">
              <label>OFFICE ADDRESS</label>
              <input 
                type="text" 
                name="officeAddress" 
                value={formData.officeAddress}
                onChange={handleChange} 
                required 
                style={{ color: "black" }}
              />
            </div>

            <button 
              type="submit" 
              className="create-account-btn"
              disabled={isLoading}
            >
              {isLoading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT & START FREE TRIAL"}
            </button>
            
            <p className="terms-note">
              By signing up, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
            </p>
            
            <p className="login-link">
              Already have an account? <a href="/login">Login</a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;