// Import React library to create the component
import React from "react";

// Import Link, useNavigate, and useLocation from react-router-dom for routing and navigation
import { Link, useNavigate, useLocation } from "react-router-dom";

// Import logo image
import logo from "../../images/logo.jpeg";

import "../../RealEstate.css";
// Define Navbar functional component
const Navbar = () => {

  // Initialize navigate function for programmatic route navigation
  const navigate = useNavigate();

  // Get current location (path) to determine active link
  const location = useLocation();

  // Function to handle logout
  const handleLogout = () => {
    localStorage.clear(); // Clear all stored data (logout)
    navigate("/"); // Redirect user to login/home page
  };

  // Function to check if a link is currently active
  const isActive = (path) => {
    return location.pathname === path; // Returns true if current path matches
  };

  // JSX for rendering navbar
  return (
    <nav className="navbar"> {/* Main navbar container */}

      {/* Logo Container */}
      <div className="logo">
        <Link to="/home" className="logo-with-text"> {/* Link to home page */}
          <img src={logo} alt="Real Estate Logo" className="logo-img" /> {/* Logo image */}
          <span className="logo-text">Real Estate</span> {/* Logo text */}
        </Link>
      </div>

      {/* Navigation Links Container */}
      <div className="nav-links-container">
        <ul className="nav-links"> {/* List of navigation links */}

          <li>
            <Link 
              to="/home" 
              className={isActive("/home") ? "active" : ""} // Add 'active' class if current page
            >
              Home
            </Link>
          </li>

          <li>
            <Link 
              to="/dashboard" 
              className={isActive("/dashboard") ? "active" : ""} // Active check
            >
              My Dashboard
            </Link>
          </li>

          <li>
            <Link 
              to="/about" 
              className={isActive("/about") ? "active" : ""} // Active check
            >
              About
            </Link>
          </li>

          <li>
            <Link 
              to="/blog" 
              className={isActive("/blog") ? "active" : ""} // Active check
            >
              Blog
            </Link>
          </li>

          <li>
            <Link 
              to="/blog#contact" 
              className={isActive("/blog#contact") ? "active" : ""} // Active check for contact section
            >
              Contact
            </Link>
          </li>

        </ul>
      </div>

      {/* Logout Button Container */}
      <div className="login-btn-container">
        <button className="login-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

    </nav>
  );
};

// Export Navbar component for use in other files
export default Navbar;
