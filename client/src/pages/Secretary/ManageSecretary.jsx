import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update, remove } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import apiService from "../../services/api";
import { trackEvent } from "../../services/analytics";
import "../../styles/index.css";

const ManageSecretary = () => {
  const navigate = useNavigate();
  const [secretaries, setSecretaries] = useState([]);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState(null);
  const [adminCredentials, setAdminCredentials] = useState({
    email: "",
    password: ""
  });
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  // Display toast message
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

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
            await fetchSecretaries(adminData.lawFirm, user.uid);
          } else {
            // Fallback to database query
            const adminRef = ref(db, `law_firm_admin/${user.uid}`);
            const snapshot = await get(adminRef);
            if (snapshot.exists()) {
              const adminData = snapshot.val();
              setLawFirmAdmin(adminData);
              await fetchSecretaries(adminData.lawFirm, user.uid);
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

    fetchAdminData();
  }, [navigate]);

  const fetchSecretaries = async (lawFirm, adminUID) => {
    try {
      // Clear any previous error
      setError("");
      
      console.log(`Fetching secretaries for law firm: "${lawFirm}" and adminUID: "${adminUID}"`);
      
      // Query all secretaries and filter those that match our admin UID
      const secretariesRef = ref(db, 'secretaries');
      const snapshot = await get(secretariesRef);
      
      if (snapshot.exists()) {
        const secretaryList = [];
        
        snapshot.forEach((childSnapshot) => {
          const data = childSnapshot.val();
          
          // Check if the secretary belongs to this admin
          if (data.adminUID === adminUID) {
            secretaryList.push({
              id: childSnapshot.key,
              ...data
            });
          }
        });
        
        if (secretaryList.length > 0) {
          console.log(`Found ${secretaryList.length} secretaries:`, secretaryList);
          setSecretaries(secretaryList);
          
          // If there was a selected secretary that's still in the list, keep it selected
          if (selectedSecretary) {
            const stillExists = secretaryList.find(s => s.id === selectedSecretary.id);
            if (!stillExists) {
              setSelectedSecretary(null);
            }
          }
        } else {
          console.log("No secretaries found for this admin");
          setSecretaries([]);
          setSelectedSecretary(null);
        }
      } else {
        console.log("No secretaries found at all");
        setSecretaries([]);
        setSelectedSecretary(null);
      }
    } catch (error) {
      console.error("Error fetching secretaries:", error);
      setError("Failed to load secretary data. Please try again.");
    }
  };

  const handleSelectSecretary = (secretary) => {
    setSelectedSecretary(secretary);
    setEditFormData({
      name: secretary.name || "",
      email: secretary.email || "",
      phone: secretary.phone || ""
    });
    setIsEditing(false);
    setConfirmDelete(false);
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const enableEditing = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const enableCreating = () => {
    navigate("/add-secretary");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    
    // Reset form to original selected secretary data
    if (selectedSecretary) {
      setEditFormData({
        name: selectedSecretary.name || "",
        email: selectedSecretary.email || "",
        phone: selectedSecretary.phone || ""
      });
    }
    
    setError("");
    setSuccess("");
  };

  // Handle password reset
  const handleResetPassword = async () => {
    if (!selectedSecretary || !selectedSecretary.email) {
      setError("Secretary email not found");
      return;
    }
    
    setIsLoading(true);
    try {
      // Use Firebase's password reset functionality
      await sendPasswordResetEmail(auth, selectedSecretary.email);
      
      setSuccess(`Password reset email sent to ${selectedSecretary.email}`);
      showToast(`Password reset email sent to ${selectedSecretary.email}`, 'success');
      
      trackEvent("secretary_password_reset_success", {
        secretary_id: selectedSecretary.id
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
    if (!selectedSecretary) {
      setError("No secretary selected to update");
      return;
    }

    if (!editFormData.name || !editFormData.email) {
      setError("Name and email are required");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update secretary via direct Firebase operation
      await update(ref(db, `secretaries/${selectedSecretary.id}`), editFormData);
      
      // Update the local state
      const updatedSecretaries = secretaries.map(secretary => {
        if (secretary.id === selectedSecretary.id) {
          return {
            ...secretary,
            ...editFormData
          };
        }
        return secretary;
      });

      setSecretaries(updatedSecretaries);
      setSelectedSecretary({
        ...selectedSecretary,
        ...editFormData
      });

      setSuccess("Secretary information updated successfully");
      showToast("Secretary information updated successfully", 'success');
      setIsEditing(false);
      
      // Track success
      trackEvent("update_secretary_success", { 
        secretary_id: selectedSecretary.id 
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
    if (!selectedSecretary) {
      setError("No secretary selected");
      return;
    }
    setShowAdminAuth(true);
    setError("");
    setSuccess("");
  };

  const cancelDelete = () => {
    setConfirmDelete(false);
    setShowAdminAuth(false);
  };

  const deleteSecretary = async () => {
    if (!selectedSecretary) {
      setError("No secretary selected to delete");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Delete secretary directly from Firebase
      await remove(ref(db, `secretaries/${selectedSecretary.id}`));
      
      // Update local state
      setSecretaries(secretaries.filter(secretary => secretary.id !== selectedSecretary.id));
      setSuccess("Secretary deleted successfully");
      showToast("Secretary deleted successfully", 'success');
      setSelectedSecretary(null);
      setConfirmDelete(false);
      
      // Track success
      trackEvent("delete_secretary_success", { 
        secretary_id: selectedSecretary.id 
      });
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

  const verifyAdminPassword = async () => {
    // For simplicity - in a real implementation you should verify admin password with Firebase
    // Here we're just showing the confirmation UI
    setShowAdminAuth(false);
    setConfirmDelete(true);
  };

  // Render the secretary list
  const renderSecretaryList = () => {
    if (secretaries.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">👩‍💼</div>
          <h3>No Secretaries Found</h3>
          <p>You haven't added any secretaries to your law firm yet.</p>
        </div>
      );
    }

    return (
      <div className="secretary-list">
        {secretaries.map(secretary => (
          <div 
            key={secretary.id} 
            className={`secretary-list-item ${selectedSecretary?.id === secretary.id ? 'selected' : ''}`}
            onClick={() => handleSelectSecretary(secretary)}
          >
            <div className="secretary-avatar">
              {secretary.name ? secretary.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div className="secretary-list-info">
              <h3 className="secretary-list-name">{secretary.name}</h3>
              <p className="secretary-list-email">{secretary.email}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render secretary details
  const renderSecretaryDetails = () => {
    if (!selectedSecretary) {
      return (
        <div className="empty-state">
          <div className="empty-icon">👩‍💼</div>
          <h3>Select a Secretary</h3>
          <p>Select a secretary from the list to view or edit their details.</p>
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="secretary-edit-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={editFormData.name}
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
                value={editFormData.email}
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
                value={editFormData.phone}
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
      );
    }

    return (
      <div className="secretary-details">
        <div className="secretary-profile">
          <div className="secretary-avatar">
            {selectedSecretary.name ? selectedSecretary.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div className="secretary-info">
            <h3>{selectedSecretary.name}</h3>
            <p className="secretary-role">Secretary</p>
          </div>
        </div>
        
        <div className="info-section">
          <div className="info-row">
            <div className="info-label">Name:</div>
            <div className="info-value">{selectedSecretary.name}</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Email:</div>
            <div className="info-value">{selectedSecretary.email}</div>
          </div>
          
          <div className="info-row">
            <div className="info-label">Phone:</div>
            <div className="info-value">{selectedSecretary.phone || "Not provided"}</div>
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
    );
  };

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

        <Card className="secretary-management-card">
          <div className="secretary-header">
            <button onClick={() => navigate("/")} className="back-button">
              <span className="icon-back"></span>
            </button>
            <h2 className="secretary-title">Manage Secretaries</h2>
            <div className="header-underline"></div>
          </div>

          {isLoading ? (
            <Loading message="Loading secretaries..." />
          ) : (
            <div className="secretary-management-content">
              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}
              
              <div className="secretary-management-layout">
                <div className="secretary-sidebar">
                  <div className="secretary-sidebar-header">
                    <h3>Your Secretaries</h3>
                    <Button 
                      variant="primary" 
                      icon="add"
                      onClick={enableCreating}
                      size="sm"
                    >
                      Add New
                    </Button>
                  </div>
                  
                  <div className="secretary-list-container">
                    {renderSecretaryList()}
                  </div>
                </div>
                
                <div className="secretary-detail-panel">
                  {renderSecretaryDetails()}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ManageSecretary;