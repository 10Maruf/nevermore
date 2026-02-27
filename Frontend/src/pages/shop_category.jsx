import React, { useState, useEffect } from 'react'
import Navbar from './navbar'
import './shop_category.css'
import { getApiUrl, resolveBackendUrl } from '../config/api'

export default function ShopCategory({ navigate }) {
  const [categoryImages, setCategoryImages] = useState({})

  const [menScrollPosition, setMenScrollPosition] = useState(0)
  const [womenScrollPosition, setWomenScrollPosition] = useState(0)
  const [accessoriesScrollPosition, setAccessoriesScrollPosition] = useState(0)

  // Fetch category images from database
  useEffect(() => {
    const fetchCategoryImages = async () => {
      try {
        const response = await fetch(getApiUrl('/api/categories/category_images.php'))
        if (!response.ok) {
          throw new Error(`Failed to fetch category images (HTTP ${response.status})`)
        }

        const data = await response.json()
        console.log('Shop category - fetched images:', data)
        
        if (data.status === 'success' && Array.isArray(data.data)) {
          const imagesMap = {}
          data.data.forEach(cat => {
            const slug = cat?.category_slug
            const rawUrl = cat?.image_url

            if (!slug || typeof rawUrl !== 'string' || rawUrl.trim().length === 0) return

            // Use full URL from backend or construct it
            const imageUrl = rawUrl.startsWith('http') ? rawUrl : resolveBackendUrl(rawUrl)
            imagesMap[slug] = imageUrl
          })
          console.log('Shop category - images map:', imagesMap)
          setCategoryImages(imagesMap)
        }
      } catch (error) {
        console.error('Error fetching category images:', error)
      }
    }

    fetchCategoryImages()
  }, [])

  // Helper to get image (dynamic or fallback)
  const getImage = (slug) => {
    return categoryImages[slug] || '/assets/images/placeholder.png'
  }

  const categories = {
    men: [
      { name: 'TEES', route: 'men/tees', slug: 'men-tees' },
      { name: 'HOODIES', route: 'men/hoodies', slug: 'men-hoodies' },
      { name: 'SWEATSHIRTS', route: 'men/sweatshirts', slug: 'men-sweatshirts' },
      { name: 'TANK TOPS', route: 'men/tanktops', slug: 'men-tanktops' },
      { name: 'SHORTS', route: 'men/shorts', slug: 'men-shorts' },
      { name: 'JOGGERS', route: 'men/joggers', slug: 'men-joggers' },
      { name: 'POLO SHIRT', route: 'men/polo-shirt', slug: 'men-polo-shirt' },
      { name: 'WINDBREAKER', route: 'men/windbreaker', slug: 'men-windbreaker' }
    ],
    women: [
      { name: 'TEES', route: 'women/tees', slug: 'women-tees' },
      { name: 'HOODIES', route: 'women/hoodies', slug: 'women-hoodies' },
      { name: 'SWEATSHIRTS', route: 'women/sweatshirts', slug: 'women-sweatshirts' },
      { name: 'TANK TOPS', route: 'women/tanktops', slug: 'women-tanktops' },
      { name: 'SHORTS', route: 'women/shorts', slug: 'women-shorts' },
      { name: 'JOGGERS', route: 'women/joggers', slug: 'women-joggers' },
      { name: 'POLO SHIRT', route: 'women/polo-shirt', slug: 'women-polo-shirt' },
      { name: 'WINDBREAKER', route: 'women/windbreaker', slug: 'women-windbreaker' }
    ],
    accessories: [
      { name: 'TOTE BAG', route: 'accessories/tote', slug: 'accessories-tote' },
      { name: 'WALLET', route: 'accessories/wallet', slug: 'accessories-wallet' },
      { name: 'CAP', route: 'accessories/cap', slug: 'accessories-cap' },
      { name: 'BACKPACK', route: 'accessories/backpack', slug: 'accessories-backpack' },
      { name: 'HOME & DECOR', route: 'accessories/home-decor', slug: 'accessories-home-decor' }
    ]
  }

  const scroll = (section, direction) => {
    const container = document.getElementById(`${section}-grid`)
    if (!container) return
    
    const scrollAmount = 300
    const newPosition = direction === 'left' 
      ? Math.max(0, container.scrollLeft - scrollAmount)
      : container.scrollLeft + scrollAmount

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    })

    if (section === 'men') setMenScrollPosition(newPosition)
    if (section === 'women') setWomenScrollPosition(newPosition)
    if (section === 'accessories') setAccessoriesScrollPosition(newPosition)
  }

  return (
    <div className="category-page">
      <Navbar navigate={navigate} />

      <main className="category-container">
        <h1 className="category-main-title"><b>SHOP BY CATEGORY</b></h1>

        {/* Men Section */}
        <section className="category-section">
          <h2 className="category-section-title">MEN</h2>
          <div className="category-grid-wrapper">
            <button 
              className="scroll-button scroll-left"
              onClick={() => scroll('men', 'left')}
              aria-label="Scroll left"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="category-grid category-grid-scroll" id="men-grid">
              {categories.men.map((item, index) => (
                <div
                  key={index}
                  className="category-card"
                  onClick={() => navigate(item.route)}
                >
                  <div className="category-image-wrapper">
                    <img 
                      src={getImage(item.slug)} 
                      alt={item.name} 
                      className="category-image"
                    />
                  </div>
                  <h3 className="category-name">{item.name}</h3>
                </div>
              ))}
            </div>
            <button 
              className="scroll-button scroll-right"
              onClick={() => scroll('men', 'right')}
              aria-label="Scroll right"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>

        {/* Women Section */}
        <section className="category-section">
          <h2 className="category-section-title">WOMEN</h2>
          <div className="category-grid-wrapper">
            <button 
              className="scroll-button scroll-left"
              onClick={() => scroll('women', 'left')}
              aria-label="Scroll left"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="category-grid category-grid-scroll" id="women-grid">
              {categories.women.map((item, index) => (
                <div
                  key={index}
                  className="category-card"
                  onClick={() => navigate(item.route)}
                >
                  <div className="category-image-wrapper">
                    <img 
                      src={getImage(item.slug)} 
                      alt={item.name} 
                      className="category-image"
                    />
                  </div>
                  <h3 className="category-name">{item.name}</h3>
                </div>
              ))}
            </div>
            <button 
              className="scroll-button scroll-right"
              onClick={() => scroll('women', 'right')}
              aria-label="Scroll right"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>

        {/* Accessories Section */}
        <section className="category-section">
          <h2 className="category-section-title">ACCESSORIES</h2>
          <div className="category-grid-wrapper">
            <button 
              className="scroll-button scroll-left"
              onClick={() => scroll('accessories', 'left')}
              aria-label="Scroll left"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <div className="category-grid category-grid-scroll accessories-grid" id="accessories-grid">
              {categories.accessories.map((item, index) => (
                <div
                  key={index}
                  className="category-card"
                  onClick={() => navigate(item.route)}
                >
                  <div className="category-image-wrapper">
                    <img 
                      src={getImage(item.slug)} 
                      alt={item.name} 
                      className="category-image"
                    />
                  </div>
                  <h3 className="category-name">{item.name}</h3>
                </div>
              ))}
            </div>
            <button 
              className="scroll-button scroll-right"
              onClick={() => scroll('accessories', 'right')}
              aria-label="Scroll right"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
