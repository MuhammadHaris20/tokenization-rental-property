import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./UserPanel/components/ProtectedRoute";
import AdminProtectedRoute from "./AdminPanel/components/AdminProtectedRoute";

// USER PAGES
import LoginPage from "./UserPanel/pages/LoginPage";
import RegisterPage from "./UserPanel/pages/RegisterPage";
import ForgotPasswordPage from "./UserPanel/pages/ForgotPasswordPage";
import ResetPasswordPage from "./UserPanel/pages/ResetPasswordPage";
import Dashboard from "./UserPanel/pages/Dashboard";
import Home from "./UserPanel/pages/Home";
import Blog from "./UserPanel/pages/Blog";
import About from "./UserPanel/pages/About";
import Marketplace from "./UserPanel/pages/Marketplace";

// ADMIN PAGES
import AdminPage from "./AdminPanel/pages/AdminPage";
import AdminKYC from "./AdminPanel/pages/AdminKYC";
import AdminTokenizationRequests from "./AdminPanel/pages/AdminTokenizationRequests";
import LegalCompliance from "./AdminPanel/pages/LegalCompliance";
import ViewListings from "./AdminPanel/pages/ViewListings";
import ManageRentalInfo from "./AdminPanel/pages/ManageRentalInfo";
import ManagePropertyData from "./AdminPanel/pages/ManagePropertyData";

// COMPONENTS
import Navbar from "./UserPanel/components/navbar";
import AdminLayout from "./AdminPanel/components/AdminLayout";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ================= AUTH PAGES (Public) ================= */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* ================= USER PAGES (Protected) ================= */}
        <Route path="/home" element={
          <ProtectedRoute>
            <><Navbar /><Home /></>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/blog" element={
          <ProtectedRoute>
            <><Navbar /><Blog /></>
          </ProtectedRoute>
        } />
        <Route path="/about" element={
          <ProtectedRoute>
            <><Navbar /><About /></>
          </ProtectedRoute>
        } />
        <Route path="/marketplace" element={
          <ProtectedRoute>
            <><Navbar /><Marketplace /></>
          </ProtectedRoute>
        } />

        {/* ================= ADMIN PAGES (Admin Protected) ================= */}
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <AdminLayout><AdminPage /></AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="/admin/kyc" element={
          <AdminProtectedRoute>
            <AdminLayout><AdminKYC /></AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="/admin/tokenization/requests" element={
          <AdminProtectedRoute>
            <AdminLayout><AdminTokenizationRequests /></AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="/admin/compliance" element={
          <AdminProtectedRoute>
            <AdminLayout><LegalCompliance /></AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="/admin/listings/all" element={
          <AdminProtectedRoute>
            <AdminLayout><ViewListings /></AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="/admin/rentals" element={
          <AdminProtectedRoute>
            <AdminLayout><ManageRentalInfo /></AdminLayout>
          </AdminProtectedRoute>
        } />
        <Route path="/admin/properties" element={
          <AdminProtectedRoute>
            <AdminLayout><ManagePropertyData /></AdminLayout>
          </AdminProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;