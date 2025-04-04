import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "../../services/firebase";
import { ref, get, update, remove } from "firebase/database";
import Button from "../../components/UI/Button";
import Card from "../../components/UI/Card";
import Loading from "../../components/UI/Loading";
import apiService from "../../services/api";
import { trackEvent } from "../../services/analytics";
import "../../styles/index.css"; 

const LawyerDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lawyer, setLawyer] = useState(null);
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState("");
  const [image, setImage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchLawyerData();
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
      } else {
        console.error("Lawyer not found");
        setError("Lawyer not found.");
      }
    } catch (error) {
      console.error("Error fetching lawyer data:", error);
      setError("Failed to load lawyer details. Please try again.");
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
      
      // Try both methods to update the lawyer
      try {
        // First try API service
        await apiService.updateLawyer(id, lawyer);
      } catch (apiError) {
        console.error("API update failed, trying direct Firebase update:", apiError);
        
        // Fallback to direct Firebase update
        const lawyerRef = ref(db, `lawyers/${id}`);
        await update(lawyerRef, lawyer);
      }
      
      setSuccess("Lawyer updated successfully.");
      setIsEditing(false);
      
      // Track success
      trackEvent("update_lawyer_success", { lawyer_id: id });
    } catch (error) {
      console.error("Error updating lawyer:", error);
      setError("Failed to update lawyer. Please try again.");
      
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
        
        try {
          // First try API service
          await apiService.updateLawyer(id, updateData);
        } catch (apiError) {
          console.error("API service update failed, trying direct Firebase update:", apiError);
          
          // Fallback to direct Firebase update
          const lawyerRef = ref(db, `lawyers/${id}`);
          await update(lawyerRef, updateData);
        }
        
        // Track success
        trackEvent("add_lawyer_service_success", { 
          lawyer_id: id,
          service: newService
        });
      } catch (error) {
        console.error("Error updating services:", error);
        setError("Failed to add service. Please try again.");
        
        // Revert the local state change
        setServices(services);
        
        // Track error
        trackEvent("add_lawyer_service_error", { 
          error: error.message
        });
      }
    }
  };

  const handleDeleteLawyer = async () => {
    if (window.confirm("Are you sure you want to delete this lawyer?")) {
      setIsLoading(true);
      setError("");
      
      try {
        console.log(`Deleting lawyer with ID: ${id}`);
        
        try {
          // First try API service
          await apiService.deleteLawyer(id);
        } catch (apiError) {
          console.error("API delete failed, trying direct Firebase delete:", apiError);
          
          // Fallback to direct Firebase delete
          const lawyerRef = ref(db, `lawyers/${id}`);
          await remove(lawyerRef);
        }
        
        setSuccess("Lawyer deleted successfully.");
        
        // Track success
        trackEvent("delete_lawyer_success", { lawyer_id: id });
        
        // Navigate back after a short delay
        setTimeout(() => navigate("/"), 1500);
      } catch (error) {
        console.error("Error deleting lawyer:", error);
        setError("Failed to delete lawyer. Please try again.");
        setIsLoading(false);
        
        // Track error
        trackEvent("delete_lawyer_error", { 
          error: error.message
        });
      }
    }
  };

  if (isLoading) return <Loading message="Loading lawyer data..." />;
  if (!lawyer) return <div className="error-message">{error || "Lawyer not found"}</div>;

  return (
    <div className="lawyer-container">
      <h2 className="lawyer-title">Lawyer Details</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="lawyer-content">
        <div className="lawyer-left">
          <div className="profile-image-container">
            <img 
              src={image ? URL.createObjectURL(image) : lawyer.profileImage || "https://via.placeholder.com/150?text=Profile"} 
              alt={lawyer.name} 
              className="profile-image" 
            />
          </div>
          <button 
            className="photo-button" 
            onClick={() => document.getElementById("fileUpload").click()}
          >
            Add Photo
          </button>
          <input 
            type="file" 
            accept="image/*" 
            id="fileUpload" 
            style={{ display: "none" }} 
            onChange={handleProfileImageChange} 
          />
        </div>
        
        <div className="lawyer-right">
          <div className="info-box">
            {isEditing ? (
              <div className="edit-form">
                <div className="form-row">
                  <label>Name:</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={lawyer.name || ""} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="form-row">
                  <label>Email:</label>
                  <input 
                    type="email" 
                    name="email" 
                    value={lawyer.email || ""} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="form-row">
                  <label>Phone:</label>
                  <input 
                    type="text" 
                    name="phone" 
                    value={lawyer.phone || ""} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="form-row">
                  <label>Specialization:</label>
                  <input 
                    type="text" 
                    name="specialization" 
                    value={lawyer.specialization || ""} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="form-row">
                  <label>License Number:</label>
                  <input 
                    type="text" 
                    name="licenseNumber" 
                    value={lawyer.licenseNumber || ""} 
                    onChange={handleChange} 
                  />
                </div>
                <div className="form-row">
                  <label>Experience:</label>
                  <input 
                    type="text" 
                    name="experience" 
                    value={lawyer.experience || ""} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            ) : (
              <>
                <p><strong>Name:</strong> {lawyer.name}</p>
                <p><strong>Email:</strong> {lawyer.email}</p>
                <p><strong>Phone:</strong> {lawyer.phone}</p>
                <p><strong>Specialization:</strong> {lawyer.specialization}</p>
                <p><strong>License Number:</strong> {lawyer.licenseNumber}</p>
                <p><strong>Experience:</strong> {lawyer.experience} years</p>
              </>
            )}
          </div>
          
          {!isEditing && (
            <>
              <div className="services-section">
                <h3 className="services-title">Services Offered</h3>
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
            </>
          )}
          
          <div className="action-buttons">
            {isEditing ? (
              <>
                <button className="action-btn save" onClick={handleSave}>Save</button>
                <button className="action-btn cancel" onClick={handleCancel}>Cancel</button>
              </>
            ) : (
              <>
                <button className="action-btn update" onClick={handleEditToggle}>Update</button>
                <button 
                  className="action-btn delete" 
                  onClick={handleDeleteLawyer}
                >
                  Delete
                </button>
                <button className="action-btn back" onClick={() => navigate("/")}>Back</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LawyerDetails;