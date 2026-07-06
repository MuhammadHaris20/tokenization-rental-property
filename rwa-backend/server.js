const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contact");
const kycRoutes = require("./routes/kyc");
const propertyRoutes = require("./routes/property");
const userRoutes = require("./routes/user");
const tenantRoutes = require("./routes/tenant");

const app = express();

// Middleware

app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static file serving – absolute path
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/rentals", require("./routes/rentals"));
// API routes
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/user", userRoutes);
app.use("/api/tenants", tenantRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Backend running successfully ✅" });
});

// 404 handler (must be after all valid routes)
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads root: http://localhost:${PORT}/uploads/`);
});