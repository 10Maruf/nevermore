import React, { useEffect, useRef, useState } from 'react'
import './homepage.css'

export default function Homepage({ navigate }) {
  const containerRef = useRef(null)
  const [open, setOpen] = useState(null)
  const [isFooterVisible, setIsFooterVisible] = useState(false)

  // Detect when footer is in view to change nav colors
  useEffect(() => {
    const footer = document.querySelector('.footer')
    if (!footer) return

    let animationFrameId = null

    // Mobile: Continuously check position using requestAnimationFrame
    const checkMobilePosition = () => {
      const isSmallScreen = window.innerWidth <= 1280
      if (isSmallScreen) {
        const footerRect = footer.getBoundingClientRect()
        // Turn black when footer top reaches within 80px from top (header height)
        const shouldBeBlack = footerRect.top <= 50
        setIsFooterVisible(shouldBeBlack)
      }
      animationFrameId = requestAnimationFrame(checkMobilePosition)
    }

    // Desktop: High threshold (footer mostly in view)
    const observerDesktop = new IntersectionObserver(
      ([entry]) => {
        const isLargeScreen = window.innerWidth > 1280
        if (isLargeScreen) {
          setIsFooterVisible(entry.isIntersecting)
        }
      },
      { threshold: 0.95 }
    )

    observerDesktop.observe(footer)
    
    // Start continuous checking for mobile
    checkMobilePosition()
    
    return () => {
      observerDesktop.disconnect()
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  // --- Cart state (demo) ---
  const [cartItems, setCartItems] = useState([
    { id: 'p1', title: 'CLUB AMIRI CAMP SHIRT', img: '/assets/images/06462400519-e1.jpg', price: 124200, qty: 3, color: 'BLACK', size: 'X-LARGE' },
    { id: 'p2', title: `WOMEN'S EAGLE RINGER TEE`, img: '/assets/images/06462400519-e2.jpg', price: 49000, qty: 1, color: 'BLACK', size: 'MEDIUM' }
  ])

  function increment(id) {
    setCartItems(items => items.map(it => it.id === id ? { ...it, qty: it.qty + 1 } : it))
    setOpen('cart')
  }
  function decrement(id) {
    setCartItems(items => items.map(it => it.id === id ? { ...it, qty: Math.max(0, it.qty - 1) } : it))
    setOpen('cart')
  }

  const subtotal = cartItems.reduce((s, it) => s + it.price * it.qty, 0)
  function formatNumber(n) { return n.toLocaleString('en-US') }

  // Header subcomponent: handles dropdowns and search panel
  function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [mobileSubmenuOpen, setMobileSubmenuOpen] = useState(null)
    const mobileMenuRef = useRef(null)
    const hamburgerRef = useRef(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [clickedOpen, setClickedOpen] = useState(false)
    const dropdownRef = useRef(null)

    function openMenu(key) {
      setOpen(prev => (prev === key ? null : key))
      setClickedOpen(prev => !prev)
    }

    function goto(route) {
      setOpen(null)
      setMobileMenuOpen(false)
      setMobileSubmenuOpen(null)
      navigate(route)
    }

    function submitSearch() {
      const q = searchQuery.trim()
      if (!q) return
      setOpen(null)
      setMobileMenuOpen(false)
      setMobileSubmenuOpen(null)
      navigate('/search', { state: { q } })
    }

    function toggleMobileSubmenu(menu) {
      setMobileSubmenuOpen(mobileSubmenuOpen === menu ? null : menu)
    }

    // Close mobile menu when clicking outside
    useEffect(() => {
      function handleClickOutside(event) {
        if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && 
            hamburgerRef.current && !hamburgerRef.current.contains(event.target) && 
            mobileMenuOpen) {
          setMobileMenuOpen(false)
          setMobileSubmenuOpen(null)
        }
        // Close dropdown if clicked outside and it was opened by click
        if (dropdownRef.current && !dropdownRef.current.contains(event.target) && clickedOpen && open) {
          setOpen(null)
          setClickedOpen(false)
        }
      }

      if (mobileMenuOpen || (clickedOpen && open)) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [mobileMenuOpen, clickedOpen, open])

    return (
      <header className={`header ${isFooterVisible ? 'footer-nav-black' : ''}`}>
        <nav className="nav">
          {/* Mobile hamburger button */}
          <button 
            ref={hamburgerRef}
            className="homepage-mobile-hamburger" 
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen)
              setMobileSubmenuOpen(null)
            }}
            aria-label="Menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFooterVisible ? 'black' : 'white'} strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <div className="nav-menu">
<div 
  className="nav-item" 
  onMouseEnter={() => !clickedOpen && setOpen('men')} 
  onMouseLeave={() => !clickedOpen && setOpen(null)}
  ref={open === 'men' ? dropdownRef : null}
>
  <button className="nav-link" onClick={() => navigate('men/new-arrival')}>Men</button>
  {open === 'men' && (
    <div className="dropdown">
      <button onClick={() => navigate('men/new-arrival')}>NEW ARRIVAL</button>
      <button onClick={() => navigate('men/tees')}>TEES</button>
      <button onClick={() => navigate('men/hoodies')}>HOODIES</button>
      <button onClick={() => navigate('men/sweatshirts')}>SWEATSHIRTS</button>
      <button onClick={() => navigate('men/tanktops')}>TANK TOPS</button>
      <button onClick={() => navigate('men/shorts')}>SHORTS</button>
      <button onClick={() => navigate('men/joggers')}>JOGGERS</button>
      <button onClick={() => navigate('men/polo-shirt')}>POLO SHIRT</button>
      <button onClick={() => navigate('men/windbreaker')}>WINDBREAKER</button>
    </div>
  )}
</div>


<div 
  className="nav-item" 
  onMouseEnter={() => !clickedOpen && setOpen('women')} 
  onMouseLeave={() => !clickedOpen && setOpen(null)}
  ref={open === 'women' ? dropdownRef : null}
>
  <button className="nav-link" onClick={() => navigate('women/new-arrival')}>Women</button>
  {open === 'women' && (
    <div className="dropdown">
      <button onClick={() => navigate('women/new-arrival')}>NEW ARRIVAL</button>
      <button onClick={() => navigate('women/tees')}>TEES</button>
      <button onClick={() => navigate('women/hoodies')}>HOODIES</button>
      <button onClick={() => navigate('women/sweatshirts')}>SWEATSHIRTS</button>
      <button onClick={() => navigate('women/tanktops')}>TANK TOPS</button>
      <button onClick={() => navigate('women/shorts')}>SHORTS</button>
      <button onClick={() => navigate('women/joggers')}>JOGGERS</button>
      <button onClick={() => navigate('women/polo-shirt')}>POLO SHIRT</button>
      <button onClick={() => navigate('women/windbreaker')}>WINDBREAKER</button>
    </div>
  )}
</div>

<div 
  className="nav-item" 
  onMouseEnter={() => !clickedOpen && setOpen('accessories')} 
  onMouseLeave={() => !clickedOpen && setOpen(null)}
  ref={open === 'accessories' ? dropdownRef : null}
>
  <button className="nav-link" onClick={() => navigate('accessories/new-arrival')}>Accessories</button>
  {open === 'accessories' && (
    <div className="dropdown">
      <button onClick={() => navigate('accessories/new-arrival')}>NEW ARRIVAL</button>
      <button onClick={() => navigate('accessories/tote')}>TOTE BAG</button>
      <button onClick={() => navigate('accessories/wallet')}>WALLET</button>
      <button onClick={() => navigate('accessories/cap')}>CAP</button>
      <button onClick={() => navigate('accessories/backpack')}>BACKPACK</button>
      <button onClick={() => navigate('accessories/home-decor')}>HOME & DECOR</button>
    </div>
  )}
</div>

            <div className="nav-item">
              <button onClick={() => goto('custom-design')} className="nav-link">Custom Design</button>
            </div>
          </div>

          <div className="logo"><h1>evermore</h1></div>

          <div className="homepage-nav-icons">
            <button className="homepage-icon-btn homepage-search-icon" aria-label="Search" onClick={() => goto('search')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isFooterVisible ? 'black' : 'white'} strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button className="homepage-icon-btn homepage-heart-icon" aria-label="Wishlist" onClick={() => goto('wishlist')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isFooterVisible ? 'black' : 'white'} strokeWidth="2.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
            <button className="homepage-icon-btn homepage-person-icon" aria-label="Account" onClick={()=>{
              const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
              navigate(loggedIn ? 'profile' : 'login')
            }}>
              <svg width="31" height="30" viewBox="0 0 31 30" fill="none" stroke={isFooterVisible ? 'black' : 'white'} strokeWidth="2.5">
                <path d="M15.5 15c2.485 0 4.5-2.015 4.5-4.5S17.985 6 15.5 6s-4.5 2.015-4.5 4.5 2.015 4.5 4.5 4.5zm0 2.25c-4.142 0-7.5 3.358-7.5 7.5v3.75h15v-3.75c0-4.142-3.358-7.5-7.5-7.5z"/>
              </svg>
            </button>
            <button className="homepage-icon-btn homepage-bag-icon" aria-label="Cart" onClick={() => goto('cart')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isFooterVisible ? 'black' : 'white'} strokeWidth="2.5">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </button>
          </div>

          {open === 'search' && (
            <div className="homepage-search-panel">
              <input
                className="homepage-search-input"
                autoFocus
                placeholder="Search products, collections..."
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitSearch()
                }}
              />
              <div className="homepage-search-actions">
                <button className="homepage-search-close-btn" onClick={() => setOpen(null)}>Close</button>
              </div>
            </div>
          )}

          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="homepage-mobile-menu" ref={mobileMenuRef}>
              {/* Men Section */}
              <button className="homepage-mobile-menu-item" onClick={() => toggleMobileSubmenu('men')}>
                MEN {mobileSubmenuOpen === 'men' ? '▼' : '▶'}
              </button>
              {mobileSubmenuOpen === 'men' && (
                <div className="homepage-mobile-submenu">
                  <button onClick={() => goto('men/new-arrival')}>NEW ARRIVAL</button>
                  <button onClick={() => goto('men/tees')}>TEES</button>
                  <button onClick={() => goto('men/hoodies')}>HOODIES</button>
                  <button onClick={() => goto('men/sweatshirts')}>SWEATSHIRTS</button>
                  <button onClick={() => goto('men/tanktops')}>TANK TOPS</button>
                  <button onClick={() => goto('men/shorts')}>SHORTS</button>
                  <button onClick={() => goto('men/joggers')}>JOGGERS</button>
                  <button onClick={() => goto('men/polo-shirt')}>POLO SHIRT</button>
                  <button onClick={() => goto('men/windbreaker')}>WINDBREAKER</button>
                </div>
              )}

              {/* Women Section */}
              <button className="homepage-mobile-menu-item" onClick={() => toggleMobileSubmenu('women')}>
                WOMEN {mobileSubmenuOpen === 'women' ? '▼' : '▶'}
              </button>
              {mobileSubmenuOpen === 'women' && (
                <div className="homepage-mobile-submenu">
                  <button onClick={() => goto('women/new-arrival')}>NEW ARRIVAL</button>
                  <button onClick={() => goto('women/tees')}>TEES</button>
                  <button onClick={() => goto('women/hoodies')}>HOODIES</button>
                  <button onClick={() => goto('women/sweatshirts')}>SWEATSHIRTS</button>
                  <button onClick={() => goto('women/tanktops')}>TANK TOPS</button>
                  <button onClick={() => goto('women/shorts')}>SHORTS</button>
                  <button onClick={() => goto('women/joggers')}>JOGGERS</button>
                  <button onClick={() => goto('women/polo-shirt')}>POLO SHIRT</button>
                  <button onClick={() => goto('women/windbreaker')}>WINDBREAKER</button>
                </div>
              )}

              {/* Accessories Section */}
              <button className="homepage-mobile-menu-item" onClick={() => toggleMobileSubmenu('accessories')}>
                ACCESSORIES {mobileSubmenuOpen === 'accessories' ? '▼' : '▶'}
              </button>
              {mobileSubmenuOpen === 'accessories' && (
                <div className="homepage-mobile-submenu">
                  <button onClick={() => goto('accessories/new-arrival')}>NEW ARRIVAL</button>
                  <button onClick={() => goto('accessories/tote')}>TOTE BAG</button>
                  <button onClick={() => goto('accessories/wallet')}>WALLET</button>
                  <button onClick={() => goto('accessories/cap')}>CAP</button>
                  <button onClick={() => goto('accessories/backpack')}>BACKPACK</button>
                  <button onClick={() => goto('accessories/home-decor')}>HOME & DECOR</button>
                </div>
              )}

              {/* Custom Design */}
              <button className="homepage-mobile-menu-item" onClick={() => goto('custom-design')}>
                CUSTOM DESIGN
              </button>
            </div>
          )}
          
        </nav>
      </header>
    )
  }

  return (
    <div className="page-container" ref={containerRef}>
      <Header />

      <section className="hero section">
        <div className="hero-background">
          <img src="/assets/images/hp.png" alt="Hero Background" className="hero-bg-image" />
        </div>
        <div className="hero-content">
          <p className="hero-title">THE PREMIUM</p>
          <h2 className="hero-subtitle">READY TO WEAR</h2>
        <div className="hero-buttons">
          <button className="cta-button shop-now" onClick={() => navigate('shop_category')}>Shop Now</button>
          <button className="cta-button custom-design" onClick={() => navigate('custom-design')}>Custom Design</button>
       </div>
        </div>
      </section>

      <section className="new-arrivals section">
        <div className="arrivals-container">
          <div className="split-half women-section">
            <div className="section-overlay">
              <button className="section-button" onClick={() => navigate('men/new-arrival')}>MEN'S NEW ARRIVAL</button>
            </div>
          </div>
          <div className="split-half men-section">
            <div className="section-overlay">
              <button className="section-button" onClick={() => navigate('women/new-arrival')}>WOMEN'S NEW ARRIVAL</button>
            </div>
          </div>
        </div>
      </section>

      <section className="product-grid-2x2 section">
        <div className="grid-main">
          <div className="tile tote-bag-tile">
            <button className="tile-btn" onClick={() => navigate && navigate('accessories/tote')}>TOTE BAGS</button>
          </div>
          <div className="tile wallet-tile">
            <button className="tile-btn" onClick={() => navigate && navigate('accessories/wallet')}>WALLETS</button>
          </div>
          <div className="tile caps-tile">
            <button className="tile-btn" onClick={() => navigate && navigate('accessories/cap')}>CAPS</button>
          </div>
        </div>
      </section>

      <section className="custom-section section">
        <div className="arrivals-container">
          <div className="split-half custom-left">
            <div className="custom-overlay">
              <h2 className="custom-title">CUSTOMIZE YOUR APPARELS,<br /><span className="custom-emph">YOUR WAY.</span></h2>
              <p className="custom-desc">Experience a personalized fashion journey with <b>evermore</b>, where you can create your unique, eye-catching t-shirts, tank-top, hoodies, shorts, jogger and many more in our online design studio.</p>
              <button className="custom-button" onClick={() => navigate('custom-design')}>TRY IT NOW</button>
            </div>
          </div>
          <div className="split-half custom-right"></div>
        </div>
      </section>

      <footer className="footer section">
        <div className="footer-inner">
          <div className="footer-logo left">
            <img 
              src="/assets/images/logo.png" 
              alt="logo" 
              onClick={() => goTo(0)}
              style={{cursor: 'pointer'}}
            />
          </div>

          <div className="footer-columns">
            <div className="col">
              <h5>COMPANY</h5>
              <ul>
                <li>ABOUT</li>
                <li>CAREERS</li>
                <li>REVIEWS</li>
                <li>SHIPPING</li>
                <li>RETURNS</li>
              </ul>
            </div>
            <div className="col">
              <h5>CLIENT SERVICES</h5>
              <ul>
                <li>SUPPORT</li>
                <li>TRACK ORDER</li>
                <li>MAKE A RETURN</li>
              </ul>
            </div>
            <div className="col">
              <h5>SOCIAL</h5>
              <ul>
                <li>FACEBOOK</li>
                <li>INSTAGRAM</li>
                <li>TIKTOK</li>
                <li>YOUTUBE</li>
                <li>X</li>
              </ul>
            </div>
            <div className="col">
              <h5>COUNTRY</h5>
              <ul>
                <li>ITALY</li>
                <li>FRANCE</li>
                <li>UK</li>
                <li>USA</li>
                <li>CANADA</li>
                <li>UAE</li>
                <li>BANGLADESH</li>
              </ul>
            </div>
          </div>

          <div className="footer-logo right">
            <img 
              src="/assets/images/logo.png" 
              alt="logo" 
              onClick={() => goTo(0)}
              style={{cursor: 'pointer'}}
            />
          </div>
        </div>

        <div className="footer-smalllinks">
          <a href="#">TERMS & CONDITIONS</a>
          <a href="#">CONTACT US</a>
          <a href="#">PRIVACY POLICY</a>
        </div>
      </footer>
    </div>
  )
}
