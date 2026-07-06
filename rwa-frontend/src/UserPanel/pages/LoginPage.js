// Import React and useState hook for managing state
import React, { useState } from "react";

// Import Link (for navigation links)
import { Link } from "react-router-dom";

// Import useAuth hook
import { useAuth } from "../../context/AuthContext";

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
  // State for API error
  const [apiError, setApiError] = useState("");
  // Loading state
  const [loading, setLoading] = useState(false);

  // Auth hook
  const { login } = useAuth();

  // Hardcoded admin credentials
  const ADMIN = {
    user_id: 1,
    full_name: "Admin",
    email: "admin@rwa.com",
    role: "ADMIN",
    cnic: "11111-1111111-1",
    password: "admin123"
  };

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!validate()) return;

    setLoading(true);

    try {
      // ✅ Check Admin First
      if (cnic === ADMIN.cnic && password === ADMIN.password) {
        localStorage.setItem("user_id", ADMIN.user_id);
        localStorage.setItem("user_name", ADMIN.full_name);
        localStorage.setItem("user_email", ADMIN.email);
        localStorage.setItem("user_cnic", ADMIN.cnic);
        // Store a dummy token for admin
        login("admin-dummy-token", ADMIN.role);
        // Replace history to prevent back to login page
        window.location.replace("/admin");
        return;
      }

      // ✅ Otherwise check registered users
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cnic: cnic,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        const user = data.user;

        localStorage.setItem("user_id", user.user_id);
        localStorage.setItem("user_name", user.full_name);
        localStorage.setItem("user_email", user.email);
        localStorage.setItem("user_cnic", user.cnic);
        localStorage.setItem("wallet_address", user.wallet_address || "");

        // Store the JWT token (or a dummy one)
        const token = data.token || "user-token-" + Date.now();
        login(token, user.role);

        // ✅ Redirect based on role using replace to avoid back-button to login
        if (user.role === "ADMIN") {
          window.location.replace("/admin");
        } else if (user.role === "TENANT") {
          window.location.replace("/dashboard");
        } else {
          window.location.replace("/home");
        }
      } else {
        setApiError(data.message || "Login failed. Please try again.");
        setLoading(false);
      }

    } catch (error) {
      console.error("Login error:", error);
      setApiError("Server error. Please try again.");
      setLoading(false);
    }
    // No need to set loading false on success because page will reload
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Login</h2>
        <p className="subtitle">
          Enter your CNIC and password
        </p>

        {apiError && (
          <div className="error-text" style={{ textAlign: "center", marginBottom: "15px", color: "#dc3545" }}>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>CNIC</label>
            <input
              type="text"
              placeholder="12345-1234567-1"
              value={cnic}
              onChange={(e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value.length > 13) value = value.slice(0, 13);
                if (value.length > 5 && value.length <= 12) {
                  value = value.slice(0, 5) + "-" + value.slice(5);
                } else if (value.length > 12) {
                  value = value.slice(0, 5) + "-" + value.slice(5, 12) + "-" + value.slice(12);
                }
                setCnic(value);
              }}
              className={errors.cnic ? "input-error" : ""}
            />
            {errors.cnic && <p className="error-text">{errors.cnic}</p>}
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
            {errors.password && <p className="error-text">{errors.password}</p>}
          </div>

          <button type="submit" className="primary-btn login-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
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