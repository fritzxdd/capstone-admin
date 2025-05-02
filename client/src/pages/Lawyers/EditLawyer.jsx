import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update, remove } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import BackButton from "../../components/UI/BackButton";
import SecretarySelector from "../../components/Secretary/SecretarySelector";
import { trackEvent } from "../../services/analytics";
import "../../styles/index.css";

const EditLawyer = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lawyer, setLawyer] = useState(null);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState("");
  const [secretaryId, setSecretaryId] = useState("");
  const [image, setImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({
    email: "",
    password: ""
  });
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  
  // Display toast message
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchLawyerData();
    
    // Get admin email for reference
    const user = auth.currentUser;
    if (user) {
      setAdminCredentials(prev => ({ ...prev, email: user.email }));
    }
  }, [id]);

  const fetchLawyerData = async () => {
    setIsLoading(true);
    try {
      console.log(`Fetching lawyer data for ID: ${id}`);
      // Using Firebase directly for reliable data fetching
      const lawyerRef = ref(db, `lawyers/${id}`);
      const snapshot = await get(lawyerRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log("Lawyer data:", data);
        setLawyer(data);
        setServices(data.services || []);
        setSecretaryId(data.secretaryId || "");
      } else {
        console.error("Lawyer not found");
        setError("Lawyer not found.");
        showToast("Lawyer not found", 'error');
      }
    } catch (error) {
      console.error("Error fetching lawyer data:", error);
      setError("Failed to load lawyer details. Please try again.");
      showToast("Error loading lawyer data", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      
      // Create a URL for preview
      const imageUrl = URL.createObjectURL(file);
      
      // Update local state for immediate UI update
      setLawyer((prevLawyer) => ({ ...prevLawyer, profileImage: imageUrl }));
    }
  };

  const handleEditToggle = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError("");
    setSuccess("");
    setConfirmDelete(false);
    
    // Refresh data to discard changes
    fetchLawyerData();
  };

  const handleChange = (e) => {
    setLawyer({ ...lawyer, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    
    try {
      console.log(`Updating lawyer ${id} with data:`, lawyer);
      
      // Include secretary ID in the update
      const updateData = {
        ...lawyer,
        secretaryId
      };
      
      // Update directly with Firebase
      await update(ref(db, `lawyers/${id}`), updateData);
      
      setSuccess("Lawyer updated successfully.");
      showToast("Lawyer updated successfully", 'success');
      setIsEditing(false);
      
      // Track success
      trackEvent("update_lawyer_success", { lawyer_id: id });
    } catch (error) {
      console.error("Error updating lawyer:", error);
      setError("Failed to update lawyer. Please try again.");
      showToast("Failed to update lawyer", 'error');
      
      // Track error
      trackEvent("update_lawyer_error", { 
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async () => {
    if (newService.trim()) {
      // Create updated services array
      const updatedServices = [...services, newService];

      // Update local state
      setServices(updatedServices);
      setNewService("");

      try {
        // Update Firebase with services
        const updateData = { services: updatedServices };
        
        await update(ref(db, `lawyers/${id}`), updateData);
        
        showToast("Service added successfully", 'success');
        
        // Track success
        trackEvent("add_lawyer_service_success", { 
          lawyer_id: id,
          service: newService
        });
      } catch (error) {
        console.error("Error updating services:", error);
        setError("Failed to add service. Please try again.");
        showToast("Failed to add service", 'error');
        
        // Revert the local state change
        setServices(services);
        
        // Track error
        trackEvent("add_lawyer_service_error", { 
          error: error.message
        });
      }
    }
  };

  const initiateDelete = () => {
    setShowAdminAuth(true);
    setError("");
    setSuccess("");
  };

  const verifyAdminPassword = async () => {
    // For simplicity in this example, we're just showing confirmation UI
    setShowAdminAuth(false);
    setConfirmDelete(true);
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
    setShowAdminAuth(false);
  };

  const handleDeleteLawyer = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      console.log(`Deleting lawyer with ID: ${id}`);
      
      await remove(ref(db, `lawyers/${id}`));
      
      setSuccess("Lawyer deleted successfully.");
      showToast("Lawyer deleted successfully", 'success');
      
      // Track success
      trackEvent("delete_lawyer_success", { lawyer_id: id });
      
      // Navigate back after a short delay
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      console.error("Error deleting lawyer:", error);
      setError("Failed to delete lawyer. Please try again.");
      setIsLoading(false);
      showToast("Failed to delete lawyer", 'error');
      
      // Track error
      trackEvent("delete_lawyer_error", { 
        error: error.message
      });
    }
  };

  // Handle password reset
  const handleResetPassword = async () => {
    if (!lawyer || !lawyer.email) {
      setError("Lawyer email not found");
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Firebase's password reset functionality
      await sendPasswordResetEmail(auth, lawyer.email);
      
      setSuccess(`Password reset email sent to ${lawyer.email}`);
      showToast(`Password reset email sent to ${lawyer.email}`, 'success');
      
      trackEvent("lawyer_password_reset_success", {
        lawyer_id: id
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      setError("Failed to send password reset email: " + error.message);
      showToast("Failed to send password reset email", 'error');
      
      trackEvent("lawyer_password_reset_error", { 
        error: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !lawyer) return <Loading message="Loading lawyer data..." />;
  if (!lawyer) return <div className="error-message">{error || "Lawyer not found"}</div>;

  return (
    <div className="app-container">
      <div className="app-content">
        {toast && <Toast message={toast.message} type={toast.type} />}
        
        {showAdminAuth && (
          <div className="admin-auth-overlay">
            <div className="admin-auth-form">
              <h3>Admin Authentication</h3>
              <p>Please enter your admin password to continue with this action.</p>
              <div className="form-group">
                <label htmlFor="adminPassword">Admin Password</label>
                <input 
                  type="password" 
                  id="adminPassword" 
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter your admin password"
                />
              </div>
              <div className="auth-actions">
                <Button 
                  variant="primary" 
                  onClick={verifyAdminPassword}
                >
                  Verify
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={cancelDelete}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {confirmDelete && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Confirm Deletion</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this lawyer? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <Button 
                  variant="danger" 
                  onClick={handleDeleteLawyer}
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete Lawyer"}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={cancelDelete}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <Card className="lawyer-card">
          <div className="lawyer-card-header">
            <BackButton to="/" />
            <h2 className="lawyer-title">Lawyer Details</h2>
            <div className="header-underline"></div>
          </div>
          
          <div className="lawyer-card-content">
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            {isEditing ? (
              <div className="lawyer-form-layout">
                <div className="lawyer-image-section">
                  <div className="profile-image-container">
                    {lawyer.profileImage ? (
                      <img 
                        src={image ? URL.createObjectURL(image) : lawyer.profileImage} 
                        alt={lawyer.name}
                        className="profile-image" 
                      />
                    ) : (
                      <div className="profile-placeholder">
                        <span className="profile-placeholder-text">{lawyer.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="fileUpload" 
                    style={{ display: "none" }} 
                    onChange={handleProfileImageChange} 
                  />
                  <button 
                    className="photo-button" 
                    onClick={() => document.getElementById("fileUpload").click()}
                  >
                    Change Photo
                  </button>
                </div>
                
                <div className="lawyer-details-section">
                  <div className="lawyer-edit-form">
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="name">Full Name *</label>
                        <input 
                          type="text" 
                          id="name"
                          name="name" 
                          value={lawyer.name || ""} 
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
                          value={lawyer.email || ""} 
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
                          value={lawyer.phone || ""} 
                          onChange={handleChange} 
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="specialization">Specialization</label>
                        <input 
                          type="text" 
                          id="specialization"
                          name="specialization" 
                          value={lawyer.specialization || ""} 
                          onChange={handleChange} 
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="licenseNumber">License Number</label>
                        <input 
                          type="text" 
                          id="licenseNumber"
                          name="licenseNumber" 
                          value={lawyer.licenseNumber || ""} 
                          onChange={handleChange} 
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="experience">Experience (years)</label>
                        <input 
                          type="text" 
                          id="experience"
                          name="experience" 
                          value={lawyer.experience || ""} 
                          onChange={handleChange} 
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="secretary">Assigned Secretary</label>
                        <SecretarySelector 
                          adminId={lawyer.adminUID} 
                          selectedSecretaryId={secretaryId}
                          onChange={setSecretaryId}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lawyer-form-layout">
                <div className="lawyer-image-section">
                  <div className="profile-image-container">
                    {lawyer.profileImage ? (
                      <img 
                        src={lawyer.profileImage} 
                        alt={lawyer.name}
                        className="profile-image" 
                      />
                    ) : (
                      <div className="profile-placeholder">
                        <span className="profile-placeholder-text">{lawyer.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="lawyer-details-section">
                  <div className="lawyer-info-display">
                    <div className="info-section">
                      <h3 className="section-title">Personal Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Name:</span>
                          <span className="info-value">{lawyer.name}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Email:</span>
                          <span className="info-value">{lawyer.email}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Phone:</span>
                          <span className="info-value">{lawyer.phone || "Not provided"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="info-section">
                      <h3 className="section-title">Professional Information</h3>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Specialization:</span>
                          <span className="info-value">{lawyer.specialization || "Not specified"}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">License Number:</span>
                          <span className="info-value">{lawyer.licenseNumber || "Not provided"}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Experience:</span>
                          <span className="info-value">{lawyer.experience ? `${lawyer.experience} years` : "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="info-section">
                      <h3 className="section-title">Assigned Secretary</h3>
                      <SecretarySelector 
                        adminId={lawyer.adminUID} 
                        selectedSecretaryId={secretaryId}
                        onChange={setSecretaryId}
                        disabled={true}
                      />
                    </div>
                    
                    <div className="services-section">
                      <h3 className="section-title">Services Offered</h3>
                      <div className="services-list-container">
                        {services.length > 0 ? (
                          <ul className="services-list">
                            {services.map((service, index) => (
                              <li key={index} className="service-item">{service}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="no-services">No services added yet.</p>
                        )}
                      </div>
                      
                      <div className="add-service-container">
                        <input
                          className="service-input"
                          type="text"
                          placeholder="Add new service"
                          value={newService}
                          onChange={(e) => setNewService(e.target.value)}
                        />
                        <button className="add-service-btn" onClick={handleAddService}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons moved to bottom */}
            <div className="lawyer-action-buttons">
              {isEditing ? (
                <div className="form-actions">
                  <Button 
                    variant="success" 
                    onClick={handleSave}
                  >
                    Save Changes
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="lawyer-actions">
                  <Button 
                    variant="primary" 
                    onClick={handleEditToggle}
                  >
                    Edit Lawyer
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleResetPassword}
                  >
                    Reset Password
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={initiateDelete}
                  >
                    Delete Lawyer
                  </Button>
                  <Button 
                    variant="neutral" 
                    onClick={() => navigate("/")}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default EditLawyer;