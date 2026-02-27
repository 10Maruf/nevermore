import React from 'react'
import './category.css'

export default function Category({ navigate }){
  return (
    <div className="category-page">
      <header className="header-bar">
        <div className="header-content">
          <div className="header-logo">
            <img src="/assets/images/logo.png" alt="Logo" className="nav-logo" />
          </div>
          <div className="nav-icons-bar">
            <button className="icon-btn" aria-label="Search">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <button className="icon-btn" aria-label="Wishlist">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
            <button className="icon-btn" aria-label="Account" onClick={() => navigate('login')}>
              <svg width="31" height="30" viewBox="0 0 31 30" fill="none" stroke="white" strokeWidth="2.5"><path d="M15.5 15c2.485 0 4.5-2.015 4.5-4.5S17.985 6 15.5 6s-4.5 2.015-4.5 4.5 2.015 4.5 4.5 4.5zm0 2.25c-4.142 0-7.5 3.358-7.5 7.5v3.75h15v-3.75c0-4.142-3.358-7.5-7.5-7.5z"/></svg>
            </button>
            <button className="icon-btn" aria-label="Cart">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <h4 className="category-title">SHOP BY CATEGORY</h4>

        <section className="category-section">
          <div className="category-header">
            <h6>MEN'S</h6>
          </div>
          <div className="category-scroll-wrapper">
            <button className="scroll-btn scroll-left" onClick={(e) => {
              const container = e.target.parentElement.querySelector('.category-row')
              container.scrollBy({ left: -300, behavior: 'smooth' })
            }}>‹</button>
            <div className="category-row">
              <div className="category-card" onClick={() => navigate('men/tees')}>
                <img src="/assets/images/menT1.png" alt="Tees" />
                <p><b>TEES</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/hoodies')}>
                <img src="/assets/images/mc2.png" alt="Hoodies" />
                <p><b>HOODIES</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/sweatshirts')}>
                <img src="/assets/images/mc3.png" alt="Sweatshirts" />
                <p><b>SWEATSHIRTS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/tanktops')}>
                <img src="/assets/images/menT4.png" alt="Tank Tops" />
                <p><b>TANK TOPS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/shorts')}>
                <img src="/assets/images/menT5.png" alt="Shorts" />
                <p><b>SHORTS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/joggers')}>
                <img src="/assets/images/menT5.png" alt="Joggers" />
                <p><b>JOGGERS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/polo-shirt')}>
                <img src="/assets/images/menT1.png" alt="Polo Shirt" />
                <p><b>POLO SHIRT</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('men/windbreaker')}>
                <img src="/assets/images/mc2.png" alt="Windbreaker" />
                <p><b>WINDBREAKER</b></p>
              </div>
            </div>
            <button className="scroll-btn scroll-right" onClick={(e) => {
              const container = e.target.parentElement.querySelector('.category-row')
              container.scrollBy({ left: 300, behavior: 'smooth' })
            }}>›</button>
          </div>
        </section>

        <section className="category-section">
          <div className="category-header">
            <h6>WOMEN'S</h6>
          </div>
          <div className="category-scroll-wrapper">
            <button className="scroll-btn scroll-left" onClick={(e) => {
              const container = e.target.parentElement.querySelector('.category-row')
              container.scrollBy({ left: -300, behavior: 'smooth' })
            }}>‹</button>
            <div className="category-row">
              <div className="category-card" onClick={() => navigate('women/tees')}>
                <img src="/assets/images/wc1.png" alt="Tees" />
                <p><b>TEES</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/hoodies')}>
                <img src="/assets/images/wc2.png" alt="Hoodies" />
                <p><b>HOODIES</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/sweatshirts')}>
                <img src="/assets/images/wc3.png" alt="Sweatshirts" />
                <p><b>SWEATSHIRTS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/tanktops')}>
                <img src="/assets/images/wc4.png" alt="Tank Tops" />
                <p><b>TANK TOPS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/shorts')}>
                <img src="/assets/images/wc5.png" alt="Shorts" />
                <p><b>SHORTS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/joggers')}>
                <img src="/assets/images/wc5.png" alt="Joggers" />
                <p><b>JOGGERS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/polo-shirt')}>
                <img src="/assets/images/wc1.png" alt="Polo Shirt" />
                <p><b>POLO SHIRT</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('women/windbreaker')}>
                <img src="/assets/images/wc2.png" alt="Windbreaker" />
                <p><b>WINDBREAKER</b></p>
              </div>
            </div>
            <button className="scroll-btn scroll-right" onClick={(e) => {
              const container = e.target.parentElement.querySelector('.category-row')
              container.scrollBy({ left: 300, behavior: 'smooth' })
            }}>›</button>
          </div>
        </section>

        <section className="category-section">
          <div className="category-header">
            <h6>ACCESSORIES</h6>
          </div>
          <div className="category-scroll-wrapper">
            <button className="scroll-btn scroll-left" onClick={(e) => {
              const container = e.target.parentElement.querySelector('.category-row')
              container.scrollBy({ left: -300, behavior: 'smooth' })
            }}>‹</button>
            <div className="category-row">
              <div className="category-card" onClick={() => navigate('accessories/cap')}>
                <img src="/assets/images/mc2.png" alt="Caps" />
                <p><b>CAPS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('accessories/wallet')}>
                <img src="/assets/images/wc1.png" alt="Wallets" />
                <p><b>WALLETS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('accessories/tote')}>
                <img src="/assets/images/wc2.png" alt="Tote Bags" />
                <p><b>TOTE BAGS</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('accessories/backpack')}>
                <img src="/assets/images/mc3.png" alt="Backpack" />
                <p><b>BACKPACK</b></p>
              </div>
              <div className="category-card" onClick={() => navigate('accessories/home-decor')}>
                <img src="/assets/images/wc3.png" alt="Home & Decor" />
                <p><b>HOME & DECOR</b></p>
              </div>
            </div>
            <button className="scroll-btn scroll-right" onClick={(e) => {
              const container = e.target.parentElement.querySelector('.category-row')
              container.scrollBy({ left: 300, behavior: 'smooth' })
            }}>›</button>
          </div>
        </section>
      </main>
    </div>
  )
}

