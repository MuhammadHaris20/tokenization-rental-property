const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");
const nodemailer = require("nodemailer");
require("dotenv").config();

// --------------------
// Nodemailer transporter
// --------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

// --------------------
// Register
// --------------------
router.post("/register", async (req, res) => {
  const { full_name, email, cnic, password, role } = req.body;
  
  if (!full_name || !email || !cnic || !password || !role) {
    return res.status(400).json({ message: "All fields required" });
  }

  // 🔥 Strong password validation
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
  }
  
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ message: "Password must contain at least one number" });
  }

  // Format CNIC with dashes for storage (XXXXX-XXXXXXX-X)
  let formattedCnic = cnic.replace(/\D/g, "");
  if (formattedCnic.length === 13) {
    formattedCnic = formattedCnic.replace(/(\d{5})(\d{7})(\d{1})/, "$1-$2-$3");
  }

  try {
    const [existing] = await pool.query(
      "SELECT * FROM users WHERE email=? OR cnic=?",
      [email, formattedCnic]
    );
    if (existing.length > 0)
      return res.status(400).json({ message: "User already exists" });

    const wallet = "0x" + crypto.randomBytes(20).toString("hex");
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users 
       (full_name, email, cnic, password_hash, role, wallet_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [full_name, email, formattedCnic, hash, role, wallet]
    );

    res.json({ message: "Registration successful ✅" });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});


// --------------------
// Login
// --------------------
router.post("/login", async (req, res) => {
  const { cnic, password } = req.body;
  console.log("Login attempt with CNIC:", cnic);
  
  if (!cnic || !password)
    return res.status(400).json({ message: "CNIC and password required" });

  try {
    // Clean CNIC (remove dashes) for database lookup
    const cleanCnic = cnic.replace(/\D/g, "");
    console.log("Searching for CNIC:", cleanCnic);
    
    // Search by removing dashes from stored CNIC
    const [users] = await pool.query(
      "SELECT * FROM users WHERE REPLACE(cnic, '-', '') = ?",
      [cleanCnic]
    );
    
    if (users.length === 0) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    console.log("User found:", { user_id: user.user_id, role: user.role });
    
    const valid = await bcrypt.compare(password, user.password_hash);
    console.log("Password valid:", valid);
    
    if (!valid) return res.status(400).json({ message: "Invalid password ❌" });

    // Remove sensitive data
    const { password_hash, ...safeUser } = user;
    
    res.json({ 
      message: "Login successful ✅", 
      user: safeUser
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// --------------------
// Admin Login (Optional)
// --------------------
router.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;
  if (email === "admin@gmail.com" && password === "admin123") {
    return res.json({ message: "Admin login successful ✅", role: "admin" });
  }
  res.status(401).json({ message: "Invalid admin credentials ❌" });
});

// --------------------
// Forgot Password
// --------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required ❌" });

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found ❌" });

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(token, 10);

    await pool.query(
      "INSERT INTO password_resets (user_id, token, created_at, expires_at, used) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 HOUR), 0)",
      [user.user_id, hashedToken]
    );

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
    res.status(500).json({ message: "Server error ❌" });
  }
});

// --------------------
// Reset Password
// --------------------
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;
  
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "All fields are required ❌" });
  }

  //  Strong password validation
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }
  
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
  }
  
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ message: "Password must contain at least one number" });
  }
  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found ❌" });

    const user = users[0];
    const [resets] = await pool.query(
      "SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [user.user_id]
    );

    if (resets.length === 0) return res.status(400).json({ message: "Invalid or expired token ❌" });

    const resetEntry = resets[0];
    const isValid = await bcrypt.compare(token, resetEntry.token);
    if (!isValid) return res.status(400).json({ message: "Invalid token ❌" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ? WHERE user_id = ?", [hashedPassword, user.user_id]);
    await pool.query("UPDATE password_resets SET used = 1 WHERE reset_id = ?", [resetEntry.reset_id]);

    res.json({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// --------------------
// Validate Reset Token
// --------------------
router.post("/validate-reset-token", async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) return res.status(400).json({ message: "Invalid request ❌" });

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) return res.status(404).json({ message: "User not found ❌" });

    const user = users[0];
    const [resets] = await pool.query(
      "SELECT * FROM password_resets WHERE user_id = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [user.user_id]
    );

    if (resets.length === 0) return res.status(400).json({ message: "Invalid or expired token ❌" });

    const resetEntry = resets[0];
    const isValid = await bcrypt.compare(token, resetEntry.token);
    if (!isValid) return res.status(400).json({ message: "Invalid token ❌" });

    res.json({ message: "Token valid ✅" });
  } catch (err) {
    console.error("Validate Token Error:", err);
    res.status(500).json({ message: "Server error ❌" });
  }
});

// --------------------
// Update Password (User Settings)
// --------------------
router.post("/update-password", async (req, res) => {
  const { user_id, currentPassword, newPassword } = req.body;

  if (!user_id || !currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required" 
    });
  }

  //  Strong password validation
  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 6 characters" 
    });
  }

  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must contain at least one uppercase letter" 
    });
  }

  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must contain at least one number" 
    });
  }

  try {
    const [users] = await pool.query(
      "SELECT password_hash FROM users WHERE user_id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const user = users[0];
    
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        message: "Current password is incorrect" 
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE user_id = ?",
      [hashedPassword, user_id]
    );

    res.json({ 
      success: true, 
      message: "Password updated successfully" 
    });

  } catch (err) {
    console.error("Update Password Error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
});

module.exports = router;