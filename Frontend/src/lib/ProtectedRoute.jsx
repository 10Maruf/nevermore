import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

// Simple protected route that checks localStorage 'isLoggedIn'
export default function ProtectedRoute(){
  const location = useLocation()
  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn){
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
