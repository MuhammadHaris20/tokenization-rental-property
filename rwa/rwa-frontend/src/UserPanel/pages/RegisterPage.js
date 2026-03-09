// Import React and the useState hook for managing component state
import React, { useState } from "react";

// Import Link for navigation between routes and useNavigate for programmatic navigation
import { Link, useNavigate } from "react-router-dom";

// Import external CSS styling
import "../../App.css";
// Define the RegisterPage functional component
function RegisterPage() {

  // Create state to store all form input values
  const [formData, setFormData] = useState({
    fullName: "",          // Stores user's full name
    email: "",             // Stores user's email
    cnic: "",              // Stores user's CNIC
    password: "",          // Stores user's password
    confirmPassword: "",   // Stores confirmation password
    userType: "investor"   // Default selected user type
  });
  
  // State to store validation error messages
  const [errors, setErrors] = useState({});

  // Hook used to navigate to different routes programmatically
  const navigate = useNavigate();

  // Function to handle input field changes
  const handleChange = (e) => {
    setFormData({
      ...formData,                  // Keep existing form data
      [e.target.name]: e.target.value, // Update the changed field dynamically
    });
  };

  // Function to validate form inputs
  const validate = () => {
    const newErrors = {}; // Temporary object to store validation errors

    // Regular expression to validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Regular expression to validate CNIC format (with or without dashes)
    const cnicRegex = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;

    // Validate full name (remove extra spaces and check if empty)
    if (!formData.fullName.trim()) 
      newErrors.fullName = "Full name is required.";
    
    // Validate email field
    if (!formData.email) 
      newErrors.email = "Email is required.";
    else if (!emailRegex.test(formData.email)) 
      newErrors.email = "Invalid email format.";
    
    // Validate CNIC field
    if (!formData.cnic) 
      newErrors.cnic = "CNIC is required.";
    else if (!cnicRegex.test(formData.cnic)) 
      newErrors.cnic = "Invalid CNIC format. Example: 12345-1234567-1";
    
    // Validate password field
    if (!formData.password) 
      newErrors.password = "Password is required.";
    else if (formData.password.length < 6) 
      newErrors.password = "Password must be at least 6 characters.";
    
    // Validate confirm password field
    if (!formData.confirmPassword) 
      newErrors.confirmPassword = "Please confirm your password.";
    else if (formData.password !== formData.confirmPassword) 
      newErrors.confirmPassword = "Passwords do not match.";

    // Update errors state
    setErrors(newErrors);

    // Return true if there are no errors
    return Object.keys(newErrors).length === 0;
  };

  // Function to handle form submission
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page refresh on submit

    // Stop submission if validation fails
    if (!validate()) return;

    // Log successful registration data to console
    console.log("Registration successful:", formData);

    // Show success alert message
    alert("Registration successful! Please check your email for verification.");

    // Navigate to login page after successful registration
    navigate("/");
  };

  // JSX returned by the component (UI layout)
  return (
    <div className="login-page"> {/* Main container */}
      <div className="login-card"> {/* Card container */}
        
        <h2>Create Account</h2> {/* Page heading */}
        <p className="subtitle">
          Register to start investing in tokenized real estate
        </p>

        {/* Form with submit handler */}
        <form onSubmit={handleSubmit}>
          
          {/* Full Name field */}
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"  // Matches state key
              placeholder="Enter your full name"
              value={formData.fullName} // Controlled input value
              onChange={handleChange}   // Calls handleChange on input change
              className={errors.fullName ? "input-error" : ""} // Add error styling if validation fails
            />
            {/* Show error message if exists */}
            {errors.fullName && <p className="error-text">{errors.fullName}</p>}
          </div>

          {/* Email field */}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "input-error" : ""}
            />
            {errors.email && <p className="error-text">{errors.email}</p>}
          </div>

          {/* CNIC field */}
          <div className="form-group">
            <label>CNIC</label>
            <input
              type="text"
              name="cnic"
              placeholder="12345-1234567-1"
              value={formData.cnic}
              onChange={handleChange}
              className={errors.cnic ? "input-error" : ""}
            />
            {errors.cnic && <p className="error-text">{errors.cnic}</p>}
          </div>

          {/* User Type dropdown */}
          <div className="form-group">
            <label>User Type</label>
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className="styled-select"
            >
              {/* Dropdown options */}
              <option value="buyer">Buyer</option>
              <option value="property-owner">Property Owner</option>
            </select>
          </div>

          {/* Password field */}
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password (min. 6 characters)"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "input-error" : ""}
            />
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          {/* Confirm Password field */}
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? "input-error" : ""}
            />
            {errors.confirmPassword && (
              <p className="error-text">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit button */}
          <button type="submit" className="primary-btn login-btn">
            Register
          </button>
        </form>

        {/* Link to login page */}
        <div className="login-options">
          <div className="register-link">
            Already have an account?{" "}
            <Link to="/" className="link-text">
              Login
            </Link>
          </div>
        </div>

        {/* Footer text */}
        <div className="footer-text">
          &copy; 2026 Real Estate Tokenization. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}

// Export component so it can be used in other files
export default RegisterPage;
