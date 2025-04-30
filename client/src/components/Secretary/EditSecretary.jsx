import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update, remove } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../services/firebase";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import "../../styles/index.css";

const EditSecretary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [secretary, setSecretary] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Display toast message
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch secretary data
  useEffect(() => {
    const fetchSecretaryData = async () => {
      try {
        if (!id) {
          setError("Secretary ID is missing");
          setIsLoading(false);
          return;
        }

        const secretaryRef = ref(db, `secretaries/${id}`);
        const snapshot = await get(secretaryRef);

        if (snapshot.exists()) {
          const data = snapshot.val();
          setSecretary(data);
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || ""
          });
          
          // Log view event
          if (analytics) {
            logEvent(analytics, "view_secretary", { 
              secretary_id: id
            });
          }
        } else {
          setError("Secretary not found");
          showToast("Secretary not found", 'error');
        }
      } catch (error) {
        console.error("Error fetching secretary data:", error);
        setError("Failed to load secretary details: " + error.message);
        showToast("Error loading secretary data", 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSecretaryData();
  }, [id]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Toggle edit mode
  const handleEditToggle = () => {
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancel = () => {
    // Reset form data to original secretary data
    if (secretary) {
      setFormData({
        name: secretary.name || "",
        email: secretary.email || "",
        phone: secretary.phone || ""
      });
    }
    setIsEditing(false);
    setError("");
  };

  // Save secretary updates
  const handleSave = async () => {
    // Validate form
    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Name and email are required fields");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // Update secretary data
      const updates = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim()
      };
      
      await update(ref(db, `secretaries/${id}`), updates);
      
      // Update local secretary state
      setSecretary(prevState => ({
        ...prevState,
        ...updates
      }));
      
      // Exit edit mode
      setIsEditing(false);
      
      // Show success message
      showToast("Secretary updated successfully", 'success');
      
      // Log update event
      if (analytics) {
        logEvent(analytics, "update_secretary", { 
          secretary_id: id
        });
      }
    } catch (error) {
      console.error("Error updating secretary:", error);
      setError("Failed to update secretary: " + error.message);
      showToast("Failed to update secretary", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle delete confirmation
  const handleDeleteClick = () => {
    setConfirmDelete(true);
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  // Confirm and process delete
  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      // Delete the secretary from database
      await remove(ref(db, `secretaries/${id}`));
      
      showToast("Secretary deleted successfully", 'success');
      
      // Log deletion
      if (analytics) {
        logEvent(analytics, "delete_secretary", { 
          secretary_id: id 
        });
      }
      
      // Navigate back to secretary list after a short delay
      setTimeout(() => {
        navigate("/secretary/manage");
      }, 1500);
    } catch (error) {
      console.error("Error deleting secretary:", error);
      setError("Failed to delete secretary: " + error.message);
      showToast("Failed to delete secretary", 'error');
      setIsLoading(false);
    }
  };

  // Reset password for secretary
  const handleResetPassword = async () => {
    if (!secretary || !secretary.email) {
      showToast("Email not available", 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Firebase password reset
      await sendPasswordResetEmail(auth, secretary.email);
      
      showToast(`Password reset email sent to ${secretary.email}`, 'success');
      
      // Log password reset action
      if (analytics) {
        logEvent(analytics, "reset_secretary_password", { 
          secretary_id: id 
        });
      }
    } catch (error) {
      console.error("Error sending password reset:", error);
      setError("Failed to send password reset: " + error.message);
      showToast("Failed to send password reset", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back button click
  const handleBack = () => {
    navigate("/secretary/manage");
  };

  if (isLoading && !secretary) {
    return <Loading message="Loading secretary data..." />;
  }

  return (
    <div className="app-container">
      <div className="app-content">
        {toast && <Toast message={toast.message} type={toast.type} />}
        
        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Confirm Deletion</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete secretary <strong>{secretary.name}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <Button 
                  variant="danger" 
                  onClick={handleConfirmDelete}
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete Secretary"}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleCancelDelete}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <Card className="secretary-card">
          <div className="card-header">
            <button onClick={handleBack} className="back-button">
              <span className="icon-back"></span>
              Back
            </button>
            <h2 className="card-title">Secretary Details</h2>
            <div className="header-underline"></div>
          </div>
          
          <div className="card-content">
            {error && <div className="error-message">{error}</div>}
            
            {secretary ? (
              <>
                <div className="secretary-profile-section">
                  <div className="secretary-avatar large">
                    {secretary.name ? secretary.name.charAt(0).toUpperCase() : "S"}
                  </div>
                  
                  <div className="secretary-details-section">
                    {isEditing ? (
                      <div className="secretary-edit-form">
                        <div className="form-grid">
                          <div className="form-group">
                            <label htmlFor="name" className="required-field">Full Name</label>
                            <input 
                              type="text" 
                              id="name"
                              name="name" 
                              value={formData.name} 
                              onChange={handleChange} 
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
                              required 
                            />
                          </div>
                          
                          <div className="form-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input 
                              type="tel" 
                              id="phone"
                              name="phone" 
                              value={formData.phone} 
                              onChange={handleChange} 
                            />
                          </div>
                        </div>
                        
                        <div className="form-actions">
                          <Button 
                            variant="success" 
                            onClick={handleSave}
                            disabled={isLoading}
                          >
                            {isLoading ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={handleCancel}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="secretary-info-display">
                        <div className="secretary-basic-info">
                          <h2 className="secretary-name">{secretary.name}</h2>
                          <p className="secretary-role-badge">Secretary</p>
                        </div>
                        
                        <div className="info-section">
                          <h3 className="section-title">Contact Information</h3>
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Email:</span>
                              <span className="info-value">{secretary.email}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Phone:</span>
                              <span className="info-value">{secretary.phone || "Not provided"}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="info-section">
                          <h3 className="section-title">Law Firm Association</h3>
                          <div className="info-grid">
                            <div className="info-item">
                              <span className="info-label">Law Firm:</span>
                              <span className="info-value">{secretary.lawFirm || "Not specified"}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">Created:</span>
                              <span className="info-value">
                                {secretary.createdAt ? new Date(secretary.createdAt).toLocaleDateString() : "Unknown"}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="secretary-actions-container">
                          <Button 
                            variant="primary" 
                            onClick={handleEditToggle}
                            icon="edit"
                          >
                            Edit Secretary
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={handleResetPassword}
                            icon="key"
                          >
                            Reset Password
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={handleDeleteClick}
                            icon="delete"
                          >
                            Delete Secretary
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon secretary-empty-icon"></div>
                <h3>Secretary Not Found</h3>
                <p>The secretary you're looking for doesn't exist or has been deleted.</p>
                <Button 
                  variant="primary" 
                  onClick={handleBack}
                >
                  Back to Secretary Management
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};