const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
require("dotenv").config();

// Create email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

// Format CNIC with dashes (XXXXX-XXXXXXX-X)
const formatCnicWithDashes = (cnic) => {
  const cleanCnic = cnic.replace(/\D/g, "");
  if (cleanCnic.length === 13) {
    return cleanCnic.replace(/(\d{5})(\d{7})(\d{1})/, "$1-$2-$3");
  }
  return cnic;
};

// Generate random password
const generateRandomPassword = () => {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const all = uppercase + lowercase + numbers;
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  for (let i = 2; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Send email with credentials
const sendTenantCredentials = async (tenantEmail, fullName, cnic, password) => {
  const formattedCnic = formatCnicWithDashes(cnic);
  
  const mailOptions = {
    from: process.env.EMAIL,
    to: tenantEmail,
    subject: "Welcome to Real World Assets - Your Tenant Account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0A2FFF;">Welcome to Real World Assets!</h2>
        <p>Dear <strong>${fullName}</strong>,</p>
        <p>A property owner has added you as a tenant. Here are your login credentials:</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>CNIC (Username):</strong> ${formattedCnic}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        
        <p>Please login and complete your KYC verification to start managing your rental payments.</p>
        
        <a href="http://localhost:3000/" style="background: #0A2FFF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Login to Your Account
        </a>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          For security reasons, please change your password after first login.
        </p>
        
        <hr />
        <p style="font-size: 11px; color: #999;">
          If the button doesn't work, copy and paste this link in your browser:<br />
          http://localhost:3000/
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ============================================
// POST /api/tenants/add - Add a new tenant
// ============================================
router.post("/add", async (req, res) => {
  const { 
    owner_id, 
    fullName, 
    email, 
    cnic, 
    phone, 
    propertyId, 
    monthlyRent, 
    leaseStart, 
    leaseEnd 
  } = req.body;
  
  console.log("Add tenant request received:", req.body);
  
  // Validation
  if (!owner_id || !fullName || !email || !cnic || !phone || !propertyId || !monthlyRent || !leaseStart || !leaseEnd) {
    return res.status(400).json({ 
      success: false, 
      error: "All fields are required" 
    });
  }
  
  try {
    // Verify the property exists and belongs to this owner
    const [propertyCheck] = await pool.query(
      "SELECT property_id, status, owner_id, title FROM properties WHERE property_id = ?",
      [propertyId]
    );
    
    if (propertyCheck.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Property not found" 
      });
    }
    
    // Verify the property belongs to this owner
    if (propertyCheck[0].owner_id !== parseInt(owner_id)) {
      return res.status(403).json({ 
        success: false, 
        error: "This property does not belong to you" 
      });
    }
    
    // Verify property is tokenized
    if (propertyCheck[0].status !== 'Tokenized') {
      return res.status(400).json({ 
        success: false, 
        error: "Property must be tokenized before adding tenants" 
      });
    }
    
    // Format CNIC with dashes for storage
    const formattedCnic = formatCnicWithDashes(cnic);
    const cleanCnicForCheck = cnic.replace(/\D/g, "");
    
    // Check if tenant with same CNIC already exists
    const [existingTenant] = await pool.query(
      "SELECT tenant_id FROM tenants WHERE REPLACE(cnic, '-', '') = ?",
      [cleanCnicForCheck]
    );
    
    if (existingTenant.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "A tenant with this CNIC already exists" 
      });
    }
    
    // Check if user with this email already exists
    const [existingUser] = await pool.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "A user with this email already exists" 
      });
    }
    
    // Check if user with this CNIC already exists
    const [existingUserByCnic] = await pool.query(
      "SELECT user_id FROM users WHERE REPLACE(cnic, '-', '') = ?",
      [cleanCnicForCheck]
    );
    
    if (existingUserByCnic.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: "A user with this CNIC already exists" 
      });
    }
    
    // Generate random password
    const generatedPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    
    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 1. Create user account for tenant with formatted CNIC (with dashes)
      const [userResult] = await connection.query(
        `INSERT INTO users (full_name, email, cnic, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, 'TENANT', NOW())`,
        [fullName, email, formattedCnic, hashedPassword]
      );
      
      const userId = userResult.insertId;
      console.log("User account created with ID:", userId);
      console.log("CNIC stored with dashes:", formattedCnic);
      
      // 2. Insert tenant record with formatted CNIC
      const [result] = await connection.query(
        `INSERT INTO tenants (
          owner_id, property_id, full_name, email, cnic, phone, 
          monthly_rent, lease_start, lease_end, user_id, kyc_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [owner_id, propertyId, fullName, email, formattedCnic, phone, monthlyRent, leaseStart, leaseEnd, userId]
      );
      
      await connection.commit();
      
      console.log("Tenant added successfully, ID:", result.insertId);
      console.log("Generated password:", generatedPassword);
      
      // 3. Send email with credentials (using formatted CNIC)
      await sendTenantCredentials(email, fullName, formattedCnic, generatedPassword);
      
      res.json({ 
        success: true, 
        message: "Tenant added successfully! Login credentials sent to tenant email.",
        tenant_id: result.insertId,
        user_id: userId
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error("Error adding tenant:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET /api/tenants - Get all tenants for an owner
// ============================================
router.get("/", async (req, res) => {
  const { owner_id } = req.query;
  
  if (!owner_id) {
    return res.status(400).json({ 
      success: false, 
      error: "owner_id is required" 
    });
  }
  
  try {
    const [tenants] = await pool.query(`
      SELECT 
        t.tenant_id,
        t.owner_id,
        t.property_id,
        t.full_name,
        t.email,
        t.cnic,
        t.phone,
        t.monthly_rent,
        DATE(t.lease_start) as lease_start,
        DATE(t.lease_end) as lease_end,
        t.kyc_status,
        t.created_at,
        t.user_id,
        p.title as property_title,
        p.address as property_address,
        p.status as property_status
      FROM tenants t
      JOIN properties p ON t.property_id = p.property_id
      WHERE t.owner_id = ?
      ORDER BY t.created_at DESC
    `, [owner_id]);
    
    res.json({ 
      success: true, 
      tenants: tenants 
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET /api/tenants/tenant/:userId - Get tenant by user_id
// ============================================
router.get("/tenant/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const [tenants] = await pool.query(`
      SELECT 
        t.*,
        p.title as property_title,
        p.address as property_address,
        p.value as property_value,
        u.full_name as owner_name,
        u.email as owner_email
      FROM tenants t
      JOIN properties p ON t.property_id = p.property_id
      JOIN users u ON t.owner_id = u.user_id
      WHERE t.user_id = ?
    `, [userId]);
    
    if (tenants.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Tenant not found for this user" 
      });
    }
    
    res.json({ 
      success: true, 
      tenant: tenants[0] 
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// GET /api/tenants/:id - Get single tenant by ID
// ============================================
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  
  try {
    const [tenants] = await pool.query(`
      SELECT 
        t.*,
        p.title as property_title,
        p.address as property_address
      FROM tenants t
      JOIN properties p ON t.property_id = p.property_id
      WHERE t.tenant_id = ?
    `, [id]);
    
    if (tenants.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "Tenant not found" 
      });
    }
    
    res.json({ 
      success: true, 
      tenant: tenants[0] 
    });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});


// --------------------
// Extend Lease (Same Tenant) — DB-only, no blockchain
// Only allowed once the current lease has actually ended
// --------------------
router.put("/:tenantId/extend-lease", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { owner_id, new_lease_end } = req.body;

    if (!owner_id || !new_lease_end) {
      return res.status(400).json({ success: false, error: "owner_id and new_lease_end are required" });
    }

    const [rows] = await pool.query(
      "SELECT * FROM tenants WHERE tenant_id = ? AND owner_id = ?",
      [tenantId, owner_id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Tenant not found" });
    }

    const tenant = rows[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(tenant.lease_end) >= today) {
      return res.status(400).json({
        success: false,
        error: "Lease has not ended yet. You can only extend after the current lease end date."
      });
    }

    if (new Date(new_lease_end) <= today) {
      return res.status(400).json({ success: false, error: "New lease end date must be in the future" });
    }

    await pool.query(
      "UPDATE tenants SET lease_start = ?, lease_end = ?, updated_at = NOW() WHERE tenant_id = ?",
      [tenant.lease_end, new_lease_end, tenantId]
    );

    res.json({ success: true, message: "Lease extended successfully" });
  } catch (err) {
    console.error("Extend lease error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;