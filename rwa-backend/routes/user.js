const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const profilePicDir = "uploads/profile-pictures";
if (!fs.existsSync(profilePicDir)) {
  fs.mkdirSync(profilePicDir, { recursive: true });
}

// Multer storage for profile pictures
const profilePicStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profilePicDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const profilePicUpload = multer({
  storage: profilePicStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"));
    }
  }
}).single("profile_pic");

// ─── Get user profile by ID ───────────────────────────────────────
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || userId === "null") {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const [users] = await pool.query(
      "SELECT user_id, full_name, email, role, wallet_address, profile_pic, created_at FROM users WHERE user_id = ?",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [kyc] = await pool.query(
      "SELECT status FROM kyc_requests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1",
      [userId]
    );

    const user = users[0];
    user.kyc_status = kyc.length > 0 ? kyc[0].status : "Not Submitted";

    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── Upload Profile Picture ───────────────────────────────────────
router.post("/upload-profile-pic", (req, res) => {
  profilePicUpload(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const { user_id } = req.body;
      
      if (!user_id) {
        return res.status(400).json({ success: false, message: "User ID required" });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const profilePicPath = req.file.path;
      
      await pool.query(
        "UPDATE users SET profile_pic = ? WHERE user_id = ?",
        [profilePicPath, user_id]
      );

      res.json({
        success: true,
        message: "Profile picture uploaded successfully",
        profile_pic_url: profilePicPath
      });

    } catch (error) {
      console.error("Error saving profile picture:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });
});

// ─── Count total users ────────────────────────────────────────────
router.get("/count", async (req, res) => {
  try {
    const [result] = await pool.query("SELECT COUNT(*) as total FROM users");
    res.json({ success: true, total: result[0].total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Update user profile ──────────────────────────────────────────
router.put("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { full_name, email, wallet_address } = req.body;

    if (!userId || userId === "null") {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    await pool.query(
      "UPDATE users SET full_name = ?, email = ?, wallet_address = ? WHERE user_id = ?",
      [full_name, email, wallet_address, userId]
    );

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ─── Save wallet address ──────────────────────────────────────────
router.post("/save-wallet", async (req, res) => {
  const { wallet_address, user_id } = req.body;
  const userId = user_id;

  if (!wallet_address) {
    return res.status(400).json({ success: false, message: "wallet_address is required" });
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
    return res.status(400).json({ success: false, message: "Invalid wallet address format" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT user_id FROM users WHERE wallet_address = ? AND user_id != ?",
      [wallet_address, userId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "This wallet is already linked to another account" });
    }

    await pool.query(
      "UPDATE users SET wallet_address = ? WHERE user_id = ?",
      [wallet_address, userId]
    );

    res.json({ success: true, message: "Wallet address saved successfully" });
  } catch (err) {
    console.error("Save wallet error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ─── Update user role ─────────────────────────────────────────
router.patch("/:id/role", async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  if (!["OWNER", "INVESTOR"].includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    await pool.query("UPDATE users SET role = ? WHERE user_id = ?", [role, userId]);
    res.json({ success: true, message: "Role updated successfully" });
  } catch (err) {
    console.error("Role update error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

module.exports = router;