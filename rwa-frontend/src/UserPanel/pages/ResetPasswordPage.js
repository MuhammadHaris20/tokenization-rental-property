import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "../../App.css";

function ResetPasswordPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const navigate = useNavigate();

  // 🔹 States
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState(false);

  // ✅ 1️⃣ Validate token when page loads
  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/auth/validate-reset-token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, token }),
          }
        );

        if (response.ok) {
          setValidToken(true);
        } else {
          setValidToken(false);
        }
      } catch (err) {
        setValidToken(false);
      }

      setLoading(false);
    };

    if (email && token) {
      validateToken();
    } else {
      setLoading(false);
    }
  }, [email, token]);

  // ✅ 2️⃣ Show loading screen
  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  // ✅ 3️⃣ Block invalid or expired links
  if (!validToken) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>Invalid or Expired Link ❌</h2>
          <p className="subtitle">
            This reset link is invalid or has expired.
          </p>
          <button
            className="primary-btn login-btn"
            onClick={() => navigate("/forgot-password")}
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  // ✅ 4️⃣ Submit new password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            token,
            newPassword: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong");
        return;
      }

      window.alert("Password reset successful ✅");
      navigate("/");
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

  // ✅ 5️⃣ Main Reset Form
  return (
    <div className="login-page">
      <div className="login-card">

        <h2>Reset Password</h2>

        <p className="subtitle">
          Enter your new password
        </p>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={error ? "input-error" : ""}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={error ? "input-error" : ""}
            />
            {error && <p className="error-text">{error}</p>}
          </div>

          <button type="submit" className="primary-btn login-btn">
            RESET PASSWORD
          </button>

        </form>

        <div className="login-options">
          <span
            className="link-text"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            Back to Login
          </span>
        </div>

        <div className="footer-text">
          © 2026 Real Estate Tokenization. All Rights Reserved.
        </div>

      </div>
    </div>
  );
}

export default ResetPasswordPage;