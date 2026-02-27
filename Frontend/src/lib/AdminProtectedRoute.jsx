import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const adminToken = localStorage.getItem('adminAuthToken');
  
  if (!isAdmin || !adminToken) {
    // Redirect to login if not admin
    return <Navigate to="/login" replace />;
  }

  // If children is provided, render it; otherwise render Outlet for nested routes
  return children || <Outlet />;
};

export default AdminProtectedRoute;
