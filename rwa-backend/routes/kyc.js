// routes/kyc.js - UPDATED VERSION

const express = require("express");
const router = express.Router();
const multer = require("multer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../config/db");

// --------------------
// Blockchain Setup
// --------------------
const { ethers } = require("ethers");
const RealEstateRWA = require('../../rwa-frontend/src/abis/RealEstateRWA.json');
const AdminControllerABI = require('../../rwa-frontend/src/abis/AdminController.json');

const CONTRACT_ADDRESSES = {
  RealEstateRWA: process.env.RealEstateRWA,
  AdminController: process.env.AdminController,
};

if (!CONTRACT_ADDRESSES.RealEstateRWA || !CONTRACT_ADDRESSES.AdminController) {
  throw new Error("Missing RealEstateRWA or AdminController in .env file");
}

function getAdminController() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const privateKey = process.env.PRIVATE_KEY.startsWith("0x") 
    ? process.env.PRIVATE_KEY 
    : `0x${process.env.PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONTRACT_ADDRESSES.AdminController, AdminControllerABI.abi, wallet);
}

function getContract() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const privateKey = process.env.PRIVATE_KEY.startsWith("0x") 
    ? process.env.PRIVATE_KEY 
    : `0x${process.env.PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONTRACT_ADDRESSES.RealEstateRWA, RealEstateRWA.abi, wallet);
}

