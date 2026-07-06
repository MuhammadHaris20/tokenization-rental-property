const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==================== CREATE UPLOAD FOLDER ====================
const uploadDir = "uploads/property-images";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("📁 Created upload folder:", uploadDir);
}

// ==================== MULTER CONFIGURATION ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📸 Saving ${file.fieldname} to: ${uploadDir}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "image/webp", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and PDF files are allowed"));
    }
  }
}).fields([
  { name: "titleDeed", maxCount: 1 },
  { name: "valuationCertificate", maxCount: 1 },
  { name: "taxBills", maxCount: 1 },
  { name: "exteriorImages", maxCount: 15 },
  { name: "interiorImages", maxCount: 15 },
]);

// Generate property hash
const generatePropertyHash = (title, ownerId, timestamp) => {
  return crypto.createHash("sha256")
    .update(`${title}-${ownerId}-${timestamp}`)
    .digest("hex");
};

// ==================== ROUTES ====================

router.get("/approved", async (req, res) => {
  try {
    const [result] = await pool.query(`
      SELECT DISTINCT p.*, u.full_name AS owner_name, u.email as owner_email, u.wallet_address,
             u.role as owner_role,
             (SELECT documents FROM tokenization_requests WHERE property_id = p.property_id ORDER BY request_id DESC LIMIT 1) as documents
      FROM properties p
      JOIN users u ON p.owner_id = u.user_id
      WHERE p.status IN ('Approved', 'Tokenized')
      GROUP BY p.property_id
    `);

    result.forEach(p => {
      try {
        if (p.documents && typeof p.documents === 'string' && p.documents !== 'null') {
          p.documents_parsed = JSON.parse(p.documents);
        } else {
          p.documents_parsed = { titleDeed: "", valuationCertificate: "", taxBills: "" };
        }
      } catch (e) {
        console.log("Error parsing documents:", e.message);
        p.documents_parsed = { titleDeed: "", valuationCertificate: "", taxBills: "" };
      }
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Property API is working",
    availableRoutes: ["/marketplace", "/my-properties", "/add-property"]
  });
});

// --------------------
// Get User's Properties
// --------------------
router.get("/my-properties", async (req, res) => {
  try {
    const { user_id, role } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    let query;
    let params;

    if (role === "ADMIN") {
      query = `
        SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.role as owner_role
        FROM properties p
        JOIN users u ON p.owner_id = u.user_id
        ORDER BY p.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT p.*, u.role as owner_role
        FROM properties p
        JOIN users u ON p.owner_id = u.user_id
        WHERE p.owner_id = ? 
        ORDER BY p.created_at DESC
      `;
      params = [user_id];
    }

    const [properties] = await pool.query(query, params);
    
    for (let property of properties) {
      const [requests] = await pool.query(
        "SELECT status, rejection_reason FROM tokenization_requests WHERE property_id = ?",
        [property.property_id]
      );
      property.tokenization_status = requests.length > 0 ? requests[0].status : "not_requested";
      property.rejection_reason = requests.length > 0 ? requests[0].rejection_reason : null;
    }

    res.json({ success: true, properties });

  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Get All Properties (for Marketplace)
// --------------------
router.get("/marketplace", async (req, res) => {
  try {
    const [properties] = await pool.query(`
      SELECT DISTINCT p.*, u.full_name as owner_name, u.email as owner_email, u.role as owner_role,
             tr.total_supply, tr.token_price, tr.tokenized_at,
             (SELECT documents FROM tokenization_requests WHERE property_id = p.property_id ORDER BY request_id DESC LIMIT 1) as documents,
             (SELECT COUNT(DISTINCT to_user) FROM token_transactions tt WHERE tt.property_id = p.property_id) as investor_count
      FROM properties p
      JOIN users u ON p.owner_id = u.user_id
      LEFT JOIN tokenization_records tr ON p.property_id = tr.property_id
      WHERE p.status IN ('Pending', 'Approved', 'Tokenized')
      GROUP BY p.property_id
      ORDER BY p.created_at DESC
    `);

    properties.forEach(p => {
      try {
        if (p.documents && typeof p.documents === 'string' && p.documents !== 'null') {
          p.documents_parsed = JSON.parse(p.documents);
        } else {
          p.documents_parsed = { titleDeed: "", valuationCertificate: "", taxBills: "" };
        }
      } catch (e) {
        console.log("Error parsing documents:", e.message);
        p.documents_parsed = { titleDeed: "", valuationCertificate: "", taxBills: "" };
      }
    });

    res.json({ success: true, properties });
  } catch (error) {
    console.error("Error fetching marketplace properties:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Get Single Property by ID
// --------------------
router.get("/property/:id", async (req, res) => {
  try {
    const propertyId = req.params.id;
    
    const [properties] = await pool.query(`
      SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.role as owner_role,
             tr.total_supply, tr.token_price, tr.tokenized_at
      FROM properties p
      JOIN users u ON p.owner_id = u.user_id
      LEFT JOIN tokenization_records tr ON p.property_id = tr.property_id
      WHERE p.property_id = ?
    `, [propertyId]);

    if (properties.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    const [holders] = await pool.query(`
      SELECT u.full_name, u.wallet_address, tt.amount as tokens_held
      FROM token_transactions tt
      JOIN users u ON tt.to_user = u.user_id
      WHERE tt.property_id = ? AND tt.tx_type = 'PRIMARY'
      GROUP BY u.user_id
    `, [propertyId]);

    properties[0].token_holders = holders;

    res.json({ success: true, property: properties[0] });

  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Submit Property for Tokenization
// --------------------
router.post("/add-property", (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({ success: false, message: err.message });
    }

    let connection;
    
    try {
      console.log("📦 RECEIVED FILES:", req.files ? Object.keys(req.files) : "No files");
      console.log("📸 Exterior images:", req.files?.exteriorImages?.length || 0);
      console.log("📸 Interior images:", req.files?.interiorImages?.length || 0);
      
      const {
        user_id,
        title,
        province,
        city,
        type,
        value,
        description,
        street,
        postal_code,
        size,
        size_unit,
        country = "Pakistan"
      } = req.body;

      const rentalYield = req.body.rentalYield || req.body.yield;
      
      // Get document paths
      const titleDeedPath = req.files?.titleDeed?.[0]?.path || null;
      const valuationCertPath = req.files?.valuationCertificate?.[0]?.path || null;
      const taxBillsPath = req.files?.taxBills?.[0]?.path || null;
      
      // Get image paths
      const exteriorImages = req.files?.exteriorImages?.map(file => file.path) || [];
      const interiorImages = req.files?.interiorImages?.map(file => file.path) || [];

      console.log("📁 Title Deed:", titleDeedPath);
      console.log("📁 Valuation Certificate:", valuationCertPath);
      console.log("📁 Tax Bills:", taxBillsPath);
      console.log("📸 Exterior image paths:", exteriorImages);
      console.log("📸 Interior image paths:", interiorImages);

      // Validation
      if (!user_id || !title || !province || !city || !type || !value ||
          !rentalYield || !description || !street || !postal_code || !size || !size_unit) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }

      if (!titleDeedPath || !valuationCertPath || !taxBillsPath) {
        return res.status(400).json({ success: false, message: "All documents are required" });
      }

      if (exteriorImages.length < 2) {
        return res.status(400).json({ success: false, message: "Please upload at least 2 exterior photos" });
      }
      if (interiorImages.length < 2) {
        return res.status(400).json({ success: false, message: "Please upload at least 2 interior photos" });
      }

      // KYC check
      const [kycCheck] = await pool.query(
        "SELECT status FROM kyc_requests WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1",
        [user_id]
      );

      if (kycCheck.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: "KYC verification required. Please complete your KYC before submitting a property." 
        });
      }

      if (kycCheck[0].status !== 'Approved') {
        return res.status(403).json({ 
          success: false, 
          message: `Your KYC is ${kycCheck[0].status.toLowerCase()}. Only approved users can submit properties.` 
        });
      }

      // Check existing property
      const [existingProp] = await pool.query(
        "SELECT COUNT(*) as count FROM properties WHERE owner_id = ? AND status IN ('Pending', 'Approved', 'Tokenized')",
        [user_id]
      );

      if (existingProp[0].count > 0) {
        return res.status(403).json({
          success: false,
          message: "You already have an active property. Only one property per person is allowed."
        });
      }

      const tokens = Math.max(1, Math.floor(parseFloat(value) / 1000));
      const address = `${street}, ${city}, ${province}, ${country}`;
      const propertyHash = generatePropertyHash(title, user_id, Date.now());
      const tokenPrice = tokens > 0 ? value / tokens : 0;

      const documents = JSON.stringify({
        titleDeed: titleDeedPath,
        valuationCertificate: valuationCertPath,
        taxBills: taxBillsPath,
        exteriorImages: exteriorImages,
        interiorImages: interiorImages
      });

      connection = await pool.getConnection();
      await connection.beginTransaction();

      // Insert into properties table
      const [result] = await connection.query(
        `INSERT INTO properties (
          property_hash, owner_id, title, province, city, 
          street, postal_code, type, size, size_unit, 
          value, tokens, description, address, country, 
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NOW())`,
        [propertyHash, user_id, title, province, city, street, postal_code, type, size, size_unit, value, tokens, description, address, country]
      );

      const propertyId = result.insertId;
      console.log(`✅ Property created with ID: ${propertyId}`);

      // Insert into tokenization_requests
      await connection.query(
        `INSERT INTO tokenization_requests (
          property_id, owner_id, property_name, property_address,
          total_tokens, token_price, total_value, documents, status, requested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [propertyId, user_id, title, address, tokens, tokenPrice, value, documents]
      );

      // SAVE EXTERIOR IMAGES to property_images table
      for (const imgPath of exteriorImages) {
        const cleanPath = imgPath.replace(/\\/g, '/');
        await connection.query(
          'INSERT INTO property_images (property_id, image_url, image_type) VALUES (?, ?, ?)',
          [propertyId, cleanPath, 'exterior']
        );
        console.log(`✅ Saved exterior image: ${cleanPath}`);
      }

      // SAVE INTERIOR IMAGES to property_images table
      for (const imgPath of interiorImages) {
        const cleanPath = imgPath.replace(/\\/g, '/');
        await connection.query(
          'INSERT INTO property_images (property_id, image_url, image_type) VALUES (?, ?, ?)',
          [propertyId, cleanPath, 'interior']
        );
        console.log(`✅ Saved interior image: ${cleanPath}`);
      }

      await connection.commit();
      console.log(`🎉 Transaction committed for property ${propertyId}`);

      res.json({
        success: true,
        message: `Property submitted successfully with ${exteriorImages.length + interiorImages.length} images!`,
        property: {
          property_id: propertyId,
          property_hash: propertyHash,
          title,
          status: "Pending",
          tokens,
          yield: rentalYield,
          value,
          images_count: exteriorImages.length + interiorImages.length
        }
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error("❌ Error adding property:", error);
      res.status(500).json({ success: false, message: "Server error: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });
});

// --------------------
// Update Property Status (Admin only)
// --------------------
router.put("/update-status/:id", async (req, res) => {
  let connection;
  
  try {
    const { admin_id, status, rejection_reason, total_supply, token_price, valuation_amount } = req.body;
    const propertyId = req.params.id;

    console.log("🔑 Update request - Admin ID:", admin_id);
    console.log("🔑 Update request - Status:", status);

    if (!admin_id) {
      return res.status(400).json({ success: false, message: "Admin ID required" });
    }

    if (!["Pending", "Approved", "Tokenized", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let updateQuery = "UPDATE properties SET status = ?, updated_at = NOW()";
    let updateParams = [status];
    
    if (valuation_amount !== undefined && valuation_amount !== null && valuation_amount !== "") {
      updateQuery += ", valuation_amount = ?";
      updateParams.push(valuation_amount);
    }
    
    updateQuery += " WHERE property_id = ?";
    updateParams.push(propertyId);
    
    await connection.query(updateQuery, updateParams);

    let tokenQuery = "UPDATE tokenization_requests SET status = ?, reviewed_at = NOW(), reviewed_by = NULL";
    let tokenParams = [status.toLowerCase()];
    
    if (status === "Rejected" && rejection_reason) {
      tokenQuery += ", rejection_reason = ?";
      tokenParams.push(rejection_reason);
    }
    
    tokenQuery += " WHERE property_id = ?";
    tokenParams.push(propertyId);
    
    await connection.query(tokenQuery, tokenParams);

    if (status === "Tokenized" && total_supply && token_price) {
      const txHash = req.body.blockchain_tx_hash || null;

      await connection.query(
        `UPDATE properties SET tokens = ? WHERE property_id = ?`,
        [total_supply, propertyId]
      );

      await connection.query(
        `INSERT INTO tokenization_records (property_id, total_supply, token_price, transaction_hash, tokenized_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE 
           total_supply = VALUES(total_supply),
           token_price = VALUES(token_price),
           transaction_hash = VALUES(transaction_hash),
           tokenized_at = NOW()`,
        [propertyId, total_supply, token_price, txHash]
      );

      const [propRows] = await connection.query(
        `SELECT owner_id FROM properties WHERE property_id = ?`,
        [propertyId]
      );
      if (propRows.length > 0) {
        await connection.query(
          `INSERT INTO token_transactions 
             (property_id, from_user, to_user, amount, price_per_token, total_price, tx_type, blockchain_tx_hash, created_at)
           VALUES (?, NULL, ?, ?, ?, ?, 'PRIMARY', ?, NOW())`,
          [
            propertyId,
            propRows[0].owner_id,
            total_supply,
            token_price,
            total_supply * token_price,
            txHash
          ]
        );
      }
    }

    await connection.commit();

    res.json({ 
      success: true, 
      message: `Property ${status.toLowerCase()} successfully!` 
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error updating property status:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// --------------------
// Delete Property (Admin only)
// --------------------
router.delete("/property/:id", async (req, res) => {
  try {
    const { admin_id } = req.body;
    const propertyId = req.params.id;

    if (!admin_id) {
      return res.status(400).json({ success: false, message: "Admin ID required" });
    }

    const [result] = await pool.query("DELETE FROM properties WHERE property_id = ?", [propertyId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    res.json({ success: true, message: "Property deleted successfully" });

  } catch (error) {
    console.error("Error deleting property:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Get Pending Properties for Admin
// --------------------
router.get("/pending-approvals", async (req, res) => {
  try {
    const { admin_id } = req.query;

    if (!admin_id) {
      return res.status(400).json({ success: false, message: "Admin ID required" });
    }

    const [properties] = await pool.query(`
      SELECT p.*, u.full_name as owner_name, u.email as owner_email, u.role as owner_role,
             tr.total_tokens, tr.token_price, tr.total_value, tr.requested_at, tr.documents
      FROM properties p
      JOIN users u ON p.owner_id = u.user_id
      JOIN tokenization_requests tr ON p.property_id = tr.property_id
      WHERE p.status = 'Pending' AND tr.status = 'pending'
      ORDER BY p.created_at ASC
    `);

    properties.forEach(p => {
      try {
        p.documents_parsed = p.documents ? JSON.parse(p.documents) : null;
      } catch (e) {
        p.documents_parsed = null;
      }
    });

    res.json({ success: true, properties });

  } catch (error) {
    console.error("Error fetching pending approvals:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// --------------------
// Get User's Token Holdings
// --------------------
router.get("/my-holdings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [holdings] = await pool.query(`
      SELECT
        p.property_id,
        p.title,
        p.city,
        p.province,
        p.type,
        p.status AS property_status,
        p.property_hash,
        p.owner_id,
        tr.token_price AS mint_token_price,
        tr.total_supply,
        (
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND to_user = ?), 0) -
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND from_user = ?), 0)
        ) AS tokens_owned,
        tr.token_price * (
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND to_user = ?), 0) -
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND from_user = ?), 0)
        ) AS current_value,
        COALESCE((
          SELECT SUM(total_price) FROM token_transactions
          WHERE property_id = p.property_id AND to_user = ? AND tx_type = 'SECONDARY'
        ), 0) AS amount_paid,
        (
          SELECT COALESCE(SUM(amount * price_per_token), 0) FROM token_transactions
          WHERE property_id = p.property_id AND to_user = ? AND tx_type = 'SECONDARY'
        ) AS weighted_cost
      FROM properties p
      LEFT JOIN tokenization_records tr ON p.property_id = tr.property_id
      WHERE p.property_id IN (
        SELECT DISTINCT property_id FROM token_transactions
        WHERE to_user = ? AND tx_type = 'SECONDARY'
      )
      AND p.owner_id != ?
      HAVING tokens_owned > 0
      ORDER BY current_value DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    // avg_price_per_token = weighted average of token_transactions.price_per_token
    // across all of this user's SECONDARY purchases for the property — the actual
    // price(s) paid, not the original mint price (tr.token_price).
    holdings.forEach(h => {
      const tokensOwned = Number(h.tokens_owned || 0);
      const weightedCost = Number(h.weighted_cost || 0);
      h.avg_price_per_token = tokensOwned > 0 ? weightedCost / tokensOwned : Number(h.mint_token_price || 0);
      delete h.weighted_cost;
    });

    const totalTokens = holdings.reduce((s, h) => s + Number(h.tokens_owned || 0), 0);
    const totalValue  = holdings.reduce((s, h) => s + Number(h.current_value || 0), 0);

    res.json({ success: true, holdings, totalTokens, totalValue });
  } catch (err) {
    console.error("Holdings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get pending count only
router.get("/pending-count", async (req, res) => {
  try {
    const [result] = await pool.query(
      "SELECT COUNT(*) as count FROM properties WHERE status = 'Pending'"
    );
    res.json({ success: true, count: result[0].count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --------------------
// Blockchain Routes
// --------------------
router.post("/blockchain-approve/:id", async (req, res) => {
  try {
    const { ethers } = await import("ethers");
    const propertyId = req.params.id;

    const [rows] = await pool.query(
      `SELECT p.property_hash, p.title, p.owner_id, u.wallet_address
       FROM properties p
       JOIN users u ON p.owner_id = u.user_id
       WHERE p.property_id = ?`,
      [propertyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    const { property_hash, wallet_address } = rows[0];

    if (!wallet_address) {
      return res.status(400).json({ success: false, message: "Owner has no wallet address on record" });
    }

    const propertyHashBytes32 = "0x" + property_hash;
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = ["function createAndApproveProperty(bytes32 propertyHash, address owner) external"];
    const contract = new ethers.Contract(process.env.AdminController, abi, signer);

    const tx = await contract.createAndApproveProperty(propertyHashBytes32, wallet_address);
    const receipt = await tx.wait();

    res.json({ success: true, message: "Property approved on blockchain", txHash: receipt.hash });

  } catch (error) {
    console.error("❌ Blockchain approve error:", error);
    if (error.message?.includes("Property exists")) {
      return res.json({ success: true, message: "Already on blockchain", txHash: null });
    }
    res.status(500).json({ success: false, message: "Blockchain error: " + error.message });
  }
});

router.post("/blockchain-mint/:id", async (req, res) => {
  try {
    const { ethers } = await import("ethers");
    const propertyId = req.params.id;

    const [rows] = await pool.query(
      `SELECT property_hash, title FROM properties WHERE property_id = ?`,
      [propertyId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }

    const { property_hash, title } = rows[0];
    const propertyHashBytes32 = "0x" + property_hash;
    const FIXED_SUPPLY = parseInt(req.body.total_supply);

    if (!FIXED_SUPPLY || FIXED_SUPPLY <= 0) {
      return res.status(400).json({ success: false, message: "total_supply is required" });
    }

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const abi = ["function mintTokens(bytes32 hash, uint256 supply) external"];
    const contract = new ethers.Contract(process.env.AdminController, abi, signer);

    const tx = await contract.mintTokens(propertyHashBytes32, FIXED_SUPPLY);
    const receipt = await tx.wait();

    res.json({ success: true, message: "Tokens minted on blockchain", txHash: receipt.hash });

  } catch (error) {
    console.error("❌ Blockchain mint error:", error);
    if (error.message?.includes("Already tokenized")) {
      return res.json({ success: true, message: "Already minted on blockchain", txHash: null });
    }
    res.status(500).json({ success: false, message: "Blockchain error: " + error.message });
  }
});

// ==================== MY LISTINGS ====================
router.get("/my-listings", async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, message: "User ID required" });
 
    const [listings] = await pool.query(`
      SELECT
        so.order_id AS listing_id,
        so.property_id,
        so.seller_id AS user_id,
        so.tokens_for_sale,
        COALESCE(so.original_tokens, so.tokens_for_sale) AS original_tokens,
        so.price_per_token,
        (so.tokens_for_sale * so.price_per_token) AS total_value,
        so.status,
        so.created_at,
        so.updated_at,
        p.title,
        p.type,
        p.city,
        p.province,
        p.address,
        p.description,
        p.value AS property_value,
        p.tokens AS total_tokens,
        u.full_name AS seller_name
      FROM sell_orders so
      JOIN properties p ON so.property_id = p.property_id
      JOIN users u ON so.seller_id = u.user_id
      WHERE so.seller_id = ?
      ORDER BY so.created_at DESC
    `, [user_id]);
 
    res.json({ success: true, listings });
  } catch (error) {
    console.error("Error fetching user listings:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

router.put("/cancel-listing/:listingId", async (req, res) => {
  try {
    const { listingId } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const [check] = await pool.query(
      "SELECT seller_id, status FROM sell_orders WHERE order_id = ?",
      [listingId]
    );

    if (check.length === 0) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (check[0].seller_id !== parseInt(user_id)) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await pool.query(
      "UPDATE sell_orders SET status = 'Cancelled', updated_at = NOW() WHERE order_id = ? AND seller_id = ?",
      [listingId, user_id]
    );

    res.json({ success: true, message: "Listing cancelled successfully" });

  } catch (error) {
    console.error("Error cancelling listing:", error);
    res.status(500).json({ success: false, message: "Server error: " + error.message });
  }
});

// ==================== SELL ORDERS ====================
router.post('/sell-orders', async (req, res) => {
  const { property_id, seller_id, tokens_for_sale, price_per_token } = req.body;

  try {
    const [minted] = await pool.query(
      `SELECT total_supply FROM tokenization_records WHERE property_id = ?`,
      [property_id]
    );
    const totalSupply = minted[0]?.total_supply || 0;
    if (totalSupply === 0) {
      return res.status(400).json({ success: false, message: "Property not tokenized yet" });
    }

    // Check if this seller is the original property owner
    const [propRows] = await pool.query(
      `SELECT owner_id FROM properties WHERE property_id = ?`,
      [property_id]
    );
    const isOriginalOwner = propRows.length > 0 && Number(propRows[0].owner_id) === Number(seller_id);

    const [receivedRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS received FROM token_transactions
       WHERE property_id = ? AND to_user = ?`,
      [property_id, seller_id]
    );
    const [sentRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS sent FROM token_transactions
       WHERE property_id = ? AND from_user = ?`,
      [property_id, seller_id]
    );
    const [activeRows] = await pool.query(
      `SELECT COALESCE(SUM(tokens_for_sale), 0) AS active FROM sell_orders
       WHERE property_id = ? AND seller_id = ? AND status = 'Active'`,
      [property_id, seller_id]
    );

    const tokensReceived  = Number(receivedRows[0].received);
    const tokensSent      = Number(sentRows[0].sent);
    const currentlyListed = Number(activeRows[0].active);
    const ownedTokens     = tokensReceived - tokensSent;
    const availableToList = ownedTokens - currentlyListed;

    if (tokens_for_sale < 1) {
      return res.status(400).json({ success: false, message: "Must list at least 1 token." });
    }

    if (tokens_for_sale > availableToList) {
      return res.status(400).json({
        success: false,
        message: `You only have ${availableToList} unlisted tokens available. (Owned: ${ownedTokens}, Listed: ${currentlyListed})`
      });
    }

    // 70% rule only applies to the original property owner
    if (isOriginalOwner) {
      const alreadySold = totalSupply - ownedTokens;
      const maxSellable = Math.floor(totalSupply * 0.7);
      const totalOutOrListed = alreadySold + currentlyListed + tokens_for_sale;

      if (totalOutOrListed > maxSellable) {
        const canList = Math.max(0, maxSellable - alreadySold - currentlyListed);
        return res.status(400).json({
          success: false,
          message: `70% limit reached. Already sold: ${alreadySold}, listed: ${currentlyListed}, max total: ${maxSellable}. You can list ${canList} more tokens.`
        });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO sell_orders (property_id, seller_id, tokens_for_sale, original_tokens, price_per_token)
       VALUES (?, ?, ?, ?, ?)`,
      [property_id, seller_id, tokens_for_sale, tokens_for_sale, price_per_token]
    );

    res.json({ success: true, order_id: result.insertId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/sell-orders', async (req, res) => {
  const { seller_id } = req.query;
  try {
    let query = `
      SELECT so.*, p.title, p.type, p.city, p.province, p.address,
             p.description, u.full_name AS seller_name
      FROM sell_orders so
      JOIN properties p ON so.property_id = p.property_id
      JOIN users u ON so.seller_id = u.user_id
      WHERE so.status = 'Active'
    `;
    const params = [];
    if (seller_id) { query += ' AND so.seller_id = ?'; params.push(seller_id); }
    query += ' ORDER BY so.created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, orders: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/sell-orders/:id', async (req, res) => {
  try {
    await pool.query("UPDATE sell_orders SET status='Cancelled' WHERE order_id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== PROPERTY IMAGES ====================
router.get('/:id/images', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM property_images WHERE property_id = ? ORDER BY image_type, image_id',
      [req.params.id]
    );
    res.json({ success: true, images: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== TOKEN TRANSACTIONS ====================
router.post("/token-transaction", async (req, res) => {
  try {
    const { property_id, from_user, to_user, amount, price_per_token, 
            total_price, tx_type, blockchain_tx_hash } = req.body;

    await pool.query(
      `INSERT INTO token_transactions 
        (property_id, from_user, to_user, amount, price_per_token, total_price, tx_type, blockchain_tx_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [property_id, from_user, to_user, amount, price_per_token, total_price, tx_type, blockchain_tx_hash]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ Updated reduce endpoint with validation
router.put("/sell-orders/:id/reduce", async (req, res) => {
  try {
    const { tokens_sold } = req.body;
    const orderId = req.params.id;

    if (!tokens_sold || tokens_sold <= 0) {
      return res.status(400).json({ success: false, message: "Invalid tokens_sold amount" });
    }

    const [order] = await pool.query(
      "SELECT tokens_for_sale, status FROM sell_orders WHERE order_id = ?",
      [orderId]
    );
    if (order.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const currentTokens = order[0].tokens_for_sale;
    const newRemaining = currentTokens - tokens_sold;
    const newStatus = newRemaining <= 0 ? "Sold" : "Active";

    if (newRemaining < 0) {
      return res.status(400).json({ success: false, message: "Cannot reduce below zero" });
    }
console.log(`🔄 Reducing order ${orderId} by ${tokens_sold} tokens (current: ${currentTokens})`);
    const [result] = await pool.query(
      `UPDATE sell_orders 
       SET tokens_for_sale = ?, status = ?, updated_at = NOW()
       WHERE order_id = ?`,
      [newRemaining, newStatus, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Order not found or already updated" });
    }

    console.log(`✅ Order ${orderId} reduced: ${currentTokens} → ${newRemaining} (${newStatus})`);
    res.json({ success: true, newRemaining, newStatus });
  } catch (err) {
    console.error("❌ Reduce error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/my-holdings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [holdings] = await pool.query(`
      SELECT
        p.property_id,
        p.title,
        p.city,
        p.province,
        p.type,
        p.status AS property_status,
        p.property_hash, 
        tr.token_price AS mint_token_price,
        tr.total_supply,
        (
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND to_user = ?), 0) -
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND from_user = ?), 0)
        ) AS tokens_owned,
        tr.token_price * (
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND to_user = ?), 0) -
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND from_user = ?), 0)
        ) AS current_value,
        COALESCE((
          SELECT SUM(total_price) FROM token_transactions
          WHERE property_id = p.property_id AND to_user = ?
        ), 0) AS amount_paid,
        (
          SELECT COALESCE(SUM(amount * price_per_token), 0) FROM token_transactions
          WHERE property_id = p.property_id AND to_user = ?
        ) AS weighted_cost
      FROM properties p
      LEFT JOIN tokenization_records tr ON p.property_id = tr.property_id
      WHERE p.property_id IN (
        SELECT DISTINCT property_id FROM token_transactions
        WHERE to_user = ? OR from_user = ?
      )
      HAVING tokens_owned > 0
      ORDER BY current_value DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);

    holdings.forEach(h => {
      const tokensOwned = Number(h.tokens_owned || 0);
      const weightedCost = Number(h.weighted_cost || 0);
      h.avg_price_per_token = tokensOwned > 0 ? weightedCost / tokensOwned : Number(h.mint_token_price || 0);
      delete h.weighted_cost;
    });
 
    const totalTokens = holdings.reduce((s, h) => s + Number(h.tokens_owned || 0), 0);
    const totalValue  = holdings.reduce((s, h) => s + Number(h.current_value || 0), 0);
 
    res.json({ success: true, holdings, totalTokens, totalValue });
  } catch (err) {
    console.error("Holdings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/investment-summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await pool.query(`
      SELECT COALESCE(SUM(total_price), 0) as total_invested,
             COUNT(DISTINCT property_id) as properties_count
      FROM token_transactions WHERE to_user = ?
    `, [userId]);
    res.json({ 
      success: true, 
      totalInvested: result[0].total_invested,
      propertiesCount: result[0].properties_count
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/profit-summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await pool.query(`
      SELECT COALESCE(SUM(
        (tt.price_per_token - COALESCE(tr.token_price, 0)) * tt.amount
      ), 0) AS total_profit
      FROM token_transactions tt
      JOIN properties p ON tt.property_id = p.property_id
      LEFT JOIN tokenization_records tr ON tt.property_id = tr.property_id
      WHERE tt.from_user = ? AND tt.tx_type = 'SECONDARY'
    `, [userId]);
    res.json({ success: true, totalProfit: Number(result[0].total_profit) || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/sold-activity/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [activity] = await pool.query(`
      SELECT
        tt.amount,
        tt.total_price,
        tt.created_at,
        p.title AS property_title,
        u.full_name AS buyer_name
      FROM token_transactions tt
      JOIN properties p ON tt.property_id = p.property_id
      JOIN users u ON tt.to_user = u.user_id
      WHERE tt.from_user = ? AND tt.tx_type = 'SECONDARY'
      ORDER BY tt.created_at DESC LIMIT 20
    `, [userId]);
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 
router.get("/recent-activity/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [activity] = await pool.query(`
      SELECT
        tt.amount,
        tt.total_price,
        tt.price_per_token,
        tt.tx_type,
        tt.created_at,
        tt.blockchain_tx_hash,
        p.title AS property_title,
        p.city,
        p.province,
        u.full_name AS from_name
      FROM token_transactions tt
      JOIN properties p ON tt.property_id = p.property_id
      LEFT JOIN users u ON tt.from_user = u.user_id
      WHERE tt.to_user = ?
      ORDER BY tt.created_at DESC LIMIT 20
    `, [userId]);
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/blockchain-assign-tenant", async (req, res) => {
  try {
    const { ethers } = await import("ethers");
    const { propertyHash, tenantCnic, monthlyRentWei, ownerWallet } = req.body;

    if (!propertyHash || !tenantCnic || !monthlyRentWei || !ownerWallet) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    console.log("Assign tenant on-chain:", { propertyHash, tenantCnic, monthlyRentWei });
    res.json({ success: true, message: "Use frontend signer directly" });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
 // ==================== OWNER BALANCE (Real‑time) ====================
router.get("/owner-balance/:propertyId/:userId", async (req, res) => {
  try {
    const { propertyId, userId } = req.params;

    const [receivedRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS received
       FROM token_transactions
       WHERE property_id = ? AND to_user = ?`,
      [propertyId, userId]
    );

    const [sentRows] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS sent
       FROM token_transactions
       WHERE property_id = ? AND from_user = ?`,
      [propertyId, userId]
    );

    const [listedRows] = await pool.query(
      `SELECT COALESCE(SUM(tokens_for_sale), 0) AS listed
       FROM sell_orders
       WHERE property_id = ? AND seller_id = ? AND status = 'Active'`,
      [propertyId, userId]
    );

    const received = Number(receivedRows[0].received); // 100
    const sent     = Number(sentRows[0].sent);         // 6 (already sold SECONDARY)
    const listed   = Number(listedRows[0].listed);     // 63 (active order remaining)

    // Tokens truly owned right now
    const ownedTokens = received - sent;               // 94

    // Of those 94, how many are already locked in active listings?
    // The listed tokens (63) are part of what they own but locked
    const availableToSell = ownedTokens - listed;      // 31

    res.json({ success: true, ownedTokens, listedTokens: listed, availableToSell });

  } catch (err) {
    console.error("Owner balance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==================== ETH/PKR RATE PROXY ====================

let cachedEthRate = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

router.get("/eth-pkr-rate", async (req, res) => {
  // Serve cache if fresh
  if (cachedEthRate && Date.now() - cacheTime < CACHE_TTL) {
    return res.json({ success: true, rate: cachedEthRate, cached: true });
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=pkr",
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0" // CoinGecko free tier needs this
        },
        signal: AbortSignal.timeout(8000)
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko responded with ${response.status}`);
    }

    const data = await response.json();
    const rate = data?.ethereum?.pkr;

    if (!rate) throw new Error("Invalid response shape");

    cachedEthRate = rate;
    cacheTime = Date.now();

    return res.json({ success: true, rate });
  } catch (err) {
    console.error("ETH rate fetch failed:", err.message);

    // Return stale cache rather than failing
    if (cachedEthRate) {
      return res.json({ success: true, rate: cachedEthRate, stale: true });
    }

    return res.json({ success: true, rate: 850000, fallback: true });
  }
});

// ==================== RENT PAYMENT RECORD ====================
router.post("/rent-payment", async (req, res) => {
  try {
    const {
      tenant_user_id,
      property_id,
      amount_wei,
      amount_pkr,
      amount_eth,
      blockchain_tx_hash,
      month_year,
    } = req.body;

    if (!tenant_user_id || !property_id || !blockchain_tx_hash || !month_year) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Check if already paid for this month
    const [existing] = await pool.query(
      "SELECT payment_id FROM rent_payments WHERE tenant_user_id = ? AND month_year = ?",
      [tenant_user_id, month_year]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "Rent already paid for this month" });
    }

/** it reads accRentPerToken from the chain right after the tx confirms, computes acc_before **/
  const { ethers } = await import("ethers");
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const rwaReadAbi = ["function accRentPerToken(bytes32) view returns (uint256)"];
    const rwaRead = new ethers.Contract(process.env.RealEstateRWA, rwaReadAbi, provider);

    const [propRow] = await pool.query(
      "SELECT property_hash FROM properties WHERE property_id = ?",
      [property_id]
    );
    const propertyHashHex = "0x" + propRow[0].property_hash;
    const accAfter = await rwaRead.accRentPerToken(propertyHashHex);

    const [lastPayment] = await pool.query(
      "SELECT acc_after FROM rent_payments WHERE property_id = ? ORDER BY paid_at DESC LIMIT 1",
      [property_id]
    );
    const accBefore = lastPayment.length > 0 ? lastPayment[0].acc_after : "0";

    await pool.query(
      `INSERT INTO rent_payments 
        (tenant_user_id, property_id, amount_wei, amount_pkr, amount_eth, blockchain_tx_hash, month_year, acc_before, acc_after, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [tenant_user_id, property_id, amount_wei, amount_pkr, amount_eth, blockchain_tx_hash, month_year, accBefore, accAfter.toString()]
    );

res.json({ success: true, message: "Payment recorded successfully" });

  
  } catch (err) {
    console.error("Rent payment record error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== GET RENT PAYMENT HISTORY ====================
router.get("/rent-payments/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [payments] = await pool.query(
      `SELECT rp.*, p.title as property_title
       FROM rent_payments rp
       JOIN properties p ON rp.property_id = p.property_id
       WHERE rp.tenant_user_id = ?
       ORDER BY rp.paid_at DESC`,
      [userId]
    );
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== CHECK CURRENT MONTH RENT STATUS ====================
router.get("/rent-status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const monthYear = new Date().toISOString().slice(0, 7); // "2026-05"
    const [rows] = await pool.query(
      "SELECT * FROM rent_payments WHERE tenant_user_id = ? AND month_year = ?",
      [userId, monthYear]
    );
    res.json({ success: true, paid: rows.length > 0, payment: rows[0] || null, monthYear });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== SAVE RENT WITHDRAWAL (rental_distributions) ====================
router.post("/rent-withdrawal", async (req, res) => {
  const {
    user_id,
    property_id,
    token_balance,
    amount_eth,
    blockchain_tx_hash,
  } = req.body;

  try {
    const monthYear = new Date().toISOString().slice(0, 7); // "YYYY-MM"

    // Determine which month this user first becomes eligible from
    const [firstTx] = await pool.query(
      `SELECT MIN(created_at) AS first_buy FROM token_transactions
       WHERE property_id = ? AND to_user = ?`,
      [property_id, user_id]
    );
    let eligibleFromMonth = null;
    if (firstTx[0].first_buy) {
      const buyDate = new Date(firstTx[0].first_buy);
      const nextMonth = new Date(buyDate.getFullYear(), buyDate.getMonth() + 1, 1);
      eligibleFromMonth = nextMonth.toISOString().slice(0, 7);
    }

    // Find the rent payment to attach this withdrawal to — prefer this month's, else most recent
    let [rentals] = await pool.query(
      `SELECT payment_id AS rental_id, amount_pkr FROM rent_payments
       WHERE property_id = ? AND month_year = ? ORDER BY paid_at DESC LIMIT 1`,
      [property_id, monthYear]
    );

    if (rentals.length === 0) {
      [rentals] = await pool.query(
        `SELECT payment_id AS rental_id, amount_pkr FROM rent_payments
         WHERE property_id = ? ORDER BY payment_id DESC LIMIT 1`,
        [property_id]
      );
    }

    if (rentals.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No rental record found for this property. Rent must be paid before withdrawal.",
      });
    }

    const rental_id = rentals[0].rental_id;
    const totalRentPkr = Number(rentals[0].amount_pkr) || 0;

    // Get total token supply so we can compute this holder's proportional share
    const [supplyRow] = await pool.query(
      "SELECT total_supply FROM tokenization_records WHERE property_id = ?",
      [property_id]
    );
    const totalSupply = supplyRow.length > 0 ? Number(supplyRow[0].total_supply) : 0;

    const pkrShare = totalSupply > 0
      ? Math.round((Number(token_balance) / totalSupply) * totalRentPkr)
      : 0;

    // Check if this user already has a distribution for this rental
    const [existing] = await pool.query(
      `SELECT distribution_id, claimed FROM rental_distributions 
       WHERE rental_id = ? AND user_id = ?`,
      [rental_id, user_id]
    );

    if (existing.length > 0 && existing[0].claimed === 1) {
      return res.status(400).json({
        success: false,
        message: "Rent already withdrawn for this rental period.",
      });
    }

    if (existing.length > 0) {
      await pool.query(
        `UPDATE rental_distributions 
         SET token_balance = ?, amount_paid = ?, blockchain_tx_hash = ?,
             claimed = 1, claimed_at = NOW(), eligible_from_month = ?
         WHERE distribution_id = ?`,
        [token_balance, pkrShare, blockchain_tx_hash, eligibleFromMonth, existing[0].distribution_id]
      );
    } else {
      await pool.query(
        `INSERT INTO rental_distributions 
         (rental_id, user_id, token_balance, amount_paid, blockchain_tx_hash, claimed, claimed_at, eligible_from_month)
         VALUES (?, ?, ?, ?, ?, 1, NOW(), ?)`,
        [rental_id, user_id, token_balance, pkrShare, blockchain_tx_hash, eligibleFromMonth]
      );
    }

    res.json({ success: true, message: "Withdrawal recorded successfully.", amount_pkr: pkrShare });
  } catch (err) {
    console.error("Rent withdrawal DB error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== GET WITHDRAWAL HISTORY for a user ====================
router.get("/rent-withdrawals/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT 
         rd.distribution_id,
         rd.rental_id,
         rd.token_balance,
         rd.amount_paid,
         rd.blockchain_tx_hash,
         rd.claimed,
         rd.claimed_at,
         p.title AS property_title,
         p.city,
         p.province,
         rp.month_year
       FROM rental_distributions rd
       JOIN rent_payments rp ON rd.rental_id = rp.payment_id
       JOIN properties p ON rp.property_id = p.property_id
       WHERE rd.user_id = ?
       ORDER BY rd.claimed_at DESC`,
      [userId]
    );
    res.json({ success: true, withdrawals: rows });
  } catch (err) {
    console.error("Fetch withdrawals error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ==================== OWNER'S OWN PROPERTY HOLDINGS (for Rental Income) ====================
router.get("/owner-property-holdings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [holdings] = await pool.query(`
      SELECT
        p.property_id,
        p.title,
        p.city,
        p.province,
        p.type,
        p.status AS property_status,
        p.property_hash,
        p.owner_id,
        tr.token_price,
        tr.total_supply,
        (
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND to_user = ?), 0) -
          COALESCE((SELECT SUM(amount) FROM token_transactions
            WHERE property_id = p.property_id AND from_user = ?), 0)
        ) AS tokens_owned
      FROM properties p
      LEFT JOIN tokenization_records tr ON p.property_id = tr.property_id
      WHERE p.owner_id = ?
        AND p.status = 'Tokenized'
      HAVING tokens_owned > 0
      ORDER BY p.created_at DESC
    `, [userId, userId, userId]);

    

    res.json({ success: true, holdings });
  } catch (err) {
    console.error("Owner property holdings error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;