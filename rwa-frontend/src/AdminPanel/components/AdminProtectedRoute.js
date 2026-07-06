// src/AdminPanel/components/AdminProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Allow access only if authenticated AND role is ADMIN
  if (!isAuthenticated || userRole !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminProtectedRoute;