import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import SecretarySelector from "../../components/Secretary/SecretarySelector";
import "../../styles/index.css";

const AddLawyer = () => {
  const navigate = useNavigate();
  const [lawyer, setLawyer] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    specialization: "", 
    licenseNumber: "", 
    experience: "", 
    password: "" 
  });
  const [secretaryId, setSecretaryId] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [success, setSuccess] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [adminCredentials, setAdminCredentials] = useState({ email: "", password: "" });

  // Display toast message
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
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
    setLawyer(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // Generate a temporary password
  const generateTemporaryPassword = () => {
    // Generate a random password: "Temp" + 4 random digits + "!"
    const randomDigits = Math.floor(1000 + Math.random() * 9000); // 4-digit number
    const tempPassword = `Temp${randomDigits}!`;
    setGeneratedPassword(tempPassword);
    setLawyer(prevState => ({
      ...prevState,
      password: tempPassword
    }));
    return tempPassword;
  };

  const validateForm = () => {
    if (!lawyer.name || !lawyer.email) {
      setError("Name and email are required fields.");
      return false;
    }
    return true;
  };

  const addLawyer = async () => {
    if (!validateForm()) {
      return;
    }

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
      
      // Generate a temporary password if not provided
      const password = lawyer.password || generateTemporaryPassword();
      
      // Create the lawyer account
      try {
        // This will log out the admin and log in as the lawyer
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          lawyer.email, 
          password
        );
        
        // Send verification email to the lawyer
        await sendEmailVerification(userCredential.user);
        
        const lawyerUID = userCredential.user.uid;
        
        // Save lawyer data to database
        await set(ref(db, `lawyers/${lawyerUID}`), {
          name: lawyer.name,
          email: lawyer.email,
          phone: lawyer.phone || "",
          specialization: lawyer.specialization || "",
          licenseNumber: lawyer.licenseNumber || "",
          experience: lawyer.experience || "",
          role: "lawyer",
          profileImage: preview || "",
          lawFirm: lawFirmAdmin.lawFirm,
          adminUID: adminUID,
          secretaryId: secretaryId || "",  // Save the selected secretary ID
          passwordChanged: false, // Indicate this is a temporary password
          createdAt: new Date().toISOString()
        });
        
        // Now sign back in as admin
        await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        
        // Success! Admin is logged back in
        const successMsg = `Lawyer account created successfully! Verification email sent to ${lawyer.email}.`;
        setSuccess(successMsg);
        showToast(successMsg, 'success');
        
        if (password === generatedPassword) {
          showToast(`Temporary password: ${password}`, 'info');
        }
        
        // Reset form
        setLawyer({ name: "", email: "", phone: "", specialization: "", licenseNumber: "", experience: "", password: "" });
        setAdminCredentials(prev => ({ ...prev, password: "" }));
        setImage(null);
        setPreview(null);
        setGeneratedPassword("");
        setSecretaryId("");
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
      console.error("Error creating lawyer account:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Email is already in use. Please try a different email address.");
      } else {
        setError(error.message || "Failed to create lawyer account.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="app-container">
      <div className="app-content">
        {toast && <Toast message={toast.message} type={toast.type} />}
        
        <Card className="lawyer-card">
          <div className="lawyer-card-header">
            <button onClick={() => navigate("/")} className="lawyer-back-button">
              <span className="icon-back"></span>
            </button>
            <h2 className="lawyer-title">Add Lawyer</h2>
            <div className="header-underline"></div>
          </div>
          
          {isLoading ? (
            <Loading message="Creating lawyer account..." />
          ) : (
            <div className="lawyer-card-content">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="lawyer-form-layout">
                <div className="lawyer-image-section">
                  <div className="profile-image-container">
                    {preview ? (
                      <img src={preview} alt="Lawyer Preview" className="profile-image" />
                    ) : (
                      <div className="profile-placeholder">
                        <span className="profile-placeholder-icon">👩‍⚖️</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="fileUpload" 
                    style={{ display: "none" }} 
                    onChange={handleImageChange} 
                  />
                  <button 
                    className="photo-button" 
                    onClick={() => document.getElementById("fileUpload").click()}
                  >
                    {preview ? "Change Photo" : "Add Photo"}
                  </button>
                </div>

                <div className="lawyer-form-container">
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="name">Full Name *</label>
                      <input 
                        type="text" 
                        id="name"
                        name="name" 
                        placeholder="Enter lawyer's full name" 
                        value={lawyer.name} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email">Email Address *</label>
                      <input 
                        type="email" 
                        id="email"
                        name="email" 
                        placeholder="Enter email address" 
                        value={lawyer.email} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number</label>
                      <input 
                        type="tel" 
                        id="phone"
                        name="phone" 
                        placeholder="Enter phone number" 
                        value={lawyer.phone} 
                        onChange={handleChange} 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <div className="password-input-group">
                        <input 
                          type="text" 
                          id="password"
                          name="password" 
                          placeholder="Leave blank to auto-generate" 
                          value={lawyer.password} 
                          onChange={handleChange}
                        />
                        <button 
                          type="button" 
                          className="generate-password-btn"
                          onClick={generateTemporaryPassword}
                        >
                          Generate
                        </button>
                      </div>
                      <small className="help-text">If left blank, a temporary password will be generated. The lawyer will need to change it after first login.</small>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="specialization">Specialization</label>
                      <input 
                        type="text" 
                        id="specialization"
                        name="specialization" 
                        placeholder="e.g. Family Law, Corporate Law" 
                        value={lawyer.specialization} 
                        onChange={handleChange} 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="licenseNumber">License Number</label>
                      <input 
                        type="text" 
                        id="licenseNumber"
                        name="licenseNumber" 
                        placeholder="Enter license number" 
                        value={lawyer.licenseNumber} 
                        onChange={handleChange} 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="experience">Experience (years)</label>
                      <input 
                        type="text" 
                        id="experience"
                        name="experience" 
                        placeholder="e.g. 5" 
                        value={lawyer.experience} 
                        onChange={handleChange} 
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="secretary">Assign Secretary</label>
                      {lawFirmAdmin && (
                        <SecretarySelector 
                          adminId={lawFirmAdmin.uid} 
                          selectedSecretaryId={secretaryId}
                          onChange={setSecretaryId}
                        />
                      )}
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
                      <small className="help-text">Required to create the lawyer account</small>
                    </div>
                  </div>
                  
                  <p className="form-note">* Required fields</p>
                  
                  <div className="email-verification-note">
                    <p>A verification email will be sent to the lawyer's email address. 
                       They must verify their email before logging in.</p>
                  </div>
                  
                  <div className="form-actions">
                    <Button 
                      variant="primary" 
                      onClick={addLawyer}
                      icon="add"
                      fullWidth
                    >
                      Add Lawyer
                    </Button>
                    
                    <Button 
                      variant="secondary" 
                      onClick={() => navigate("/")}
                      fullWidth
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AddLawyer;