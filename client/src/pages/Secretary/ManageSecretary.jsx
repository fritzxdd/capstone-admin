import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update, remove } from "firebase/database";
import { updatePassword } from "firebase/auth";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";

const ManageSecretary = () => {
  const navigate = useNavigate();
  const [secretary, setSecretary] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [initialData, setInitialData] = useState(null);
  const [lawFirmAdmin, setLawFirmAdmin] = useState(null);
  const [existingSecretary, setExistingSecretary] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (user) {
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
      setIsLoading(false);
    };

    const fetchSecretary = async (lawFirm) => {
      const secRef = ref(db, `secretaries`);
      const snapshot = await get(secRef);
      if (snapshot.exists()) {
        const secretaries = snapshot.val();
        for (const uid in secretaries) {
          if (secretaries[uid].lawFirm === lawFirm) {
            const secretaryData = {
              uid,
              ...secretaries[uid]
            };
            setExistingSecretary(secretaryData);
            setSecretary({
              name: secretaries[uid].name || "",
              email: secretaries[uid].email || "",
              phone: secretaries[uid].phone || "",
              password: ""
            });
            setInitialData({
              name: secretaries[uid].name || "",
              email: secretaries[uid].email || "",
              phone: secretaries[uid].phone || ""
            });
            break;
          }
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
    setError("");
    setSuccess("");
  };

  const cancelEditing = () => {
    setIsEditing(false);
    // Reset to original data
    if (initialData) {
      setSecretary({
        ...initialData,
        password: ""
      });
    }
    setError("");
    setSuccess("");
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
      // Update database record
      const updates = {
        name: secretary.name,
        phone: secretary.phone,
        email: secretary.email
      };

      await update(ref(db, `secretaries/${existingSecretary.uid}`), updates);
      
      // Update password if provided
      if (secretary.password) {
        try {
          // This would need to be done through a secure method, typically via a Cloud Function
          // For this example, we're assuming there's a way to update password securely
          console.log("Password would be updated here");
        } catch (passwordError) {
          console.error("Error updating password:", passwordError);
          setError("Updated secretary info, but failed to update password");
          setIsLoading(false);
          return;
        }
      }

      // Update initial data
      setInitialData({
        name: secretary.name,
        email: secretary.email,
        phone: secretary.phone
      });

      setSuccess("Secretary information updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating secretary:", error);
      setError(`Failed to update secretary: ${error.message}`);
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
      await remove(ref(db, `secretaries/${existingSecretary.uid}`));
      setSuccess("Secretary deleted successfully");
      setExistingSecretary(null);
      setSecretary({ name: "", email: "", phone: "", password: "" });
      setInitialData(null);
      setConfirmDelete(false);
      
      // Redirect to dashboard after a short delay
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error deleting secretary:", error);
      setError(`Failed to delete secretary: ${error.message}`);
      setConfirmDelete(false);
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
          ) : existingSecretary && !isEditing ? (
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
          ) : existingSecretary && isEditing ? (
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
                
                <div className="form-group">
                  <label htmlFor="password">New Password (leave blank to keep unchanged)</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={secretary.password}
                    onChange={handleChange}
                    placeholder="New password"
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
                  onClick={() => navigate("/add-secretary")}
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