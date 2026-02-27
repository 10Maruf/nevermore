import React, { useState, useEffect } from 'react'
import { getApiUrl, resolveBackendUrl } from '../config/api'
import { useLocation } from '../lib/useLocation'
import './men_tees.css'
import Header from './navbar'

// Helper function to convert slug to display name
function getCategoryName(slug) {
  const categoryNames = {
    'men-tees': "Men's Tees",
    'men-hoodies': "Men's Hoodies",
    'men-shorts': "Men's Shorts",
    'men-sweatshirts': "Men's Sweatshirts",
    'men-tanktops': "Men's Tank Tops",
    'women-tees': "Women's Tees",
    'women-hoodies': "Women's Hoodies",
    'women-shorts': "Women's Shorts",
    'women-sweatshirts': "Women's Sweatshirts",
    'women-tanktops': "Women's Tank Tops",
    'caps': "Caps",
    'tote-bags': "Tote Bags",
    'wallets': "Wallets"
  }
  return categoryNames[slug] || slug
}

export default function CategoryProducts({ navigate, categorySlug, pageTitle }) {
  const { formatPrice } = useLocation()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [sortBy, setSortBy] = useState('featured')
  const [wishlist, setWishlist] = useState([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check if user is logged in
  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  // Fetch products from backend
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        const response = await fetch(getApiUrl(`/api/products/products.php?category=${categorySlug}`))
        const data = await response.json()
        
        console.log('API Response:', data) // Debug log
        
        // Backend returns: { status: 'success', message: '...', data: { products: [...] } }
        if (data.status === 'success' && data.data && data.data.products) {
          // Transform the data to match expected format
          const transformedProducts = data.data.products.map(product => {
            // Get first image from first variant's image field
            let primaryImage = null
            if (product.variants && product.variants.length > 0) {
              for (const variant of product.variants) {
                if (variant.image) {
                  primaryImage = variant.image
                  break
                }
              }
            }
            
            return {
              id: product.id,
              name: product.name,
              price: product.base_price,
              category_slug: product.category_slug,
              category_name: product.category_name || getCategoryName(product.category_slug),
              // Get primary image from first variant with image
              primary_image: primaryImage,
              // Get all unique colors from variants
              colors: product.variants 
                ? product.variants.map(v => v.color_code).filter(Boolean)
                : []
            }
          })
          console.log('Transformed products:', transformedProducts) // Debug log
          setProducts(transformedProducts)
          setError(null)
        } else {
          console.error('API Error:', data.message)
          setError(data.message || 'Failed to load products')
          setProducts([])
        }
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Failed to connect to server')
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    if (categorySlug) {
      fetchProducts()
    }
  }, [categorySlug])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setShowFilter(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]')
      setWishlist(saved)
    } catch (e) {}
  }, [])

  function toggleWishlist(e, product) {
    e.stopPropagation()
    const exists = wishlist.some(item => item.productId === product.id)
    let updated
    if (exists) {
      updated = wishlist.filter(item => item.productId !== product.id)
    } else {
      updated = [...wishlist, {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        title: product.name,
        img: product.primary_image ? resolveBackendUrl(product.primary_image) : '/assets/placeholders/no-image.png',
        price: parseFloat(product.price)
      }]
    }
    setWishlist(updated)
    localStorage.setItem('wishlist', JSON.stringify(updated))
  }

  function isInWishlist(productId) {
    return wishlist.some(item => item.productId === productId)
  }

  function getSortedProducts() {
    const list = [...products]
    if (sortBy === 'price_asc') {
      list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    }
    return list
  }

  return (
    <div className="men-tees-page">
      <Header navigate={navigate} />

      <section className="page-title">
        <h1><b>{pageTitle}</b></h1>
        <button className="refine-btn" onClick={() => setShowFilter(true)}>REFINE</button>
      </section>

      {showFilter && (
        <div className="filter-popup" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setShowFilter(false) }}>
          <div className="filter-content" role="document">
            <span className="close-btn" onClick={() => setShowFilter(false)}>&times;</span>
            <h3>Sort by</h3>
            <ul className="filter-list">
              <li onClick={() => { setSortBy('featured'); setShowFilter(false); }}>Featured</li>
              <li onClick={() => { setSortBy('best'); setShowFilter(false); }}>Best Selling</li>
              <li onClick={() => { setSortBy('price_desc'); setShowFilter(false); }}>Price, High to Low</li>
              <li onClick={() => { setSortBy('price_asc'); setShowFilter(false); }}>Price, Low to High</li>
            </ul>
          </div>
        </div>
      )}

      <section className="product-grid">
        {loading ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#d32f2f' }}>
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p>No products available in this category yet.</p>
          </div>
        ) : (
          getSortedProducts().map(product => {
            console.log('Rendering product:', product.id, 'Image:', product.primary_image)
            return (
              <div key={product.id} className="product-card" onClick={() => navigate(`/product/${product.id}`)}>
                <img 
                  src={product.primary_image ? resolveBackendUrl(product.primary_image) : '/assets/placeholders/no-image.png'} 
                  alt={product.name}
                  onError={(e) => { 
                    console.log('Image failed to load:', e.target.src)
                    e.target.src = '/assets/placeholders/no-image.png' 
                  }}
                  onLoad={(e) => {
                    console.log('Image loaded successfully:', e.target.src)
                  }}
                />
                {isLoggedIn && (
                  <button
                    className={`wishlist-heart ${isInWishlist(product.id) ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(e, product)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                )}
                <h3>{product.name}</h3>
                <p>{formatPrice(parseFloat(product.price))}</p>
              </div>
            )
          })
        )}
      </section>
    </div>
  )
}
