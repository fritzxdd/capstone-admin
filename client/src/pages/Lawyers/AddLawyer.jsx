import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { ref, set, get } from "firebase/database";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
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
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      const user = auth.currentUser;
      if (user) {
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

  const addLawyer = async () => {
    if (!lawFirmAdmin) {
      setError("Law firm admin data not loaded.");
      return;
    }
  
    // Basic validation
    if (!lawyer.name || !lawyer.email || !lawyer.password) {
      setError("Please fill in all required fields.");
      return;
    }
  
    setIsLoading(true);
    setError("");
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, lawyer.email, lawyer.password);
      const lawyerUID = userCredential.user.uid;
  
      const secretariesRef = ref(db, "secretaries");
      const secretariesSnap = await get(secretariesRef);
  
      let secretaryId = null;
      if (secretariesSnap.exists()) {
        Object.entries(secretariesSnap.val()).forEach(([secId, secData]) => {
          if (secData.lawFirm === lawFirmAdmin.lawFirm) {
            secretaryId = secId;
          }
        });
      }
  
      await set(ref(db, `lawyers/${lawyerUID}`), {
        name: lawyer.name,
        email: lawyer.email,
        phone: lawyer.phone,
        specialization: lawyer.specialization,
        licenseNumber: lawyer.licenseNumber,
        experience: lawyer.experience,
        role: "lawyer",
        profileImage: preview || "",
        lawFirm: lawFirmAdmin.lawFirm,
        adminUID: lawFirmAdmin.uid,
        secretaryId: secretaryId || "",
      });
  
      await sendEmailVerification(userCredential.user);
      
      setLawyer({ name: "", email: "", phone: "", specialization: "", licenseNumber: "", experience: "", password: "" });
      setImage(null);
      setPreview(null);
      
      alert("Lawyer account created successfully! Verification email sent.");
      setTimeout(() => navigate("/"), 1000);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="app-container">
      <div className="app-content">
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
                      <label htmlFor="password">Password *</label>
                      <input 
                        type="password" 
                        id="password"
                        name="password" 
                        placeholder="Enter password" 
                        value={lawyer.password} 
                        onChange={handleChange} 
                        required 
                      />
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
                  </div>
                  
                  <p className="form-note">* Required fields</p>
                  
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