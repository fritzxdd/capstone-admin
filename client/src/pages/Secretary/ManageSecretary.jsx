import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import { ref, get } from "firebase/database";
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
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
        try {
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
        // Use the new API endpoint
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
    setIsCreating(true);
    setIsEditing(false);
    setError("");
    setSuccess("");
    
    // Reset form for new secretary
    setSecretary({
      name: "",
      email: "",
      phone: ""
    });
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

  const createSecretary = async () => {
    if (!lawFirmAdmin) {
      setError("Law firm admin data not loaded");
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
      // Prepare secretary data
      const secretaryData = {
        name: secretary.name,
        email: secretary.email,
        phone: secretary.phone || '',
        lawFirm: lawFirmAdmin.lawFirm,
        adminUID: lawFirmAdmin.uid
      };

      // Call API to create secretary
      const response = await apiService.createSecretary(secretaryData);
      
      if (response && response.uid) {
        // Save the temp password to display
        if (response.tempPassword) {
          setTempPassword(response.tempPassword);
        }
        
        setSuccess("Secretary account created successfully!");
        
        // Track event for analytics
        trackEvent("create_secretary_success", { 
          law_firm: lawFirmAdmin.lawFirm 
        });
        
        // Refresh data after a delay
        setTimeout(() => {
          setIsCreating(false);
          fetchSecretary(lawFirmAdmin.lawFirm);
        }, 1000);
      }
    } catch (error) {
      console.error("Error creating secretary:", error);
      setError(error.response?.data?.error || "Failed to create secretary account. Please try again.");
      
      // Track error
      trackEvent("create_secretary_error", { 
        error: error.response?.data?.error || error.message 
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
    setConfirmDelete(true);
    setError("");
    setSuccess("");
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
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
                    variant="danger" 
                    icon="delete"
                    onClick={initiateDelete}
                  >
                    Delete Secretary
                  </Button>
                </div>
              )}
            </div>
          ) : (isEditing || isCreating) ? (
            <div className="secretary-edit-form">
              {error && <div className="error-message">{error}</div>}
              {success && (
                <div className="success-message">
                  {success}
                  {tempPassword && (
                    <div className="temp-password-info">
                      <p>Temporary password: <strong>{tempPassword}</strong></p>
                      <p>Please share this with the secretary. They will be asked to change it on first login.</p>
                    </div>
                  )}
                </div>
              )}
              
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
              {isCreating && (
                <p className="form-note">A temporary password will be generated and shown after creation.</p>
              )}
              
              <div className="form-actions">
                {isEditing ? (
                  <Button 
                    variant="success" 
                    icon="save"
                    onClick={saveSecretaryChanges}
                  >
                    Save Changes
                  </Button>
                ) : (
                  <Button 
                    variant="success" 
                    icon="add"
                    onClick={createSecretary}
                  >
                    Create Secretary
                  </Button>
                )}
                
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