import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ isOpen, sidebarRef }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/admin/orders', label: 'View Orders', icon: '🛍️' },
    { path: '/admin/products', label: 'Manage Products', icon: '📦' },
    { path: '/admin/pricing', label: 'Manage Pricing', icon: '💰' },
    { path: '/admin/discount', label: 'Manage Discount', icon: '🏷️' },
    { path: '/admin/category-images', label: 'Manage Category Images', icon: '🖼️' },
    { path: '/admin/refunds', label: 'Handle Refunds', icon: '↩️' },
    { path: '/admin/reports', label: 'Generate Reports', icon: '📈' },
  ];

  return (
    <aside ref={sidebarRef} className={`admin-sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h2>evermore Admin</h2>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.path}
            className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
