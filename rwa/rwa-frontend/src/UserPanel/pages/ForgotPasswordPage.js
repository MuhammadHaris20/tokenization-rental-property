// Import React and useState hook for managing state
import React, { useState } from "react";

// Import Link and useNavigate from react-router-dom
import { Link, useNavigate } from "react-router-dom";

// Import global CSS styles
import "../../App.css";
// Define ForgotPasswordPage functional component
function ForgotPasswordPage() {

  // State to store email input value
  const [email, setEmail] = useState("");

  // State to store error message
  const [error, setError] = useState("");

  // Initialize navigate function
  const navigate = useNavigate();

  // Function that runs when form is submitted
  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");

  if (!email) {
    setError("Email is required.");
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError("Invalid email format.");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Something went wrong");
      return;
    }

    window.alert("Password reset link sent to your email ✅");
  } catch (err) {
    console.error(err);
    setError("Server error. Please try again.");
  }
};

  return (
    <div className="login-page">
      <div className="login-card">

        <h2>Forgot Password</h2>

        <p className="subtitle">
          Enter your email to reset password
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={error ? "input-error" : ""}
            />

            {error && <p className="error-text">{error}</p>}

          </div>

          <button 
            type="submit" 
            className="primary-btn login-btn"
          >
            Send Reset Link
          </button>
        </form>

        <div className="login-options">
          <Link to="/" className="link-text">
            Back to Login
          </Link>
        </div>

        <div className="footer-text">
          &copy; 2026 Real Estate Tokenization. All Rights Reserved.
        </div>

      </div>
    </div>
  );
}

// Export component
export default ForgotPasswordPage;