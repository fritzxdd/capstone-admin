import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { logEvent } from 'firebase/analytics';
import { analytics } from '../../services/firebase';

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
            <span className="nav-icon dashboard-icon"></span>
            Dashboard
          </button>
          
          <button 
            className={`nav-link ${isActive('/lawyers/add') ? 'active' : ''}`}
            onClick={() => handleNavigate("/lawyers/add", "Manage Lawyer")}
          >
            <span className="nav-icon lawyer-icon"></span>
            Manage Lawyers
          </button>
          
          <button 
            className={`nav-link ${isActive('/secretary/manage') ? 'active' : ''}`}
            onClick={() => handleNavigate("/secretary/manage", "Manage Secretary")}
          >
            <span className="nav-icon secretary-icon"></span>
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
                  <span className="dropdown-icon settings-icon"></span>
                  Profile Settings
                </button>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/plans", "Plan & Subscription")}
                >
                  <span className="dropdown-icon subscription-icon"></span>
                  Plans & Subscription
                </button>
                
                <button 
                  className="dropdown-item" 
                  onClick={() => handleNavigate("/privacy", "Privacy Policy")}
                >
                  <span className="dropdown-icon privacy-icon"></span>
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
                  <span className="dropdown-icon logout-icon"></span>
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