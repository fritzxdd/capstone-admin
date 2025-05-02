import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SecretaryItem component for displaying a secretary in a list
 * @param {Object} props Component properties
 * @param {Object} props.secretary Secretary data object
 * @param {boolean} props.isSelected Whether this secretary is selected
 * @param {Function} props.onClick Function to call when secretary is clicked
 * @returns {JSX.Element} SecretaryItem component
 */
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

export default SecretaryItem;