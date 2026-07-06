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
    fullName: "",
    email: "",
    cnic: "",
    password: "",
    confirmPassword: "",
    userType: "OWNER"
  });
  
  // State to store validation error messages
  const [errors, setErrors] = useState({});
  // State for API error
  const [apiError, setApiError] = useState("");
  // State for API success
  const [apiSuccess, setApiSuccess] = useState("");
  // Loading state
  const [loading, setLoading] = useState(false);

  // Hook used to navigate to different routes programmatically
  const navigate = useNavigate();

  // Function to handle input field changes with CNIC formatting
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "cnic") {
      let formattedValue = value.replace(/\D/g, "");
      if (formattedValue.length > 13) formattedValue = formattedValue.slice(0, 13);
      if (formattedValue.length > 5 && formattedValue.length <= 12) {
        formattedValue = formattedValue.slice(0, 5) + "-" + formattedValue.slice(5);
      } else if (formattedValue.length > 12) {
        formattedValue = formattedValue.slice(0, 5) + "-" + formattedValue.slice(5, 12) + "-" + formattedValue.slice(12);
      }
      setFormData({ ...formData, [name]: formattedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Function to validate form inputs
  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cnicRegex = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;

    if (!formData.fullName.trim()) 
      newErrors.fullName = "Full name is required.";
    else if (formData.fullName.trim().length < 3)
      newErrors.fullName = "Full name must be at least 3 characters.";

    if (!formData.email) 
      newErrors.email = "Email is required.";
    else if (!emailRegex.test(formData.email)) 
      newErrors.email = "Invalid email format.";
    
    if (!formData.cnic) 
      newErrors.cnic = "CNIC is required.";
    else if (!cnicRegex.test(formData.cnic)) 
      newErrors.cnic = "Invalid CNIC format. Example: 12345-1234567-1";
    
    if (!formData.password) 
      newErrors.password = "Password is required.";
    else if (formData.password.length < 6) 
      newErrors.password = "Password must be at least 6 characters.";
    else if (!/(?=.*[A-Z])(?=.*[0-9])/.test(formData.password))
      newErrors.password = "Password must contain at least one uppercase letter and one number.";
    
    if (!formData.confirmPassword) 
      newErrors.confirmPassword = "Please confirm your password.";
    else if (formData.password !== formData.confirmPassword) 
      newErrors.confirmPassword = "Passwords do not match.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setApiSuccess("");

    if (!validate()) return;

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email,
          cnic: formData.cnic,
          password: formData.password,
          role: formData.userType
        })
      });

      const data = await response.json();

      if (response.ok) {
        setApiSuccess("Registration successful! Please login with your credentials.");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setApiError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setApiError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Create Account</h2>
        <p className="subtitle">
          Register to start investing in tokenized real estate
        </p>

        {apiError && (
          <div className="error-text" style={{ textAlign: "center", marginBottom: "15px", color: "#dc3545" }}>
            {apiError}
          </div>
        )}

        {apiSuccess && (
          <div className="success-text" style={{ textAlign: "center", marginBottom: "15px", color: "#28a745" }}>
            {apiSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={handleChange}
              className={errors.fullName ? "input-error" : ""}
            />
            {errors.fullName && <p className="error-text">{errors.fullName}</p>}
          </div>

          <div className="form-group">
            <label>Email *</label>
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

          <div className="form-group">
            <label>CNIC *</label>
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

          <div className="form-group">
            <label>User Type *</label>
            <select
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              className="styled-select"
            >
              <option value="OWNER">Property Owner</option>
              <option value="INVESTOR">Investor</option>
            </select>
          </div>

          <div className="form-group">
            <label>Password *</label>
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

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? "input-error" : ""}
            />
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" className="primary-btn login-btn" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="login-options">
          <div className="register-link">
            Already have an account?{" "}
            <Link to="/" className="link-text">
              Login
            </Link>
          </div>
        </div>

        <div className="footer-text">
          &copy; 2026 Real Estate Tokenization. All Rights Reserved.
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;