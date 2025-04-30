import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, onValue, remove } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import { logEvent } from "firebase/analytics";
import { analytics } from "../../services/firebase";
import Header from "../../components/Layout/Header";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import Toast from "../../components/UI/Toast";
import { Secretary } from "../../components/Secretary";
import "../../styles/index.css";

const ManageSecretary = () => {
  const [secretaries, setSecretaries] = useState([]);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("loading"); // loading, success, error, empty
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
                ...childSnapshot.val()
              };
              
              // Filter to only show secretaries for the current admin
              if (secretary.adminUID === adminUID) {
                secretariesData.push(secretary);
              }
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

  // Handle editing secretary
  const handleEditSecretary = () => {
    if (selectedSecretary) {
      navigate(`/secretary/edit/${selectedSecretary.id}`);
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
    if (!selectedSecretary) return;
    
    setIsLoading(true);
    try {
      // Delete the secretary from database
      await remove(ref(db, `secretaries/${selectedSecretary.id}`));
      
      // Log deletion
      if (analytics) {
        logEvent(analytics, "delete_secretary", { 
          secretary_id: selectedSecretary.id 
        });
      }
      
      showToast(`Secretary ${selectedSecretary.name} deleted successfully`, 'success');
      
      // Clear selection and close modal
      setSelectedSecretary(null);
      setConfirmDelete(false);
      
      // Remove from local state
      setSecretaries(secretaries.filter(s => s.id !== selectedSecretary.id));
      
      // Update fetch status if no secretaries left
      if (secretaries.length === 1) {
        setFetchStatus("empty");
      }
    } catch (error) {
      console.error("Error deleting secretary:", error);
      setError("Failed to delete secretary: " + error.message);
      showToast("Failed to delete secretary", 'error');
    } finally {
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

  // Render content based on fetch status
  const renderContent = () => {
    if (isLoading) {
      return <Loading message="Loading secretaries..." />;
    }

    if (fetchStatus === "error") {
      return (
        <div className="error-state">
          <div className="error-icon">⚠️</div>
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
          <div className="empty-icon secretary-empty-icon">👩‍💼</div>
          <h3>No Secretaries Found</h3>
          <p>You haven't added any secretaries yet.</p>
          <Button 
            variant="primary" 
            onClick={handleAddSecretary}
            icon="add"
          >
            Add Your First Secretary
          </Button>
        </div>
      );
    }

    return (
      <div className="secretary-management-layout">
        <div className="secretary-sidebar">
          <div className="secretary-sidebar-header">
            <h3>Secretaries</h3>
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleAddSecretary}
              icon="add"
            >
              Add
            </Button>
          </div>
          
          <div className="secretary-list-container">
            {secretaries.map(secretary => (
              <Secretary
                key={secretary.id}
                secretary={secretary}
                onSelect={handleSelectSecretary}
                isSelected={selectedSecretary && selectedSecretary.id === secretary.id}
              />
            ))}
          </div>
        </div>
        
        <div className="secretary-detail-panel">
          {selectedSecretary ? (
            <div className="secretary-details">
              <div className="secretary-profile-header">
                <div className="secretary-avatar large">
                  {selectedSecretary.name ? selectedSecretary.name.charAt(0).toUpperCase() : "S"}
                </div>
                <div className="secretary-profile-info">
                  <h2>{selectedSecretary.name}</h2>
                  <p className="secretary-role-badge">Secretary</p>
                </div>
              </div>
              
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
              
              {selectedSecretary.assignedLawyers && selectedSecretary.assignedLawyers.length > 0 && (
                <div className="info-section">
                  <h3 className="section-title">Assigned Lawyers</h3>
                  <ul className="assigned-lawyers-list">
                    {selectedSecretary.assignedLawyers.map(lawyer => (
                      <li key={lawyer.id}>{lawyer.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="secretary-actions-container">
                <Button 
                  variant="primary" 
                  onClick={handleEditSecretary}
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
          ) : (
            <div className="empty-secretary-detail">
              <div className="empty-icon select-icon"></div>
              <h3>No Secretary Selected</h3>
              <p>Select a secretary from the list or add a new one.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <Header user={auth.currentUser} onLogout={() => signOut(auth)} />
      
      <div className="app-content">
        {toast && <Toast message={toast.message} type={toast.type} />}
        
        {/* Delete Confirmation Modal */}
        {confirmDelete && selectedSecretary && (
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <h3>Confirm Deletion</h3>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete secretary <strong>{selectedSecretary.name}</strong>?</p>
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
        
        <Card className="secretary-management-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="secretary-icon"></span>
              Manage Secretaries
            </h2>
            <p className="card-subtitle">View, add, edit, and manage secretaries for your law firm</p>
          </div>
          
          <div className="secretary-management-content">
            {renderContent()}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ManageSecretary;