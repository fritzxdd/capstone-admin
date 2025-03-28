import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../services/firebase';

const Header = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path, destination) => {
    navigate(path);
    if (analytics) logEvent(analytics, "navigate", { destination });
  };

  return (
    <header className="admin-header">
      <img src={logo} alt="Logo" className="admin-logo" />
      <nav className="admin-nav">
        <button 
          className="nav-button" 
          onClick={() => handleNavigate("/", "Dashboard")}
        >
          Dashboard
        </button>
        <button 
          className="nav-button" 
          onClick={() => handleNavigate("/lawyers/add", "Manage Lawyer")}
        >
          Manage Lawyer
        </button>
        <button 
          className="nav-button" 
          onClick={() => handleNavigate("/secretary/manage", "Manage Secretary")}
        >
          Manage Secretary
        </button>

        {/* Profile Dropdown */}
        <div className="dropdown">
          <button 
            className="nav-button dropdown-toggle" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            Profile
          </button>
          {dropdownOpen && (
            <ul className="dropdown-menu">
              <li>
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/profile", "Profile")}
                >
                  Settings
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/privacy", "Privacy Policy")}
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/plans", "Plan & Subscription")}
                >
                  Plan & Subscription
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button 
                  className="dropdown-item logout" 
                  onClick={() => {
                    onLogout();
                    if (analytics) logEvent(analytics, "logout", { admin_id: user?.uid });
                  }}
                >
                  Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;