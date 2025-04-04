import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update } from "firebase/database";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import apiService from "../../services/api";
import { trackEvent } from "../../services/analytics";
import "../../styles/index.css";

const ManageSecretary = () => {
  const navigate = useNavigate();
  const [secretary, setSecretary] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [initialData, setInitialData] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [existingSecretary, setExistingSecretary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adminCredentials, setAdminCredentials] = useState({
    email: "",
    password: ""
  });
  const [showAdminAuth, setShowAdminAuth] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        try {
          setAdminCredentials(prev => ({ ...prev, email: user.email }));
          
          // Get admin data from localStorage/sessionStorage first
          const storedAdmin = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
          if (storedAdmin) {
            const adminData = JSON.parse(storedAdmin);
            setLawFirmAdmin(adminData);
            await fetchSecretary(adminData.lawFirm);
          } else {
            // Fallback to database query
            const adminRef = ref(db, `law_firm_admin/${user.uid}`);
            const snapshot = await get(adminRef);
            if (snapshot.exists()) {
              const adminData = snapshot.val();
              setLawFirmAdmin(adminData);
              await fetchSecretary(adminData.lawFirm);
            } else {
              setError("Error: Law firm admin not found!");
              navigate("/");
            }
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          setError("Error loading data. Please try again later.");
        }
      }
      setIsLoading(false);
    };

    const fetchSecretary = async (lawFirm) => {
      try {
        // Use the API endpoint
        const secretary = await apiService.getSecretaryByLawFirm(lawFirm);
        
        if (secretary) {
          setExistingSecretary(secretary);
          setSecretary({
            name: secretary.name || "",
            email: secretary.email || "",
            phone: secretary.phone || ""
          });
          setInitialData({
            name: secretary.name || "",
            email: secretary.email || "",
            phone: secretary.phone || ""
          });
        }
      } catch (error) {
        // 404 error means no secretary found, which is not really an error
        if (error.response?.status !== 404) {
          console.error("Error fetching secretary:", error);
          setError("Failed to load secretary data. Please try again.");
        }
      }
    };

    fetchAdminData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSecretary(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const enableEditing = () => {
    setIsEditing(true);
    setIsCreating(false);
    setError("");
    setSuccess("");
  };

  const enableCreating = () => {
    navigate("/add-secretary");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    // Reset to original data
    if (initialData) {
      setSecretary({
        ...initialData
      });
    }
    setError("");
    setSuccess("");
  };

  // Handle password reset
  const handleResetPassword = async () => {
    if (!existingSecretary || !existingSecretary.email) {
      setError("Secretary email not found");
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Firebase's password reset functionality
      await sendPasswordResetEmail(auth, existingSecretary.email);
      
      setSuccess(`Password reset email sent to ${existingSecretary.email}`);
      trackEvent("secretary_password_reset_success", {
        secretary_id: existingSecretary.id
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      setError("Failed to send password reset email: " + error.message);
      trackEvent("secretary_password_reset_error", { 
        error: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSecretaryChanges = async () => {
    if (!existingSecretary) {
      setError("No secretary found to update");
      return;
    }

    if (!secretary.name || !secretary.email) {
      setError("Name and email are required");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update secretary via API
      const response = await apiService.updateSecretary(existingSecretary.id, secretary);
      
      // Update initial data
      setInitialData({
        name: secretary.name,
        email: secretary.email,
        phone: secretary.phone
      });

      setSuccess("Secretary information updated successfully");
      setIsEditing(false);
      
      // Track success
      trackEvent("update_secretary_success", { 
        secretary_id: existingSecretary.id 
      });
    } catch (error) {
      console.error("Error updating secretary:", error);
      setError(error.response?.data?.error || "Failed to update secretary. Please try again.");
      
      // Track error
      trackEvent("update_secretary_error", { 
        error: error.response?.data?.error || error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initiateDelete = () => {
    setAdminCredentials(prev => ({ ...prev, password: "" }));
    setShowAdminAuth(true);
    setError("");
    setSuccess("");
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
    setShowAdminAuth(false);
  };

  const verifyAdminPassword = async () => {
    if (!adminCredentials.password) {
      setError("Please enter your admin password to continue");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Since we don't have a direct verify endpoint, we'll try to sign in with the credentials
      // This is a workaround - in a production app, it would be better to have a dedicated endpoint
      const adminEmail = auth.currentUser?.email;
      
      // Store the current user
      const currentUser = auth.currentUser;
      
      // Try to sign in with the provided password
      await signInWithEmailAndPassword(auth, adminEmail, adminCredentials.password);
      
      // If we get here, the password is correct - we're already signed in as the same user
      setShowAdminAuth(false);
      setConfirmDelete(true);
      
      // No need to sign back in since we're already signed in with the same user
    } catch (error) {
      console.error("Error verifying admin password:", error);
      setError("Invalid password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSecretary = async () => {
    if (!existingSecretary) {
      setError("No secretary found to delete");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Delete secretary via API
      await apiService.deleteSecretary(existingSecretary.id);
      
      setSuccess("Secretary deleted successfully");
      setExistingSecretary(null);
      setSecretary({ name: "", email: "", phone: "" });
      setInitialData(null);
      setConfirmDelete(false);
      
      // Track success
      trackEvent("delete_secretary_success", { 
        secretary_id: existingSecretary.id 
      });
      
      // Redirect after a short delay
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error deleting secretary:", error);
      setError(error.response?.data?.error || "Failed to delete secretary. Please try again.");
      setConfirmDelete(false);
      
      // Track error
      trackEvent("delete_secretary_error", { 
        error: error.response?.data?.error || error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="app-content">
        <Card className="secretary-card">
          <div className="secretary-header">
            <button onClick={() => navigate("/")} className="back-button">
              <span className="icon-back"></span>
            </button>
            <h2 className="secretary-title">Manage Secretary</h2>
            <div className="header-underline"></div>
          </div>

          {isLoading ? (
            <Loading message="Processing..." />
          ) : existingSecretary && !isEditing && !isCreating ? (
            <div className="secretary-details">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
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
              
              <div className="secretary-profile">
                <div className="secretary-avatar">
                  {secretary.name ? secretary.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="secretary-info">
                  <h3>{secretary.name}</h3>
                  <p className="secretary-role">Secretary</p>
                </div>
              </div>
              
              <div className="info-section">
                <div className="info-row">
                  <div className="info-label">Name:</div>
                  <div className="info-value">{secretary.name}</div>
                </div>
                
                <div className="info-row">
                  <div className="info-label">Email:</div>
                  <div className="info-value">{secretary.email}</div>
                </div>
                
                <div className="info-row">
                  <div className="info-label">Phone:</div>
                  <div className="info-value">{secretary.phone || "Not provided"}</div>
                </div>
              </div>
              
              {confirmDelete ? (
                <div className="confirm-delete">
                  <p>Are you sure you want to delete this secretary?</p>
                  <div className="confirm-actions">
                    <Button 
                      variant="danger" 
                      onClick={deleteSecretary}
                    >
                      Yes, Delete
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={cancelDelete}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="action-buttons">
                  <Button 
                    variant="primary" 
                    icon="edit"
                    onClick={enableEditing}
                  >
                    Update Secretary
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    onClick={handleResetPassword}
                  >
                    Reset Password
                  </Button>
                  
                  <Button 
                    variant="danger" 
                    icon="delete"
                    onClick={initiateDelete}
                  >
                    Delete Secretary
                  </Button>
                </div>
              )}
            </div>
          ) : isEditing ? (
            <div className="secretary-edit-form">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={secretary.name}
                    onChange={handleChange}
                    placeholder="Secretary name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={secretary.email}
                    onChange={handleChange}
                    placeholder="Email address"
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
                    placeholder="Phone number"
                  />
                </div>
              </div>
              
              <p className="form-note">* Required fields</p>
              
              <div className="form-actions">
                <Button 
                  variant="success" 
                  icon="save"
                  onClick={saveSecretaryChanges}
                >
                  Save Changes
                </Button>
                
                <Button 
                  variant="secondary" 
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="no-secretary">
              <div className="empty-state">
                <div className="empty-icon">👩‍💼</div>
                <h3>No Secretary Found</h3>
                <p>There is no secretary assigned to your law firm yet.</p>
                <Button 
                  variant="primary" 
                  icon="add"
                  onClick={enableCreating}
                >
                  Add Secretary
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ManageSecretary;