// --------------------
// Ensure upload folder exists (with absolute path)
// --------------------
const uploadDir = path.join(__dirname, "..", "uploads", "kyc");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created KYC upload directory: ${uploadDir}`);
}

// --------------------
// Multer File Upload (sanitize filenames)
// --------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Remove spaces and special characters, keep extension
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueName = `${Date.now()}-${basename}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const uploadFields = upload.fields([
  { name: "cnicFront", maxCount: 1 },
  { name: "cnicBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
]);

// --------------------
// Helper: Extract filename from full path
// --------------------
function extractFilename(filePath) {
  if (!filePath) return null;
  // If it's a full path, extract just the filename
  if (filePath.includes('/') || filePath.includes('\\')) {
    return filePath.split(/[\\/]/).pop();
  }
  return filePath;
}

// --------------------
// Get ALL KYC (Admin) - WITH USER ROLE FROM USERS TABLE
// --------------------
router.get("/", async (req, res) => {
  try {
    const [kyc] = await db.query(`
      SELECT 
        k.kyc_id,
        k.user_id,
        k.full_name,
        k.cnic_number,
        k.cnic_hash,
        k.dob,
        k.cnic_front_url,
        k.cnic_back_url,
        k.selfie_url,
        k.address_proof_url,
        k.permanent_address,
        k.city,
        k.province,
        k.postal_code,
        k.mobile_number,
        k.occupation,
        k.status,
        k.submitted_at,
        k.reviewed_at,
        k.reviewed_by,
        k.tx_hash,
        k.reason,
        k.wallet_address as kyc_wallet,
        u.email,
        u.wallet_address as user_wallet,
        u.role as user_role,
        u.profile_pic
      FROM kyc_requests k
      LEFT JOIN users u ON u.user_id = k.user_id
      ORDER BY k.submitted_at DESC
    `);

    const formattedData = kyc.map(item => ({
      ...item,
      wallet_address: item.user_wallet || item.kyc_wallet,
      role: item.user_role || "INVESTOR",
      mobile: item.mobile_number,
      joinDate: item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : "",
      time: item.submitted_at ? new Date(item.submitted_at).toLocaleTimeString() : "",
    }));

    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error("KYC fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Submit KYC
// --------------------
router.post("/submit/:userId", async (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ message: err.message });
    }

    // Log received files for debugging
    console.log("📸 KYC upload - received files:", {
      cnicFront: req.files?.cnicFront?.[0]?.filename,
      cnicBack: req.files?.cnicBack?.[0]?.filename,
      selfie: req.files?.selfie?.[0]?.filename,
      addressProof: req.files?.addressProof?.[0]?.filename,
    });

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

      const wallet_address = req.body.wallet_address || null;
      const tx_hash = req.body.tx_hash || null;

      if (!fullName || !cnic || !dob || !permanentAddress || !city || !province || !postalCode || !mobileNumber || !occupation) {
        return res.status(400).json({ message: "All form fields are required." });
      }

      const cleanCnic = cnic.replace(/\D/g, "");
      if (!/^\d{13}$/.test(cleanCnic)) {
        return res.status(400).json({ message: "CNIC must be exactly 13 digits" });
      }

      let cleanMobile = mobileNumber.replace(/\D/g, "");
      if (cleanMobile.startsWith("92")) cleanMobile = cleanMobile.slice(2);
      if (!/^\d{10}$/.test(cleanMobile)) {
        return res.status(400).json({ message: "Mobile number must be 10 digits" });
      }

      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime())) return res.status(400).json({ message: "Invalid date of birth" });

      const today = new Date();
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(today.getFullYear() - 18);

      if (dobDate > today) return res.status(400).json({ message: "Date of birth cannot be in the future" });
      if (dobDate > eighteenYearsAgo) return res.status(400).json({ message: "You must be at least 18 years old" });

      if (!req.files || !req.files.cnicFront || !req.files.cnicBack || !req.files.selfie || !req.files.addressProof) {
        return res.status(400).json({ message: "All documents are required." });
      }

      const cnicHash = crypto.createHash("sha256").update(cleanCnic).digest("hex");

      const [existing] = await db.query(
        "SELECT * FROM kyc_requests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1", 
        [userId]
      );

      if (existing.length > 0) {
        const currentStatus = existing[0].status;
        if (currentStatus === "Pending" || currentStatus === "Approved") {
          return res.status(400).json({ 
            message: currentStatus === "Approved" 
              ? "Your KYC is already approved." 
              : "KYC already submitted and under review." 
          });
        }
        await db.query("DELETE FROM kyc_requests WHERE user_id = ?", [userId]);
      }

      // ✅ FIX: Store ONLY the filename, not the full path
      const cnicFrontPath = req.files.cnicFront[0].filename;
      const cnicBackPath = req.files.cnicBack[0].filename;
      const selfiePath = req.files.selfie[0].filename;
      const addressProofPath = req.files.addressProof[0].filename;

      console.log("📁 Saved filenames:", { cnicFrontPath, cnicBackPath, selfiePath, addressProofPath });

      const sql = `
        INSERT INTO kyc_requests
        (user_id, full_name, cnic_number, cnic_hash, dob,
         cnic_front_url, cnic_back_url,
         selfie_url, address_proof_url,
         permanent_address, city, province,
         postal_code, mobile_number, occupation,
         wallet_address, tx_hash, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())
      `;

      await db.query(sql, [
        userId,
        fullName,
        cleanCnic,
        cnicHash,
        dob,
        cnicFrontPath,
        cnicBackPath,
        selfiePath,
        addressProofPath,
        permanentAddress,
        city,
        province,
        postalCode,
        cleanMobile,
        occupation,
        wallet_address,
        tx_hash,
      ]);

      if (wallet_address) {
        await db.query(
          `UPDATE users SET wallet_address = ? WHERE user_id = ?`,
          [wallet_address, userId]
        );
        console.log("Updated users.wallet_address to:", wallet_address);
      }

      return res.json({ success: true, message: "KYC submitted successfully", data: null });
      
    } catch (error) {
      console.error("Unexpected error:", error);

      // Delete uploaded files on error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Failed to delete file:", file.path);
          });
        });
      }

      return res.status(500).json({ message: "Server error. Please try again later." });
    }
  });
});

