import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ref, set, push, get } from "firebase/database";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import "../../styles/index.css";
import { trackEvent } from "../../services/analytics";

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
  const [toast, setToast] = useState(null);
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Toast notification helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    
    // Clear toast after 5 seconds
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

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

  const validateForm = () => {
    if (!secretary.name.trim()) {
      setError("Secretary name is required");
      return false;
    }
    
    if (!secretary.email.trim()) {
      setError("Email is required");
      return false;
    }
    
    if (!secretary.password) {
      setError("Password is required");
      return false;
    }
    
    if (secretary.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (secretary.password !== secretary.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    return true;
  };

  const addSecretary = async () => {
    if (!validateForm()) return;
    
    if (!lawFirmAdmin) {
      setError("Law firm admin data not loaded.");
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
      
      // Check if email is already in use for another secretary
      try {
        const secretariesRef = ref(db, 'secretaries');
        const snapshot = await get(secretariesRef);
        
        if (snapshot.exists()) {
          const secretaries = Object.values(snapshot.val());
          const emailExists = secretaries.some(sec => sec.email === secretary.email);
          
          if (emailExists) {
            setError("This email address is already in use by another secretary.");
            setIsLoading(false);
            return;
          }
        }
      } catch (checkError) {
        console.error("Error checking existing secretaries:", checkError);
        // Continue with creation attempt
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
        
        // Log event
        trackEvent("add_secretary_success", {
          secretary_id: secretaryUID
        });
        
        // Success! Admin is logged back in
        setSuccess(true);
        showToast("Secretary added successfully!", 'success');
        setSecretary({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
        setAdminCredentials(prev => ({ ...prev, password: "" }));
        
        // Clear generated password after use
        setGeneratedPassword("");
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
      
      // Log event
      trackEvent("add_secretary_error", {
        error: error.message
      });
      
      if (error.code === 'auth/email-already-in-use') {
        setError("Email is already in use. Please try a different email address.");
      } else {
        setError(error.message || "Failed to create secretary account.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAdding = () => {
    setSuccess(false);
    setError("");
  };
  
  const handleFinish = () => {
    navigate("/secretary/manage");
  };
  
  return (
    <div className="app-container">
      <div className="app-content">
        {toast && <Toast message={toast.message} type={toast.type} />}
        
        <Card className="secretary-card">
          <div className="secretary-header">
            <button onClick={() => navigate("/secretary/manage")} className="back-button">
              <span className="icon-back"></span>
            </button>
            <h2 className="secretary-title">Add Secretary</h2>
            <div className="header-underline"></div>
          </div>
          
          <div className="secretary-form-container">
            {error && <div className="error-message">{error}</div>}
            
            {success ? (
              <div className="success-container">
                <div className="success-message">
                  <span className="success-icon">✓</span> 
                  Secretary account created successfully! Verification email sent.
                  {generatedPassword && (
                    <div className="temp-password-info">
                      <p>Temporary password: <strong>{generatedPassword}</strong></p>
                      <p>Please share this with the secretary. They will need to change it after first login.</p>
                    </div>
                  )}
                </div>
                
                <div className="post-success-actions">
                  <Button 
                    variant="primary"
                    onClick={handleContinueAdding}
                  >
                    Add Another Secretary
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    onClick={handleFinish}
                  >
                    Return to Secretary Management
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); addSecretary(); }}>
                <div className="form-group">
                  <label htmlFor="name">Full Name <span className="required">*</span></label>
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
                  <label htmlFor="email">Email Address <span className="required">*</span></label>
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
                
                <div className="form-group">
                  <label htmlFor="password">Password <span className="required">*</span></label>
                  <div className="password-input-group">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={secretary.password}
                      onChange={handleChange}
                      placeholder="Enter password or generate one"
                      required
                    />
                    <button 
                      type="button" 
                      className="generate-password-btn"
                      onClick={generateTemporaryPassword}
                    >
                      Generate
                    </button>
                  </div>
                  <small className="help-text">
                    {generatedPassword ? "A temporary password has been generated. The secretary will need to change it after first login." : "You can enter a password or click Generate for a temporary one."}
                  </small>
                </div>
                
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password <span className="required">*</span></label>
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
                
                <div className="form-group">
                  <label htmlFor="adminPassword">Your Password <span className="required">*</span></label>
                  <input
                    type="password"
                    id="adminPassword"
                    name="adminPassword"
                    value={adminCredentials.password}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your admin password"
                    required
                  />
                  <small className="help-text">Required to create the secretary account</small>
                </div>
                
                <div className="email-verification-note">
                  <p>A verification email will be sent to the secretary's email address. 
                    They must verify their email before logging in.</p>
                </div>
                
                <div className="form-note">
                  <span className="required">*</span> Required fields
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
                    onClick={() => navigate("/secretary/manage")}
                    disabled={isLoading}
                    type="button"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AddSecretary;