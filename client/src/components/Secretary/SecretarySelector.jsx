import React, { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../services/firebase';
import Button from '../UI/Button';

/**
 * SecretarySelector component for selecting a secretary from available options
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
  
  // If we have the selected secretary ID but it's not in our list,
  // fetch that secretary's data directly
  useEffect(() => {
    const fetchSelectedSecretary = async () => {
      if (!selectedSecretaryId || secretaries.some(s => s.id === selectedSecretaryId)) {
        return; // Either no selection or we already have it in our list
      }
      
      try {
        const secretaryRef = ref(db, `secretaries/${selectedSecretaryId}`);
        const snapshot = await get(secretaryRef);
        
        if (snapshot.exists()) {
          const secretaryData = snapshot.val();
          
          // Add to our list if not already there
          setSecretaries(prev => {
            if (prev.some(s => s.id === selectedSecretaryId)) {
              return prev;
            }
            return [...prev, {
              id: selectedSecretaryId,
              ...secretaryData
            }];
          });
        }
      } catch (err) {
        console.error('Error fetching selected secretary:', err);
      }
    };
    
    fetchSelectedSecretary();
  }, [selectedSecretaryId, secretaries]);
  
  // Find data for the selected secretary
  const selectedSecretary = secretaries.find(s => s.id === selectedSecretaryId);
  
  if (loading) {
    return <div className="secretary-selector-loading">Loading secretaries...</div>;
  }
  
  if (error) {
    return <div className="secretary-selector-error">{error}</div>;
  }
  
  return (
    <div className="secretary-selector">
      {secretaries.length === 0 ? (
        <div className="no-secretary">
          <p>No secretaries available.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.href = '/add-secretary'}
          >
            Add Secretary
          </Button>
        </div>
      ) : (
        <>
          <select 
            value={selectedSecretaryId || ""}
            onChange={(e) => onChange(e.target.value)}
            className="secretary-select"
            disabled={disabled}
          >
            <option value="">-- Select a secretary --</option>
            {secretaries.map(secretary => (
              <option key={secretary.id} value={secretary.id}>
                {secretary.name} ({secretary.email})
              </option>
            ))}
          </select>
          
          {selectedSecretary && (
            <div className="assigned-secretary-info">
              <h4>Assigned Secretary</h4>
              <p>Name: {selectedSecretary.name}</p>
              <p>Email: {selectedSecretary.email}</p>
              {selectedSecretary.phone && <p>Phone: {selectedSecretary.phone}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SecretarySelector;