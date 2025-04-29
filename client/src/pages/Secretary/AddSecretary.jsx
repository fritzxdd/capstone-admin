import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import FormLayout from "../../components/Layout/FormLayout";
import "../../styles/index.css";

const AddSecretary = () => {
  const navigate = useNavigate();
  const [secretary, setSecretary] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    password: "",
    confirmPassword: "" 
  });
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });
  const [generatedPassword, setGeneratedPassword] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      const user = auth.currentUser;
      if (user) {
        setAdminCredentials(prev => ({ ...prev, email: user.email }));
        const adminRef = ref(db, `law_firm_admin/${user.uid}`);
        const snapshot = await get(adminRef);
        if (snapshot.exists()) {
          setLawFirmAdmin(snapshot.val());
        } else {
          setError("Error: Law firm admin not found!");
          navigate("/");
        }
      }
    };

    fetchAdminData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSecretary(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Generate a temporary password
  const generateTemporaryPassword = () => {
    // Generate a random password: "Temp" + 4 random digits + "!"
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const tempPassword = `Temp${randomDigits}!`;
    setGeneratedPassword(tempPassword);
    setSecretary(prevState => ({
      ...prevState,
      password: tempPassword,
      confirmPassword: tempPassword
    }));
    return tempPassword;
  };

  const addSecretary = async (e) => {
    if (e) e.preventDefault();
    
    if (!secretary.name || !secretary.email) {
      setError("Please fill in all required fields.");
      return;
    }
    
    if (secretary.password !== secretary.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (!adminCredentials.password) {
      setError("Admin password is required to complete this action.");
      return;
    }
  
    setIsLoading(true);
    setError("");
    
    try {
      // Store admin information
      const adminUser = auth.currentUser;
      const adminUID = adminUser.uid;
      const adminEmail = adminCredentials.email;
      const adminPassword = adminCredentials.password;
      const adminData = { ...lawFirmAdmin };
      
      // First, verify the admin password is correct by testing a sign-in
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
          secretary.email, 
          secretary.password
        );
        
        // Send verification email to the secretary
        await sendEmailVerification(userCredential.user);
        
        const secretaryUID = userCredential.user.uid;
        
        // Save secretary data to database
        await set(ref(db, `secretaries/${secretaryUID}`), {
          name: secretary.name,
          email: secretary.email,
          phone: secretary.phone || "",
          role: "secretary",
          lawFirm: adminData.lawFirm,
          adminUID: adminUID,
          passwordChanged: generatedPassword ? false : true, // Track if using temp password
          createdAt: new Date().toISOString()
        });
        
        // Now sign back in as admin - this happens silently without a UI
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        
        // Success! Admin is logged back in
        setSuccess(true);
        setSuccessMessage(`Secretary account created successfully! Verification email sent to ${secretary.email}.`);
        
        if (generatedPassword) {
          setSuccessMessage(prev => prev + ` Temporary password: ${secretary.password}`);
        }
        
        // Reset form after a short delay
        setTimeout(() => {
          setSecretary({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
          setAdminCredentials(prev => ({ ...prev, password: "" }));
          setGeneratedPassword("");
          
          // Navigate back to secretary management
          navigate("/secretary/manage");
        }, 3000);
        
      } catch (error) {
        // Try to sign back in as admin if something went wrong
        try {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        } catch (e) {
          // Handle re-login failure
          console.error("Failed to sign back in as admin:", e);
        }
        
        throw error; // Re-throw the original error
      }
      
    } catch (error) {
      console.error("Error creating secretary account:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Email is already in use. Please try a different email address.");
      } else {
        setError(error.message || "Failed to create secretary account.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <FormLayout title="Add Secretary" backTo="/secretary/manage" backText="Back to Secretaries">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{successMessage}</div>}
      
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="loading-text">Creating secretary account...</p>
        </div>
      ) : (
        <form onSubmit={addSecretary}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="required-field">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={secretary.name}
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
                value={secretary.email}
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
              value={secretary.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="password" className="required-field">Password</label>
              <div className="input-group">
                <input
                  type="text" 
                  id="password"
                  name="password" 
                  placeholder="Leave blank to auto-generate" 
                  value={secretary.password} 
                  onChange={handleChange}
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
              <small className="form-text">If left blank, a temporary password will be generated.</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword" className="required-field">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={secretary.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                required
              />
            </div>
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
            <small className="form-text">Required to create the secretary account</small>
          </div>
          
          <div className="verification-note">
            <p>A verification email will be sent to the secretary's email address. 
              They must verify their email before logging in.</p>
          </div>
          
          <div className="required-note">
            <span>*</span> Required fields
          </div>
          
          <div className="form-actions">
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Add Secretary'}
            </button>
            
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/secretary/manage")}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </FormLayout>
  );
};

export default AddSecretary;