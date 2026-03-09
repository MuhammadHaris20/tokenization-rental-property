// Import React and useState hook for managing state
import React, { useState } from "react";

// Import Link (for navigation links) and useNavigate (for programmatic navigation)
import { Link, useNavigate } from "react-router-dom";

// Import global CSS styles
import "../../App.css";
// Define LoginPage functional component
function LoginPage() {

  // State to store CNIC input value
  const [cnic, setCnic] = useState("");

  // State to store password input value
  const [password, setPassword] = useState("");

  // State to store validation error messages
  const [errors, setErrors] = useState({});

  // Hook to navigate programmatically
  const navigate = useNavigate();

  // Validation function
  const validate = () => {

    const newErrors = {};

    const cnicRegex = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;

    if (!cnic)
      newErrors.cnic = "CNIC is required.";
    else if (!cnicRegex.test(cnic))
      newErrors.cnic = "Invalid CNIC format. Example: 12345-1234567-1";

    if (!password)
      newErrors.password = "Password is required.";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // Handle login submit
  const handleSubmit = (e) => {

    e.preventDefault();

    if (!validate()) return;

    console.log("Login successful:", { cnic, password });

    // =============================
    // SIMPLE ROLE CHECK (TEMPORARY)
    // =============================

    // Example:
    // If Admin CNIC = 11111-1111111-1
    // You can change this later to backend logic

    if (cnic === "11111-1111111-1" && password === "admin123") {

      // Optional: store role
      localStorage.setItem("role", "admin");

      navigate("/admin");

    } else {

      // Property Owner (default behavior - unchanged)
      localStorage.setItem("role", "owner");

      navigate("/home");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <h2>Login</h2>

        <p className="subtitle">
          Enter your CNIC and password
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>CNIC</label>

            <input
              type="text"
              placeholder="12345-1234567-1"
              value={cnic}
              onChange={(e) => {
              let value = e.target.value.replace(/\D/g, ""); // remove non-digits

              if (value.length > 13) value = value.slice(0, 13);

              if (value.length > 5 && value.length <= 12) {
              value = value.slice(0, 5) + "-" + value.slice(5);
              } 
              else if (value.length > 12) {
              value = value.slice(0, 5) + "-" + value.slice(5, 12) + "-" + value.slice(12);
              }

              setCnic(value);
            }}
              className={errors.cnic ? "input-error" : ""}
            />

            {errors.cnic && (
              <p className="error-text">{errors.cnic}</p>
            )}
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? "input-error" : ""}
            />

            {errors.password && (
              <p className="error-text">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            className="primary-btn login-btn"
          >
            Login
          </button>
        </form>

        <div className="login-options">

          <Link to="/forgot-password" className="link-text">
            Forgot Password?
          </Link>

          <div className="register-link">
            Don't have an account?{" "}
            <Link to="/register" className="link-text">
              Register
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

export default LoginPage;