import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const sidebarRef = useRef(null);
  console.log('AdminLayout rendering')

  const handleLogout = () => {
    // Clear admin session
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  // Close sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && 
          !event.target.closest('.admin-mobile-hamburger')) {
        setMobileSidebarOpen(false);
      }
    }

    if (mobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mobileSidebarOpen]);

  return (
    <div className="admin-layout">
      <Sidebar isOpen={mobileSidebarOpen} sidebarRef={sidebarRef} />
      <div className="admin-content">
        <header className="admin-header">
          {/* Mobile hamburger button */}
          <button 
            className="admin-mobile-hamburger"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            aria-label="Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </header>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
