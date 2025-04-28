import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/index.css';

/**
 * Secretary component for displaying secretary information
 * @param {Object} props Component properties
 * @param {Object} props.secretary Secretary data object
 * @param {Function} props.onSelect Function to call when secretary is selected
 * @param {boolean} props.isSelected Whether this secretary is selected
 * @param {boolean} props.showActions Whether to show action buttons
 * @returns {JSX.Element} Secretary component
 */
const Secretary = ({ 
  secretary, 
  onSelect, 
  isSelected = false,
  showActions = true
}) => {
  const navigate = useNavigate();

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/secretary/edit/${secretary.id}`);
  };
  
  const handleClick = () => {
    if (onSelect) {
      onSelect(secretary);
    }
  };
  
  if (!secretary) {
    return null;
  }

  return (
    <div 
      className={`secretary-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="secretary-avatar">
        {secretary.name ? secretary.name.charAt(0).toUpperCase() : "S"}
      </div>
      
      <div className="secretary-content">
        <div className="secretary-header">
          <h3 className="secretary-name">{secretary.name}</h3>
          {secretary.role && <span className="secretary-role">{secretary.role}</span>}
        </div>
        
        <div className="secretary-details">
          <div className="secretary-info-item">
            <span className="info-icon">✉️</span>
            <span className="info-text">{secretary.email}</span>
          </div>
          
          {secretary.phone && (
            <div className="secretary-info-item">
              <span className="info-icon">📞</span>
              <span className="info-text">{secretary.phone}</span>
            </div>
          )}
        </div>
        
        {showActions && (
          <div className="secretary-actions">
            <button 
              className="action-btn edit"
              onClick={handleEdit}
              title="Edit Secretary"
            >
              ✏️
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Secretary;