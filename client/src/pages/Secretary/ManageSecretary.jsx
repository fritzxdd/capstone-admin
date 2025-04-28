import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update, remove } from "firebase/database";
import { sendPasswordResetEmail } from "firebase/auth";
import "../../styles/index.css";

const ManageSecretary = () => {
  const navigate = useNavigate();
  const [secretaries, setSecretaries] = useState([]);
  const [selectedSecretary, setSelectedSecretary] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: ""
  });

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
        } else {
          console.log("No secretaries found for this admin");
          setSecretaries([]);
        }
      } else {
        console.log("No secretaries found at all");
        setSecretaries([]);
      }
    } catch (error) {
      console.error("Error fetching secretaries:", error);
      setError("Failed to load secretary data. Please try again.");
    }
  };

  const handleSelectSecretary = (secretary) => {
    setSelectedSecretary(secretary);
    setEditForm({
      name: secretary.name || "",
      email: secretary.email || "",
      phone: secretary.phone || ""
    });
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    if (!selectedSecretary) {
      setError("No secretary selected");
      return;
    }
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const handleAdd = () => {
    navigate("/add-secretary");
  };

  const handleUpdate = async () => {
    if (!selectedSecretary) {
      setError("No secretary selected to update");
      return;
    }

    if (!editForm.name || !editForm.email) {
      setError("Name and email are required");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Update secretary via direct Firebase operation
      await update(ref(db, `secretaries/${selectedSecretary.id}`), editForm);
      
      // Update the local state
      const updatedSecretaries = secretaries.map(secretary => {
        if (secretary.id === selectedSecretary.id) {
          return {
            ...secretary,
            ...editForm
          };
        }
        return secretary;
      });

      setSecretaries(updatedSecretaries);
      setSelectedSecretary({
        ...selectedSecretary,
        ...editForm
      });

      setSuccess("Secretary information updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating secretary:", error);
      setError("Failed to update secretary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (selectedSecretary) {
      setEditForm({
        name: selectedSecretary.name || "",
        email: selectedSecretary.email || "",
        phone: selectedSecretary.phone || ""
      });
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  const handleDeleteSecretary = async () => {
    if (!selectedSecretary) {
      setError("No secretary selected to delete");
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete ${selectedSecretary.name}?`)) {
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
      setSelectedSecretary(null);
    } catch (error) {
      console.error("Error deleting secretary:", error);
      setError("Failed to delete secretary. Please try again.");
    } finally {
      setIsLoading(false);
    }
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
    } catch (error) {
      console.error("Error sending password reset:", error);
      setError("Failed to send password reset email: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render the empty state when no secretaries
  const renderEmptyState = () => {
    return (
      <div className="empty-state">
        <div className="empty-icon">👩‍💼</div>
        <h3>No Secretaries Found</h3>
        <p>You haven't added any secretaries to your law firm yet.</p>
      </div>
    );
  };

  // Render the select secretary state
  const renderSelectState = () => {
    return (
      <div className="select-state">
        <div className="select-icon">👩‍💼</div>
        <h3>Select a Secretary</h3>
        <p>Select a secretary from the list to view or edit their details.</p>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Manage Secretaries</h1>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="secretary-management">
            <div className="secretary-sidebar">
              <div className="sidebar-header">
                <h3>Your Secretaries</h3>
                <button className="btn add-btn" onClick={handleAdd}>Add New</button>
              </div>
              
              <div className="secretary-list">
                {secretaries.length === 0 ? (
                  renderEmptyState()
                ) : (
                  secretaries.map(secretary => (
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
                  ))
                )}
              </div>
            </div>
            
            <div className="secretary-details">
              {!selectedSecretary ? (
                secretaries.length > 0 ? renderSelectState() : null
              ) : isEditing ? (
                <div className="secretary-edit-form">
                  <h3>Edit Secretary</h3>
                  <div className="form-group">
                    <label htmlFor="name">Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editForm.name}
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
                      value={editForm.email}
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
                      value={editForm.phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button className="btn primary-btn" onClick={handleUpdate}>
                      Save Changes
                    </button>
                    <button className="btn secondary-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="secretary-view">
                  <div className="secretary-profile">
                    <div className="secretary-avatar large">
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
                  
                  <div className="action-buttons">
                    <button className="btn primary-btn" onClick={handleEdit}>
                      Edit Secretary
                    </button>
                    
                    <button className="btn secondary-btn" onClick={handleResetPassword}>
                      Reset Password
                    </button>
                    
                    <button className="btn danger-btn" onClick={handleDeleteSecretary}>
                      Delete Secretary
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageSecretary;