import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, onValue, update, remove } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../services/firebase";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import BackButton from "../../components/UI/BackButton";
import "../../styles/index.css";

const ManageSecretary = () => {
  const [secretaries, setSecretaries] = useState([]);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("loading"); // loading, success, error, empty
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const navigate = useNavigate();

  // Display toast message
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch secretaries for current admin
  useEffect(() => {
    const fetchSecretaries = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setFetchStatus("error");
          setError("User authentication required");
          setIsLoading(false);
          return;
        }

        const adminUID = user.uid;
        const secretariesRef = ref(db, "secretaries");
        
        const unsubscribe = onValue(secretariesRef, (snapshot) => {
          if (snapshot.exists()) {
            const secretariesData = [];
            snapshot.forEach((childSnapshot) => {
              const secretary = {
                id: childSnapshot.key,
                ...childSnapshot.val(),
                // Ensure active property exists with default to true for backwards compatibility
                active: childSnapshot.val().active !== false
              };
              
              // Filter to only show secretaries for the current admin
              if (secretary.adminUID === adminUID) {
                secretariesData.push(secretary);
              }
            });
            
            // Sort active secretaries first, then by name
            secretariesData.sort((a, b) => {
              if (a.active !== b.active) return b.active ? 1 : -1;
              return a.name.localeCompare(b.name);
            });
            
            setSecretaries(secretariesData);
            setFetchStatus(secretariesData.length > 0 ? "success" : "empty");
            
            // Log analytics event
            if (analytics) {
              logEvent(analytics, "secretary_list_view", { 
                count: secretariesData.length 
              });
            }
          } else {
            setSecretaries([]);
            setFetchStatus("empty");
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error loading secretaries:", error);
          setError("Failed to load secretaries. Please try again.");
          setFetchStatus("error");
          setIsLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching secretaries:", error);
        setError("Failed to load secretaries: " + error.message);
        setFetchStatus("error");
        setIsLoading(false);
      }
    };

    fetchSecretaries();
  }, []);

  // Handle secretary selection
  const handleSelectSecretary = (secretary) => {
    setSelectedSecretary(secretary);
    setEditFormData({
      name: secretary.name || "",
      email: secretary.email || "",
      phone: secretary.phone || ""
    });
    
    // Reset editing state
    setIsEditing(false);
    
    // Log selection event
    if (analytics) {
      logEvent(analytics, "select_secretary", { 
        secretary_id: secretary.id,
        secretary_name: secretary.name
      });
    }
  };

  // Handle adding new secretary
  const handleAddSecretary = () => {
    navigate("/add-secretary");
  };

  // Toggle editing mode
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    // Reset form data to secretary data when toggling edit mode
    if (!isEditing && selectedSecretary) {
      setEditFormData({
        name: selectedSecretary.name || "",
        email: selectedSecretary.email || "",
        phone: selectedSecretary.phone || ""
      });
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  // Save edited secretary data
  const handleSaveSecretary = async () => {
    if (!selectedSecretary) return;
    
    setIsLoading(true);
    try {
      // Update secretary data in Firebase
      const updates = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone
      };
      
      await update(ref(db, `secretaries/${selectedSecretary.id}`), updates);
      
      // Update local state
      const updatedSecretaries = secretaries.map(secretary => {
        if (secretary.id === selectedSecretary.id) {
          return { ...secretary, ...updates };
        }
        return secretary;
      });
      
      setSecretaries(updatedSecretaries);
      setSelectedSecretary({ ...selectedSecretary, ...updates });
      
      setIsEditing(false);
      showToast("Secretary updated successfully", "success");
      
      if (analytics) {
        logEvent(analytics, "update_secretary", { 
          secretary_id: selectedSecretary.id 
        });
      }
    } catch (error) {
      console.error("Error updating secretary:", error);
      showToast(`Failed to update secretary: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to secretary data
    if (selectedSecretary) {
      setEditFormData({
        name: selectedSecretary.name || "",
        email: selectedSecretary.email || "",
        phone: selectedSecretary.phone || ""
      });
    }
  };

  // Toggle disable/enable confirmation
  const handleStatusClick = () => {
    setConfirmDelete(true);
  };

  // Cancel disable/enable
  const handleCancelStatusChange = () => {
    setConfirmDelete(false);
  };

  // Disable secretary account
  const handleDisableAccount = async () => {
    if (!selectedSecretary) return;
    
    setIsLoading(true);
    try {
      // Update the secretary in database to set active status to false
      await update(ref(db, `secretaries/${selectedSecretary.id}`), {
        active: false,
        disabledAt: new Date().toISOString()
      });
      
      // Log action
      if (analytics) {
        logEvent(analytics, "disable_secretary", { 
          secretary_id: selectedSecretary.id 
        });
      }
      
      showToast(`Secretary ${selectedSecretary.name} has been disabled`, 'success');
      
      // Close modal
      setConfirmDelete(false);
      
      // Update local state to reflect the change
      const updatedSecretaries = secretaries.map(s => {
        if (s.id === selectedSecretary.id) {
          return { ...s, active: false };
        }
        return s;
      });
      
      setSecretaries(updatedSecretaries);
      setSelectedSecretary({...selectedSecretary, active: false});
      
    } catch (error) {
      console.error("Error disabling secretary:", error);
      setError("Failed to disable secretary: " + error.message);
      showToast("Failed to disable secretary", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Enable secretary account
  const handleEnableAccount = async () => {
    if (!selectedSecretary) return;
    
    setIsLoading(true);
    try {
      // Update the secretary in database to set active status to true
      await update(ref(db, `secretaries/${selectedSecretary.id}`), {
        active: true,
        disabledAt: null,
        reactivatedAt: new Date().toISOString()
      });
      
      // Log action
      if (analytics) {
        logEvent(analytics, "enable_secretary", { 
          secretary_id: selectedSecretary.id 
        });
      }
      
      showToast(`Secretary ${selectedSecretary.name} has been reactivated`, 'success');
      
      // Update local state to reflect the change
      const updatedSecretaries = secretaries.map(s => {
        if (s.id === selectedSecretary.id) {
          return { ...s, active: true };
        }
        return s;
      });
      
      setSecretaries(updatedSecretaries);
      setSelectedSecretary({...selectedSecretary, active: true});
      
    } catch (error) {
      console.error("Error enabling secretary:", error);
      setError("Failed to enable secretary: " + error.message);
      showToast("Failed to enable secretary", 'error');
    }
    finally {
      setIsLoading(false);
    }
  };

  // Reset password for secretary
  const handleResetPassword = async () => {
    if (!selectedSecretary || !selectedSecretary.email) {
      showToast("No secretary selected or email not available", 'error');
      return;
    }
    
    try {
      // Use Firebase password reset
      await sendPasswordResetEmail(auth, selectedSecretary.email);
      
      showToast(`Password reset email sent to ${selectedSecretary.email}`, 'success');
      
      // Log password reset action
      if (analytics) {
        logEvent(analytics, "reset_secretary_password", { 
          secretary_id: selectedSecretary.id 
        });
      }
    } catch (error) {
      console.error("Error sending password reset:", error);
      showToast(`Failed to send password reset: ${error.message}`, 'error');
    }
  };

  // Render secretary item
  const SecretaryItem = ({ secretary }) => {
    const isSelected = selectedSecretary && selectedSecretary.id === secretary.id;
    const isDisabled = secretary.active === false;
    
    return (
      <div 
        className={`secretary-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={() => handleSelectSecretary(secretary)}
      >
        <div className="secretary-avatar">
          {secretary.name ? secretary.name.charAt(0).toUpperCase() : "S"}
        </div>
        
        <div className="secretary-content">
          <div className="secretary-header">
            <h3 className="secretary-name">{secretary.name}</h3>
            <div className="secretary-status">
              <span className="secretary-role">secretary</span>
              {isDisabled && <span className="status-badge disabled">Disabled</span>}
            </div>
          </div>
          
          <div className="secretary-details">
            <div className="secretary-info-item">
              <span className="info-text">{secretary.email}</span>
            </div>
            
            {secretary.phone && (
              <div className="secretary-info-item">
                <span className="info-text">{secretary.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render content based on fetch status
  const renderContent = () => {
    if (isLoading && fetchStatus === "loading") {
      return <Loading message="Loading secretaries..." />;
    }

    if (fetchStatus === "error") {
      return (
        <div className="error-state">
          <h3>Error Loading Secretaries</h3>
          <p>{error || "There was a problem loading the secretary list."}</p>
          <Button 
            variant="primary" 
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      );
    }

    if (fetchStatus === "empty") {
      return (
        <div className="empty-state">
          <h3>No Secretaries Found</h3>
          <p>You haven't added any secretaries yet.</p>
          <Button 
            variant="primary" 
            onClick={handleAddSecretary}
          >
            Add Your First Secretary
          </Button>
        </div>
      );
    }

    return (
      <div className="secretary-management-layout">
        {/* Secretary List Sidebar */}
        <div className="secretary-sidebar">
          <div className="secretary-sidebar-header">
            <h3>Secretaries</h3>
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleAddSecretary}
            >
              Add
            </Button>
          </div>
          
          <div className="secretary-list-container">
            {secretaries.map(secretary => (
              <SecretaryItem
                key={secretary.id}
                secretary={secretary}
              />
            ))}
          </div>
        </div>
        
        {/* Secretary Detail Panel */}
<div className="secretary-detail-panel">
  {selectedSecretary ? (
    <div className="secretary-details">
      <div className="secretary-profile-header">
        <div className="secretary-avatar large">
          {selectedSecretary.name ? selectedSecretary.name.charAt(0).toUpperCase() : "S"}
        </div>
        <div className="secretary-profile-info">
          <div className="secretary-header-with-status">
            <h2>{selectedSecretary.name}</h2>
            {selectedSecretary.active === false && (
              <span className="account-status-badge disabled">Account Disabled</span>
            )}
          </div>
          <p className="secretary-role-badge">Secretary</p>
          
          {/* Status history section - Show when account was disabled/reactivated */}
          {(selectedSecretary.disabledAt || selectedSecretary.reactivatedAt) && (
            <div className="status-history">
              {selectedSecretary.disabledAt && (
                <div className="status-timestamp">
                  <span className="timestamp-icon">⏱</span>
                  <span className="timestamp-text">
                    {selectedSecretary.active === false ? 'Disabled on: ' : 'Last disabled on: '}
                    {new Date(selectedSecretary.disabledAt).toLocaleString()}
                  </span>
                </div>
              )}
              {selectedSecretary.reactivatedAt && (
                <div className="status-timestamp">
                  <span className="timestamp-icon">🔄</span>
                  <span className="timestamp-text">
                    Reactivated on: {new Date(selectedSecretary.reactivatedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {isEditing ? (
        // Edit mode form
        <div className="secretary-edit-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={editFormData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={editFormData.email}
              onChange={handleInputChange}
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
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-actions">
            <Button
              variant="success"
              onClick={handleSaveSecretary}
              disabled={isLoading}
            >
              Save Changes
            </Button>
            <Button
              variant="secondary"
              onClick={handleCancelEdit}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        // View mode
        <>
          <div className="info-section">
            <h3 className="section-title">Contact Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{selectedSecretary.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone:</span>
                <span className="info-value">{selectedSecretary.phone || "Not provided"}</span>
              </div>
            </div>
          </div>
          
          <div className="info-section">
            <h3 className="section-title">Law Firm Association</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Law Firm:</span>
                <span className="info-value">{selectedSecretary.lawFirm || "Not specified"}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {selectedSecretary.createdAt ? new Date(selectedSecretary.createdAt).toLocaleDateString() : "Unknown"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Account Status:</span>
                <span className={`info-value ${selectedSecretary.active === false ? 'text-error' : 'text-success'}`}>
                  {selectedSecretary.active === false ? 'Disabled' : 'Active'}
                </span>
              </div>
              {selectedSecretary.active === false && selectedSecretary.disabledAt && (
                <div className="info-item">
                  <span className="info-label">Disabled On:</span>
                  <span className="info-value">
                    {new Date(selectedSecretary.disabledAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {selectedSecretary.reactivatedAt && (
                <div className="info-item">
                  <span className="info-label">Last Reactivated:</span>
                  <span className="info-value">
                    {new Date(selectedSecretary.reactivatedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="info-section">
            <h3 className="section-title">Account Security</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Password Status:</span>
                <span className="info-value">
                  {selectedSecretary.passwordChanged ? 'Custom Password' : 'Temporary Password'}
                </span>
              </div>
              {selectedSecretary.lastLoginAt && (
                <div className="info-item">
                  <span className="info-label">Last Login:</span>
                  <span className="info-value">
                    {new Date(selectedSecretary.lastLoginAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="secretary-actions-container">
            <Button 
              variant="primary" 
              onClick={handleEditToggle}
              disabled={selectedSecretary.active === false}
            >
              Edit Secretary
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleResetPassword}
              disabled={selectedSecretary.active === false}
            >
              Reset Password
            </Button>
            <Button 
              variant={selectedSecretary.active ? "danger" : "success"} 
              onClick={handleStatusClick}
            >
              {selectedSecretary.active ? "Disable Account" : "Enable Account"}
            </Button>
          </div>
          
          {selectedSecretary.active === false && (
            <div className="disable-info-box">
              <p className="disable-info-text">
                <span className="info-icon">ℹ️</span>
                This account is currently disabled. The secretary cannot log in until the account is re-enabled.
                All secretary data is preserved.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  ) : (
    <div className="empty-secretary-detail">
      <div className="empty-icon">
        <span>🔍</span>
      </div>
      <h3>No Secretary Selected</h3>
      <p>Select a secretary from the list to view details</p>
    </div>
  )}
</div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {/* Status Change Confirmation Modal */}
      {confirmDelete && selectedSecretary && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>{selectedSecretary.active ? "Disable Account" : "Enable Account"}</h3>
            </div>
            <div className="modal-body">
              {selectedSecretary.active ? (
                <>
                  <p>Are you sure you want to disable <strong>{selectedSecretary.name}</strong>'s account?</p>
                  <p>They will no longer be able to log in, but their account information will be preserved.</p>
                </>
              ) : (
                <>
                  <p>Are you sure you want to re-enable <strong>{selectedSecretary.name}</strong>'s account?</p>
                  <p>This will restore their ability to log in to the system.</p>
                </>
              )}
            </div>
            <div className="modal-footer">
              <Button 
                variant={selectedSecretary.active ? "danger" : "success"} 
                onClick={selectedSecretary.active ? handleDisableAccount : handleEnableAccount}
                disabled={isLoading}
              >
                {isLoading 
                  ? (selectedSecretary.active ? "Disabling..." : "Enabling...") 
                  : (selectedSecretary.active ? "Disable Account" : "Enable Account")}
              </Button>
              <Button 
                variant="secondary" 
                onClick={handleCancelStatusChange}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <main className="app-content">
        {/* Back button placed above the card, outside of the card container */}
        <div className="back-button-container" style={{ marginBottom: '20px' }}>
          <BackButton to="/" />
        </div>
        
        <Card className="secretary-management-card">
          <div className="card-header">
            <h2 className="card-title">
              Manage Secretaries
            </h2>
            <p className="card-subtitle">View, add, edit, and manage secretaries for your law firm</p>
          </div>
          
          <div className="secretary-management-content">
            {renderContent()}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default ManageSecretary;