import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../services/firebase';

/**
 * Simple SecretarySelector component for selecting a secretary from available options
 * @param {Object} props Component properties
 * @param {string} props.adminId Admin ID to filter secretaries by
 * @param {string} props.selectedSecretaryId Currently selected secretary ID
 * @param {function} props.onChange Function called when selection changes (receives secretary ID)
 * @param {boolean} props.disabled Whether the selector is disabled
 * @returns {JSX.Element} SecretarySelector component
 */
const SecretarySelector = ({ 
  adminId, 
  selectedSecretaryId, 
  onChange,
  disabled = false
}) => {
  const [secretaries, setSecretaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch secretaries belonging to this admin
  useEffect(() => {
    const fetchSecretaries = async () => {
      if (!adminId) {
        setSecretaries([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const secretariesRef = ref(db, 'secretaries');
        const snapshot = await get(secretariesRef);
        
        if (snapshot.exists()) {
          const secretaryList = [];
          
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            
            // Check if secretary belongs to this admin
            if (data.adminUID === adminId) {
              secretaryList.push({
                id: childSnapshot.key,
                ...data
              });
            }
          });
          
          setSecretaries(secretaryList);
        } else {
          setSecretaries([]);
        }
      } catch (err) {
        console.error('Error fetching secretaries:', err);
        setError('Failed to load secretaries');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSecretaries();
  }, [adminId]);
  
  // Find data for the selected secretary
  const selectedSecretary = secretaries.find(s => s.id === selectedSecretaryId);
  
  if (loading) {
    return <div>Loading secretaries...</div>;
  }
  
  if (error) {
    return <div className="error-message">{error}</div>;
  }
  
  return (
    <div className="secretary-selector">
      {secretaries.length === 0 ? (
        <div className="no-secretary">
          <p>No secretaries available. <a href="/add-secretary">Add a secretary</a> first.</p>
        </div>
      ) : (
        <>
          <select 
            value={selectedSecretaryId || ""}
            onChange={(e) => onChange(e.target.value)}
            className="form-control"
            disabled={disabled}
          >
            <option value="">-- Select a secretary --</option>
            {secretaries.map(secretary => (
              <option key={secretary.id} value={secretary.id}>
                {secretary.name} ({secretary.email})
              </option>
            ))}
          </select>
          
          {selectedSecretary && !disabled && (
            <div className="selected-secretary-info">
              <small>Currently assigned: <strong>{selectedSecretary.name}</strong> ({selectedSecretary.email})</small>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SecretarySelector;