// --------------------
// Get KYC Status
// --------------------
router.get("/status/:userId", async (req, res) => {
  try {
    const [result] = await db.query(
      "SELECT status FROM kyc_requests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1",
      [req.params.userId]
    );
    if (result.length === 0) {
      return res.json({ status: "Not Submitted" });
    }
    return res.json({ status: result[0].status });
  } catch (err) {
    console.error("Status query error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// --------------------
// Serve KYC Document by ID and Type (NEW)
// --------------------
router.get('/document/:kycId/:docType', async (req, res) => {
  try {
    const { kycId, docType } = req.params;
    
    console.log(`📄 Document request: KYC ID ${kycId}, Type: ${docType}`);
    
    // Fetch KYC data from database
    const [rows] = await db.query(
      `SELECT kyc_id, user_id, cnic_front_url, cnic_back_url, selfie_url, address_proof_url 
       FROM kyc_requests 
       WHERE kyc_id = ?`,
      [kycId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'KYC record not found' });
    }
    
    const user = rows[0];
    
    // Map docType to the actual field name
    const fieldMap = {
      'cnic_front': 'cnic_front_url',
      'cnic_back': 'cnic_back_url',
      'selfie': 'selfie_url',
      'address_proof': 'address_proof_url'
    };
    
    const field = fieldMap[docType];
    if (!field || !user[field]) {
      return res.status(404).json({ error: 'Document not found in database' });
    }
    
    // Extract just the filename (in case it's still a full path)
    let filename = user[field];
    if (filename.includes('/') || filename.includes('\\')) {
      filename = filename.split(/[\\/]/).pop();
    }
    
    console.log(`📁 Looking for file: ${filename}`);
    
    // Construct full file path using the uploads directory
    const fullPath = path.join(__dirname, '..', 'uploads', 'kyc', filename);
    
    console.log(`📂 Full path: ${fullPath}`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Send the file
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --------------------
// Serve KYC Document by Filename (Direct)
// --------------------
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Decode the filename
    const decodedFilename = decodeURIComponent(filename);
    
    // Construct the full path
    const fullPath = path.join(__dirname, '..', 'uploads', 'kyc', decodedFilename);
    
    console.log(`📂 Looking for file: ${fullPath}`);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Send the file
    res.sendFile(fullPath);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --------------------
// DEBUG: List all KYC files
// --------------------
router.get('/debug-files', (req, res) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'kyc');
  
  // Check if directory exists
  if (!fs.existsSync(uploadDir)) {
    return res.json({ 
      error: 'Upload directory does not exist', 
      path: uploadDir 
    });
  }
  
  // Read all files in the directory
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.json({ error: err.message });
    }
    
    // Get file details
    const fileDetails = files.map(filename => {
      const fullPath = path.join(uploadDir, filename);
      const stats = fs.statSync(fullPath);
      return {
        filename,
        size: stats.size,
        modified: stats.mtime,
        path: fullPath
      };
    });
    
    res.json({
      success: true,
      directory: uploadDir,
      files: fileDetails,
      count: files.length
    });
  });
});

// --------------------
// Update KYC Status (legacy)
// --------------------
router.post("/update", async (req, res) => {
  const { kyc_id, status, reason, admin_id, blockchain_tx_hash } = req.body;
  if (!kyc_id || !status) {
    return res.status(400).json({ success: false, message: "kyc_id and status are required" });
  }
  try {
    let query = "UPDATE kyc_requests SET status = ?, updated_at = NOW()";
    const params = [status];
    if (status.toLowerCase() === "rejected" && reason) {
      query += ", reason = ?";
      params.push(reason);
    }
    query += " WHERE kyc_id = ?";
    params.push(kyc_id);
    await db.query(query, params);
    res.json({ success: true, message: "KYC status updated ✅" });
  } catch (err) {
    console.error("KYC Update Error:", err);
    res.status(500).json({ success: false, message: "Server error ❌" });
  }
});

// --------------------
// Approve KYC (Admin)
// --------------------
router.post("/approve", async (req, res) => {
  const { kyc_id, admin_id } = req.body;
  console.log("Approve request:", { kyc_id, admin_id });
  if (!kyc_id || !admin_id) {
    return res.status(400).json({ success: false, message: "kyc_id and admin_id are required" });
  }
  try {
    const [rows] = await db.query(
      `SELECT k.user_id, k.wallet_address as kyc_wallet, u.wallet_address as user_wallet, u.role, u.email
       FROM kyc_requests k
       JOIN users u ON u.user_id = k.user_id
       WHERE k.kyc_id = ?`,
      [kyc_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "KYC record not found" });
    }
    const { user_id, user_wallet, kyc_wallet, role, email } = rows[0];
    const wallet_address = user_wallet || kyc_wallet;
    console.log("=== KYC APPROVE DEBUG ===");
    console.log("user_id:", user_id);
    console.log("wallet_address:", wallet_address);
    console.log("role:", role);
    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: "User has no wallet address. Ask user to connect wallet first."
      });
    }
    const rwaContract = getContract();
    const onChainStatus = await rwaContract.kycStatus(wallet_address);
    console.log("On-chain KYC status:", Number(onChainStatus));
    if (Number(onChainStatus) !== 1) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve — on-chain status is ${["None","Pending","Verified","Rejected"][Number(onChainStatus)]}, expected Pending`
      });
    }
    const privateKey = process.env.PRIVATE_KEY.startsWith("0x")
      ? process.env.PRIVATE_KEY
      : `0x${process.env.PRIVATE_KEY}`;
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = getAdminController();
    console.log("Calling approveKYC for wallet:", wallet_address);
    const tx = await contract.approveKYC(wallet_address);
    console.log("TX sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("TX confirmed:", receipt.hash);
    await db.query(
      `UPDATE kyc_requests
       SET status = 'Approved',
           tx_hash = ?,
           reviewed_by = NULL,
           reviewed_at = NOW()
       WHERE kyc_id = ?`,
      [receipt.hash, kyc_id]
    );
    if (role === 'TENANT') {
      await db.query(
        `UPDATE tenants SET kyc_status = 'approved', updated_at = NOW() WHERE user_id = ?`,
        [user_id]
      );
      console.log("Tenant KYC updated, user_id:", user_id);
    }
    return res.json({ success: true, tx_hash: receipt.hash });
  } catch (err) {
    console.error("=== KYC APPROVE ERROR ===");
    console.error("Message:", err.message);
    const message = err?.reason || err?.message || "Server error";
    return res.status(500).json({ success: false, message });
  }
});

// --------------------
// Reject KYC (Admin)
// --------------------
router.post("/reject", async (req, res) => {
  const { kyc_id, reason, admin_id } = req.body;
  console.log("Reject request:", { kyc_id, reason, admin_id });
  if (!kyc_id || !reason || !admin_id) {
    return res.status(400).json({ success: false, message: "kyc_id, reason and admin_id are required" });
  }
  try {
    const [rows] = await db.query(
      `SELECT k.user_id, k.wallet_address as kyc_wallet, u.wallet_address as user_wallet, u.role, u.email
       FROM kyc_requests k
       JOIN users u ON u.user_id = k.user_id
       WHERE k.kyc_id = ?`,
      [kyc_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "KYC record not found" });
    }
    const { user_id, user_wallet, kyc_wallet, role } = rows[0];
    const wallet_address = user_wallet || kyc_wallet;
    console.log("Rejecting KYC for user:", user_id, "Role:", role);
    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: "User has no wallet address. Ask user to connect wallet first."
      });
    }
    const contract = getAdminController();
    const tx = await contract.rejectKYC(wallet_address);
    const receipt = await tx.wait();
    await db.query(
      `UPDATE kyc_requests
       SET status = 'Rejected',
           reason = ?,
           reviewed_by = NULL,
           reviewed_at = NOW()
       WHERE kyc_id = ?`,
      [reason, kyc_id]
    );
    if (role === 'TENANT') {
      await db.query(
        `UPDATE tenants SET kyc_status = 'rejected', updated_at = NOW() WHERE user_id = ?`,
        [user_id]
      );
      console.log("Tenant KYC status updated to rejected for user_id:", user_id);
    }
    return res.json({ success: true, tx_hash: receipt.hash });
  } catch (err) {
    console.error("KYC Reject Error:", err);
    const message = err?.reason || err?.message || "Server error";
    return res.status(500).json({ success: false, message });
  }
});

module.exports = router;