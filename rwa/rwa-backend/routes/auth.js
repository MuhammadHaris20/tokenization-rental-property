const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

// 🔹 Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    // Fetch user by email
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    const user = users[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(token, 10);

    // Insert into password_resets using user_id
    await pool.query(
      "INSERT INTO password_resets (user_id, token, created_at, expires_at, used) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 0)",
      [user.user_id, hashedToken]
    );

    // Send reset email (using email)
    const resetLink = `http://localhost:3000/reset-password/${token}?email=${email}`;
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Password Reset Request",
      html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
    });

    res.json({ message: "Password reset email sent ✅" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
});

// 🔹 Reset Password Route
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword)
    return res.status(400).json({ message: "All fields are required" });

  try {
    // Fetch user by email
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found" });

    const user = users[0];

    // Fetch latest valid reset token for user
    const [resets] = await pool.query(
      "SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [user.user_id]
    );

    if (resets.length === 0) return res.status(400).json({ message: "Invalid or expired token ❌" });

    const resetEntry = resets[0];

    // Verify token
    const isValid = await bcrypt.compare(token, resetEntry.token);
    if (!isValid) return res.status(400).json({ message: "Invalid token ❌" });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await pool.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hashedPassword, user.user_id]);

    // Mark token as used
    await pool.query("UPDATE password_resets SET used = 1 WHERE reset_id = ?", [resetEntry.reset_id]);

    res.json({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: err.message || "Server error ❌" });
  }
});

// 🔹 Validate Reset Token
router.post("/validate-reset-token", async (req, res) => {
  const { email, token } = req.body;

  if (!email || !token)
    return res.status(400).json({ message: "Invalid request" });

  try {
    const [users] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (users.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = users[0];

    const [resets] = await pool.query(
      "SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [user.user_id]
    );

    if (resets.length === 0)
      return res.status(400).json({ message: "Invalid or expired token" });

    const resetEntry = resets[0];

    const isValid = await bcrypt.compare(token, resetEntry.token);

    if (!isValid)
      return res.status(400).json({ message: "Invalid token" });

    res.json({ message: "Token valid" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;