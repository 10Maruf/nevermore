import React, { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './navbar.css'

export default function Navbar({ navigate: legacyNavigate }) {
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(null)
  const [isFooterVisible, setIsFooterVisible] = useState(false)
  const mobileMenuRef = useRef(null)
  const hamburgerRef = useRef(null)
  const routerLocation = useLocation()
  
  // Prefer router navigate, but fall back to legacy navigate prop if provided
  const routerNavigate = useNavigate()
  const navigate = (to) => {
    if (legacyNavigate) return legacyNavigate(to)
    const normalized = to === 'home' ? '/' : to.startsWith('/') ? to : `/${to}`
    routerNavigate(normalized)
  }

  // Footer visibility detection
  useEffect(() => {
    const footer = document.querySelector('.footer')
    if (!footer) return

    const isSmallScreen = window.innerWidth <= 1280
    const threshold = isSmallScreen ? 0.01 : 0.95

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting)
      },
      { threshold }
    )

    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  // Helper to determine icon color based on screen size and footer visibility
  const getIconColor = () => {
    // Home page has a dark hero on mobile; other pages are mostly light.
    // Keep home behavior, but make non-home icons visible (black) on mobile.
    const isHome = routerLocation?.pathname === '/'
    if (!isHome) return 'black'

    const isSmallScreen = window.innerWidth <= 1280
    if (isSmallScreen) {
      return isFooterVisible ? 'black' : 'white'
    }
    return 'black' // Desktop always black
  }

  const isHome = routerLocation?.pathname === '/'
  const isSmallScreen = window.innerWidth <= 1280
  const isHomeDarkMobile = isHome && isSmallScreen && !isFooterVisible

  // Click outside to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) &&
          hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setMobileMenuOpen(false)
        setMobileSubmenuOpen(null)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [mobileMenuOpen])

  const handleProfileClick = () => {
    // Always go to profile; ProtectedRoute will redirect to /login if needed and back after login
    navigate('profile')
  }

  const handleLogoClick = () => {
    navigate('home')
  }

  const handleNavClick = (route) => {
    setDropdownOpen(null)
    setMobileMenuOpen(false)
    setMobileSubmenuOpen(null)
    navigate(route)
  }

  const toggleMobileSubmenu = (menu) => {
    setMobileSubmenuOpen(mobileSubmenuOpen === menu ? null : menu)
  }

  return (
    <>
      <header className={`header-bar ${isFooterVisible ? 'footer-nav-black' : ''} ${isHomeDarkMobile ? 'home-dark-mobile' : ''}`}>
        <div className="header-content">
          {/* Mobile left actions (hamburger only) */}
          <div className="mobile-left-actions">
            <button 
              ref={hamburgerRef}
              className="mobile-menu-btn" 
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen)
                setMobileSubmenuOpen(null)
              }}
              aria-label="Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getIconColor()} strokeWidth="2.5">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
          {/* Navigation Menu */}
          <div className="nav-menu-bar">
            <div 
              className="nav-item-bar" 
              onMouseEnter={() => setDropdownOpen('men')} 
              onMouseLeave={() => setDropdownOpen(null)}
            >
              <button className="nav-link-bar" onClick={() => handleNavClick('men/new-arrival')}>Men</button>
              {dropdownOpen === 'men' && (
                <div className="dropdown-bar">
                  <button onClick={() => handleNavClick('men/new-arrival')}>NEW ARRIVAL</button>
                  <button onClick={() => handleNavClick('men/tees')}>TEES</button>
                  <button onClick={() => handleNavClick('men/hoodies')}>HOODIES</button>
                  <button onClick={() => handleNavClick('men/sweatshirts')}>SWEATSHIRTS</button>
                  <button onClick={() => handleNavClick('men/tanktops')}>TANK TOPS</button>
                  <button onClick={() => handleNavClick('men/shorts')}>SHORTS</button>
                  <button onClick={() => handleNavClick('men/joggers')}>JOGGERS</button>
                  <button onClick={() => handleNavClick('men/polo-shirt')}>POLO SHIRT</button>
                  <button onClick={() => handleNavClick('men/windbreaker')}>WINDBREAKER</button>
                </div>
              )}
            </div>

            <div 
              className="nav-item-bar" 
              onMouseEnter={() => setDropdownOpen('women')} 
              onMouseLeave={() => setDropdownOpen(null)}
            >
              <button className="nav-link-bar" onClick={() => handleNavClick('women/new-arrival')}>Women</button>
              {dropdownOpen === 'women' && (
                <div className="dropdown-bar">
                  <button onClick={() => handleNavClick('women/new-arrival')}>NEW ARRIVAL</button>
                  <button onClick={() => handleNavClick('women/tees')}>TEES</button>
                  <button onClick={() => handleNavClick('women/hoodies')}>HOODIES</button>
                  <button onClick={() => handleNavClick('women/sweatshirts')}>SWEATSHIRTS</button>
                  <button onClick={() => handleNavClick('women/tanktops')}>TANK TOPS</button>
                  <button onClick={() => handleNavClick('women/shorts')}>SHORTS</button>
                  <button onClick={() => handleNavClick('women/joggers')}>JOGGERS</button>
                  <button onClick={() => handleNavClick('women/polo-shirt')}>POLO SHIRT</button>
                  <button onClick={() => handleNavClick('women/windbreaker')}>WINDBREAKER</button>
                </div>
              )}
            </div>

            <div 
              className="nav-item-bar" 
              onMouseEnter={() => setDropdownOpen('accessories')} 
              onMouseLeave={() => setDropdownOpen(null)}
            >
              <button className="nav-link-bar" onClick={() => handleNavClick('accessories/new-arrival')}>Accessories</button>
              {dropdownOpen === 'accessories' && (
                <div className="dropdown-bar">
                  <button onClick={() => handleNavClick('accessories/new-arrival')}>NEW ARRIVAL</button>
                  <button onClick={() => handleNavClick('accessories/tote')}>TOTE BAG</button>
                  <button onClick={() => handleNavClick('accessories/cap')}>CAPS</button>
                  <button onClick={() => handleNavClick('accessories/wallet')}>WALLETS</button>
                  <button onClick={() => handleNavClick('accessories/backpack')}>BACKPACK</button>
                  <button onClick={() => handleNavClick('accessories/home-decor')}>HOME & DECOR</button>
                </div>
              )}
            </div>
            
            <div className="nav-item-bar">
              <button className="nav-link-bar" onClick={() => handleNavClick('custom-design')}>Custom Design</button>
            </div>
          </div>

          <div className="header-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
            <img src="/assets/images/logo.png" alt="Logo" className="nav-logo" />
          </div>
          
          <div className="nav-icons-bar">
            <button className="icon-btn navbar-search-icon" onClick={() => handleNavClick('search')} aria-label="Search">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getIconColor()} strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button className="icon-btn navbar-heart-icon" onClick={() => navigate('wishlist')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getIconColor()} strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button className="icon-btn navbar-person-icon" onClick={handleProfileClick}>
              <svg width="31" height="30" viewBox="0 0 31 30" fill="none" stroke={getIconColor()} strokeWidth="2.5">
                <path d="M15.5 15c2.485 0 4.5-2.015 4.5-4.5S17.985 6 15.5 6s-4.5 2.015-4.5 4.5 2.015 4.5 4.5 4.5zm0 2.25c-4.142 0-7.5 3.358-7.5 7.5v3.75h15v-3.75c0-4.142-3.358-7.5-7.5-7.5z"/>
              </svg>
            </button>
            <button className="icon-btn navbar-bag-icon" onClick={() => navigate('cart')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={getIconColor()} strokeWidth="2.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </button>
          </div>
      </div>
    </header>

    {/* Mobile Menu Dropdown */}
    {mobileMenuOpen && (
      <div className="mobile-menu-dropdown" ref={mobileMenuRef}>
        <button className="mobile-menu-item" onClick={() => toggleMobileSubmenu('men')}>
          <span>Men</span>
          <span className="submenu-arrow">{mobileSubmenuOpen === 'men' ? '▼' : '▶'}</span>
        </button>
        {mobileSubmenuOpen === 'men' && (
          <div className="mobile-submenu">
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/new-arrival')}>NEW ARRIVAL</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/tees')}>TEES</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/hoodies')}>HOODIES</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/sweatshirts')}>SWEATSHIRTS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/tanktops')}>TANK TOPS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/shorts')}>SHORTS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/joggers')}>JOGGERS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/polo-shirt')}>POLO SHIRT</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('men/windbreaker')}>WINDBREAKER</button>
          </div>
        )}

        <button className="mobile-menu-item" onClick={() => toggleMobileSubmenu('women')}>
          <span>Women</span>
          <span className="submenu-arrow">{mobileSubmenuOpen === 'women' ? '▼' : '▶'}</span>
        </button>
        {mobileSubmenuOpen === 'women' && (
          <div className="mobile-submenu">
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/new-arrival')}>NEW ARRIVAL</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/tees')}>TEES</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/hoodies')}>HOODIES</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/sweatshirts')}>SWEATSHIRTS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/tanktops')}>TANK TOPS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/shorts')}>SHORTS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/joggers')}>JOGGERS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/polo-shirt')}>POLO SHIRT</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('women/windbreaker')}>WINDBREAKER</button>
          </div>
        )}

        <button className="mobile-menu-item" onClick={() => toggleMobileSubmenu('accessories')}>
          <span>Accessories</span>
          <span className="submenu-arrow">{mobileSubmenuOpen === 'accessories' ? '▼' : '▶'}</span>
        </button>
        {mobileSubmenuOpen === 'accessories' && (
          <div className="mobile-submenu">
            <button className="mobile-menu-item" onClick={() => handleNavClick('accessories/new-arrival')}>NEW ARRIVAL</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('accessories/tote')}>TOTE BAG</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('accessories/cap')}>CAPS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('accessories/wallet')}>WALLETS</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('accessories/backpack')}>BACKPACK</button>
            <button className="mobile-menu-item" onClick={() => handleNavClick('accessories/home-decor')}>HOME & DECOR</button>
          </div>
        )}

        <button className="mobile-menu-item" onClick={() => handleNavClick('custom-design')}>
          Custom Design
        </button>
      </div>
    )}
    </>
  )
}
