import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../services/firebase";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import FormLayout from "../../components/Layout/FormLayout";
import "../../styles/index.css";

const AddSecretary = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [adminCredentials, setAdminCredentials] = useState({
    email: "",
    password: ""
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [isPasswordGenerated, setIsPasswordGenerated] = useState(false);

  // Display toast message
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("User authentication required");
          navigate("/login");
          return;
        }

        setAdminCredentials(prev => ({ ...prev, email: user.email }));
        
        const adminRef = ref(db, `law_firm_admin/${user.uid}`);
        const snapshot = await get(adminRef);
        
        if (snapshot.exists()) {
          setLawFirmAdmin(snapshot.val());
        } else {
          setError("Error: Law firm admin not found!");
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
        setError("Failed to load admin data: " + error.message);
      }
    };

    fetchAdminData();
  }, [navigate]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));

    // If user is typing in the password field, turn off the generated password flag
    if (name === "password" && isPasswordGenerated) {
      setIsPasswordGenerated(false);
    }
  };

  // Generate a temporary password
  const generateTemporaryPassword = () => {
    // Generate a random password: "Temp" + 4 random digits + "!"
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const tempPassword = `Temp${randomDigits}!`;
    setGeneratedPassword(tempPassword);
    setFormData(prevState => ({
      ...prevState,
      password: tempPassword
    }));
    setIsPasswordGenerated(true);
    
    return tempPassword;
  };

  // Validate form
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Secretary name is required");
      return false;
    }
    
    if (!formData.email.trim()) {
      setError("Email is required");
      return false;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (!adminCredentials.password) {
      setError("Admin password is required to create a new secretary");
      return false;
    }
    
    return true;
  };

  // Add secretary
  const handleAddSecretary = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!lawFirmAdmin) {
      setError("Law firm admin data not loaded");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      // Store admin information for relogin
      const adminUser = auth.currentUser;
      const adminUID = adminUser.uid;
      const adminEmail = adminCredentials.email;
      const adminPassword = adminCredentials.password;
      
      // First, verify the admin password is correct
      try {
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        // Password is correct, continue (still logged in as admin)
      } catch (error) {
        setError("Admin password is incorrect. Please try again.");
        setIsLoading(false);
        return;
      }
      
      // Create the secretary user
      try {
        // This will log out the admin and log in as the secretary
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          formData.email, 
          formData.password
        );
        
        // Send verification email to the secretary
        await sendEmailVerification(userCredential.user);
        
        const secretaryUID = userCredential.user.uid;
        
        // Save secretary data to database
        await set(ref(db, `secretaries/${secretaryUID}`), {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: "secretary",
          lawFirm: lawFirmAdmin.lawFirm,
          adminUID: adminUID,
          passwordChanged: isPasswordGenerated ? false : true,
          active: true, // Add this field to track active status
          createdAt: new Date().toISOString()
        });
        
        // Now sign back in as admin
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        
        // Log successful creation
        if (analytics) {
          logEvent(analytics, "create_secretary", {
            admin_id: adminUID
          });
        }
        
        // Show success message
        showToast("Secretary created successfully! Verification email sent.", 'success');
        
        // Display password info if it was generated
        if (isPasswordGenerated) {
          showToast(`Temporary password for secretary: ${formData.password}`, 'info');
        }
        
        // Navigate back to secretary management after a short delay
        setTimeout(() => {
          navigate("/secretary/manage");
        }, 1500);
        
      } catch (error) {
        // Try to sign back in as admin if something went wrong
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (e) {
          console.error("Failed to sign back in as admin:", e);
        }
        
        // Handle specific errors
        if (error.code === 'auth/email-already-in-use') {
          setError("Email is already in use. Please use a different email address.");
        } else {
          setError(error.message || "Failed to create secretary account");
        }
      }
    } catch (error) {
      console.error("Error creating secretary account:", error);
      setError("Failed to create secretary: " + error.message);
      showToast("Failed to create secretary", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormLayout title="Add Secretary" backTo="/secretary/manage" backText="Back to Secretaries">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {error && <div className="error-message">{error}</div>}
      
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="loading-text">Creating secretary account...</p>
        </div>
      ) : (
        <form onSubmit={handleAddSecretary}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="required-field">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter secretary's full name"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email" className="required-field">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="required-field">Password</label>
            <div className="input-group">
              <input
                type="text" 
                id="password"
                name="password" 
                value={formData.password} 
                onChange={handleChange}
                placeholder="Enter password or generate one"
                required
              />
              <button 
                type="button" 
                className="generate-btn"
                onClick={generateTemporaryPassword}
              >
                Generate
              </button>
            </div>
            <small className="form-text">
              {isPasswordGenerated ? "A temporary password has been generated." : "Password must be at least 6 characters."}
            </small>
          </div>
          
          <div className="form-group">
            <label htmlFor="adminPassword" className="required-field">Your Password</label>
            <input
              type="password"
              id="adminPassword"
              name="adminPassword"
              value={adminCredentials.password}
              onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter your admin password"
              required
            />
            <small className="form-text">Your password is required to create the secretary account</small>
          </div>
          
          <div className="verification-note">
            <p>A verification email will be sent to the secretary's email address. 
              They must verify their email before logging in.</p>
          </div>
          
          <div className="required-note">
            <span>*</span> Required fields
          </div>
          
          <div className="form-actions">
            <Button 
              variant="primary" 
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Add Secretary'}
            </Button>
            
            <Button 
              variant="secondary"
              type="button"
              onClick={() => navigate("/secretary/manage")}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </FormLayout>
  );
};

export default AddSecretary;