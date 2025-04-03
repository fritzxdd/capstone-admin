import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get } from "firebase/database";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import apiService from "../../services/api";
import { trackEvent } from "../../services/analytics";
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
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      const user = auth.currentUser;
      if (user) {
        // Get admin data from localStorage/sessionStorage first for faster loading
        const storedAdmin = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
        if (storedAdmin) {
          setLawFirmAdmin(JSON.parse(storedAdmin));
        } else {
          // Fallback to database query if not in storage
          try {
            const adminRef = ref(db, `law_firm_admin/${user.uid}`);
            const snapshot = await get(adminRef);
            if (snapshot.exists()) {
              setLawFirmAdmin(snapshot.val());
            } else {
              setError("Error: Law firm admin not found!");
              navigate("/");
            }
          } catch (err) {
            console.error('Error fetching admin data:', err);
            setError("Error loading admin data. Please refresh the page.");
          }
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
    if (!lawyer.name || !lawyer.email) {
      setError("Please fill in all required fields.");
      return;
    }
  
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      // Prepare lawyer data for API call
      const lawyerData = {
        ...lawyer,
        lawFirm: lawFirmAdmin.lawFirm,
        adminUID: lawFirmAdmin.uid,
      };
      
      // If there's a preview image (from the file input)
      if (preview) {
        lawyerData.profileImage = preview;
      }
      
      // Use API service to create lawyer
      const response = await apiService.createLawyer(lawyerData);
      
      // Check if the API call was successful
      if (response && response.uid) {
        setSuccess("Lawyer account created successfully!");
        
        // Store temp password for display
        if (response.tempPassword) {
          setTempPassword(response.tempPassword);
        }
        
        // Track event for analytics
        trackEvent("create_lawyer_success", { 
          law_firm: lawFirmAdmin.lawFirm 
        });
        
        // Reset form
        setLawyer({ 
          name: "", 
          email: "", 
          phone: "", 
          specialization: "", 
          licenseNumber: "", 
          experience: "", 
        });
        setImage(null);
        setPreview(null);
        
        // Redirect after a delay
        setTimeout(() => navigate("/"), 3000);
      }
    } catch (error) {
      console.error("Error creating lawyer:", error);
      setError(error.response?.data?.error || "Failed to create lawyer account. Please try again.");
      
      // Track error for analytics
      trackEvent("create_lawyer_error", { 
        error: error.response?.data?.error || error.message 
      });
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
              {success && (
                <div className="success-message">
                  {success}
                  {tempPassword && (
                    <div className="temp-password-info">
                      <p>Temporary password: <strong>{tempPassword}</strong></p>
                      <p>Please share this with the lawyer. They will be asked to change it on first login.</p>
                    </div>
                  )}
                </div>
              )}
              
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
                  <p className="form-note">A temporary password will be generated and shown after creation.</p>
                  
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