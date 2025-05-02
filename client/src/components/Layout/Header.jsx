import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../services/firebase';
import logo from '../../assets/logo.png';

const Header = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleNavigate = (path, destination) => {
    navigate(path);
    if (analytics) logEvent(analytics, "navigate", { destination });
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-logo-section">
          <img src={logo} alt="WeAssist Logo" className="header-logo" />
          <h1 className="header-title">WeAssist</h1>
          
          {/* Mobile menu button */}
          <button 
            className="mobile-menu-button" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
        </div>

        <nav className={`header-nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <button 
            className={`nav-link ${isActive('/') ? 'active' : ''}`}
            onClick={() => handleNavigate("/", "Dashboard")}
          >
            Dashboard
          </button>
          
          <button 
            className={`nav-link ${isActive('/lawyers/add') ? 'active' : ''}`}
            onClick={() => handleNavigate("/lawyers/add", "Manage Lawyer")}
          >
            Manage Lawyers
          </button>
          
          <button 
            className={`nav-link ${isActive('/secretary/manage') ? 'active' : ''}`}
            onClick={() => handleNavigate("/secretary/manage", "Manage Secretary")}
          >
            Manage Secretary
          </button>

          {/* Profile Dropdown */}
          <div className="dropdown">
            <button 
              className={`nav-link dropdown-toggle ${isActive('/profile') ? 'active' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="user-avatar">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="user-name">{user?.email?.split('@')[0] || "User"}</span>
              <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}></span>
            </button>
            
            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="dropdown-user-info">
                    <div className="dropdown-avatar">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="dropdown-user-details">
                      <p className="dropdown-user-name">{user?.email?.split('@')[0] || "User"}</p>
                      <p className="dropdown-user-email">{user?.email || "user@example.com"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/profile", "Profile")}
                >
                  Profile Settings
                </button>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/plans", "Plan & Subscription")}
                >
                  Plans & Subscription
                </button>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/privacy", "Privacy Policy")}
                >
                  Privacy Policy
                </button>
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="dropdown-item logout" 
                  onClick={() => {
                    onLogout();
                    if (analytics) logEvent(analytics, "logout", { admin_id: user?.uid });
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;