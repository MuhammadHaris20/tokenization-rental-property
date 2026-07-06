const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

// ==================== SEND RENT REMINDERS (all tenants of owner) ====================
router.post("/send-reminders", async (req, res) => {
  const { ownerId } = req.body;
  try {
    const [tenants] = await pool.query(
      `SELECT t.*, p.title as property_title 
       FROM tenants t 
       JOIN properties p ON t.property_id = p.property_id 
       WHERE t.owner_id = ?`,
      [ownerId]
    );

    const monthYear = new Date().toISOString().slice(0, 7);
    let sentCount = 0;

    for (const tenant of tenants) {
      const [paid] = await pool.query(
        "SELECT payment_id FROM rent_payments WHERE tenant_user_id = ? AND month_year = ?",
        [tenant.user_id, monthYear]
      );
      if (paid.length > 0) continue; // skip if already paid

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: tenant.email,
        subject: `Rent Reminder — Due by 10th ${new Date().toLocaleString("en-PK", { month: "long", year: "numeric" })}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#0A2FFF;">Rent Payment Reminder</h2>
            <p>Dear <strong>${tenant.full_name}</strong>,</p>
            <p>This is a reminder that your monthly rent is due by <strong>10th of this month</strong>.</p>
            <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin:20px 0;">
              <p><strong>Property:</strong> ${tenant.property_title}</p>
              <p><strong>Monthly Rent:</strong> PKR ${Number(tenant.monthly_rent).toLocaleString()}</p>
              <p><strong>Due Date:</strong> 10th ${new Date().toLocaleString("en-PK", { month: "long", year: "numeric" })}</p>
            </div>
            <p>Please log in to your dashboard and pay via the <strong>Pay Rent</strong> tab.</p>
            <a href="http://localhost:3000/" style="background:#0A2FFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
              Pay Rent Now
            </a>
          </div>
        `,
      });
      sentCount++;
    }

    res.json({ success: true, sentCount });
  } catch (err) {
    console.error("Send reminders error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================== SEND SINGLE REMINDER ====================
router.post("/send-single-reminder", async (req, res) => {
  const { tenantId } = req.body;
  try {
    const [rows] = await pool.query(
      `SELECT t.*, p.title as property_title 
       FROM tenants t 
       JOIN properties p ON t.property_id = p.property_id 
       WHERE t.tenant_id = ?`,
      [tenantId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Tenant not found" });

    const tenant = rows[0];
    const monthYear = new Date().toISOString().slice(0, 7);

    const [paid] = await pool.query(
      "SELECT payment_id FROM rent_payments WHERE tenant_user_id = ? AND month_year = ?",
      [tenant.user_id, monthYear]
    );
    if (paid.length > 0) {
      return res.json({ success: false, error: "Tenant has already paid rent this month" });
    }

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: tenant.email,
      subject: `Rent Reminder — Due by 10th ${new Date().toLocaleString("en-PK", { month: "long", year: "numeric" })}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#0A2FFF;">Rent Payment Reminder</h2>
          <p>Dear <strong>${tenant.full_name}</strong>,</p>
          <p>Your monthly rent of <strong>PKR ${Number(tenant.monthly_rent).toLocaleString()}</strong> 
          for <strong>${tenant.property_title}</strong> is due by the <strong>10th of this month</strong>.</p>
          <a href="http://localhost:3000/" style="background:#0A2FFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
            Pay Rent Now
          </a>
        </div>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;