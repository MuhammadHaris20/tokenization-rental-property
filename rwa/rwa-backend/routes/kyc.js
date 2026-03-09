// routes/kyc.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const db = require("../config/db");

// --------------------
// Multer File Upload
// --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/kyc"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
});

const uploadFields = upload.fields([
  { name: "cnicFront", maxCount: 1 },
  { name: "cnicBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
]);

// --------------------
// Submit KYC
// --------------------
router.post("/submit/:userId", async (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ message: err.message });
    }

    try {
      const userId = req.params.userId;
      const {
        fullName,
        cnic,
        dob,
        permanentAddress,
        city,
        province,
        postalCode,
        mobileNumber,
        occupation,
      } = req.body;

      // -------------------------
      // Required Fields
      // -------------------------
      if (!fullName || !cnic || !dob || !permanentAddress || !city || !province || !postalCode || !mobileNumber || !occupation) {
        return res.status(400).json({ message: "All form fields are required." });
      }

      // -------------------------
      // CNIC Validation
      // -------------------------
      const cleanCnic = cnic.replace(/\D/g, ""); // remove dashes
      if (!/^\d{13}$/.test(cleanCnic)) {
        return res.status(400).json({ message: "CNIC must be exactly 13 digits" });
      }

      // -------------------------
      // Mobile Validation
      // -------------------------
      let cleanMobile = mobileNumber.replace(/\D/g, "");
      if (cleanMobile.startsWith("92")) cleanMobile = cleanMobile.slice(2);
      if (!/^\d{10}$/.test(cleanMobile)) {
        return res.status(400).json({ message: "Mobile number must be 10 digits" });
      }

      // -------------------------
      // Date of Birth Validation (18+)
      // -------------------------
      const dobDate = new Date(dob);
      const today = new Date();
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

      if (dobDate > today) {
        return res.status(400).json({ message: "Date of birth cannot be in the future" });
      }
      if (dobDate > eighteenYearsAgo) {
        return res.status(400).json({ message: "You must be at least 18 years old" });
      }

      // -------------------------
      // File Upload Validation
      // -------------------------
      if (!req.files || !req.files.cnicFront || !req.files.cnicBack || !req.files.selfie || !req.files.addressProof) {
        return res.status(400).json({ message: "All documents are required." });
      }

      // -------------------------
      // CNIC Hash
      // -------------------------
      const cnicHash = crypto.createHash("sha256").update(cleanCnic).digest("hex");

      // -------------------------
      // Check Existing KYC
      // -------------------------
      const [existing] = await db.query("SELECT * FROM kyc_requests WHERE user_id = ?", [userId]);
      if (existing.length > 0) return res.status(400).json({ message: "KYC already submitted" });

      // -------------------------
      // Insert into DB
      // -------------------------
      const sql = `
        INSERT INTO kyc_requests
        (user_id, full_name, cnic_number, cnic_hash, dob,
         cnic_front_url, cnic_back_url,
         selfie_url, address_proof_url,
         permanent_address, city, province,
         postal_code, mobile_number, occupation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.query(sql, [
        userId,
        fullName,
        cleanCnic,
        cnicHash,
        dob,
        req.files.cnicFront[0].path,
        req.files.cnicBack[0].path,
        req.files.selfie[0].path,
        req.files.addressProof[0].path,
        permanentAddress,
        city,
        province,
        postalCode,
        cleanMobile,
        occupation,
      ]);

      return res.json({ message: "KYC submitted successfully" });
    } catch (error) {
      console.error("Unexpected error:", error);
      return res.status(500).json({ message: "Server crashed" });
    }
  });
});

// --------------------
// Get KYC Status
// --------------------
router.get("/status/:userId", async (req, res) => {
  try {
    const [result] = await db.query("SELECT status FROM kyc_requests WHERE user_id = ?", [req.params.userId]);
    if (result.length === 0) return res.json({ status: "Not Submitted" });
    res.json({ status: result[0].status });
  } catch (err) {
    console.error("Status query error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;