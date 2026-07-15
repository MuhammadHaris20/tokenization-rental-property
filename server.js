// server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth");
const contactRoutes = require("./routes/contact");
const kycRoutes = require("./routes/kyc");
const propertyRoutes = require("./routes/property");
const userRoutes = require("./routes/user");
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Serve property documents
app.use("/uploads/property-documents", express.static("uploads/property-documents"));

// Middleware
app.use(cors({
  origin: "http://localhost:3000", //
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/user", userRoutes);
app.use('/api/notifications', notificationRoutes); // 

// For Profile Pictures
app.use("/uploads/profile-pictures", express.static("uploads/profile-pictures"));

// Health Check
app.get("/", (req, res) => {
  res.json({ message: "Backend running successfully ✅" });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.url} not found` 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    success: false, 
    message: "Internal server error" 
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
