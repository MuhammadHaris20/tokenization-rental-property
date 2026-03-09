import { Routes, Route } from "react-router-dom";

// USER PAGES
import LoginPage from "./UserPanel/pages/LoginPage";
import RegisterPage from "./UserPanel/pages/RegisterPage";
import ForgotPasswordPage from "./UserPanel/pages/ForgotPasswordPage";
import ResetPasswordPage from "./UserPanel/pages/ResetPasswordPage";
import Dashboard from "./UserPanel/pages/Dashboard";
import Home from "./UserPanel/pages/Home";
import Blog from "./UserPanel/pages/Blog";
import About from "./UserPanel/pages/About";

// ADMIN PAGES
import AdminPage from "./AdminPanel/pages/AdminPage";
import AdminKYC from "./AdminPanel/pages/AdminKYC";

// COMPONENTS
import Navbar from "./UserPanel/components/navbar";
import AdminLayout from "./AdminPanel/components/AdminLayout";

import "./App.css";

function App() {
  return (
    <Routes>

      {/* AUTH */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      {/* USER */}
      <Route
        path="/home"
        element={
          <>
            <Navbar />
            <Home />
          </>
        }
      />

      <Route
        path="/dashboard"
        element={
          <>
            <Dashboard />
          </>
        }
      />

      <Route
        path="/blog"
        element={
          <>
            <Navbar />
            <Blog />
          </>
        }
      />

      <Route
        path="/about"
        element={
          <>
            <Navbar />
            <About />
          </>
        }
      />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <AdminLayout>
            <AdminPage />
          </AdminLayout>
        }
      />

      <Route
        path="/admin/kyc"
        element={
          <AdminLayout>
            <AdminKYC />
          </AdminLayout>
        }
      />

    </Routes>
  );
}

export default App;