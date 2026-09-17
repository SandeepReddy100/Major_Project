import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorPage from './ErrorPage'; 

const ProtectedRoute = ({ allowedRoles, requiredRole }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 1. Not logged in? -> Kick to Login Page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Determine allowed roles
  const roles = allowedRoles || (requiredRole ? [requiredRole] : []);
  
  // 3. Check if current user has permission
  if (roles.length > 0 && !roles.includes(user.role)) {
    
    // 4. Unauthorized? -> SHOW 404 NOT FOUND (Security Best Practice)
    // We pretend the page doesn't exist so they don't try to hack it.
    return (
      <ErrorPage 
        type="notfound" 
        onRetry={() => {
            // "Go Back Home" button redirects to their proper dashboard
            const dashboardMap = {
                student: '/student/dashboard',
                faculty: '/faculty/dashboard',
                admin: '/admin/dashboard'
            };
            navigate(dashboardMap[user.role] || '/');
        }} 
      />
    );
  }

  // 5. Authorized? -> Render the page
  return <Outlet />;
};

export default ProtectedRoute;