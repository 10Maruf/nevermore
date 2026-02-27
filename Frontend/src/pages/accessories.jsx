import React, { useState, useEffect } from 'react'
import { getApiUrl, resolveBackendUrl } from '../config/api'
import './men_tees.css'
import Header from './navbar'

// Helper function to convert slug to display name
function getCategoryName(slug) {
  const categoryNames = {
    'caps': "Caps",
    'tote-bags': "Tote Bags",
    'wallets': "Wallets"
  }
  return categoryNames[slug] || slug
}

export default function Accessories({ navigate }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [sortBy, setSortBy] = useState('featured')
  const [wishlist, setWishlist] = useState([])

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true)
        const categories = ['caps', 'tote-bags', 'wallets']
        const allProducts = []
        
        for (const category of categories) {
          const response = await fetch(getApiUrl(`/api/products/products.php?category=${category}`))
          const data = await response.json()
          if (data.success && data.data && data.data.products) {
            // Transform products
            const transformed = data.data.products.map(product => ({
              id: product.id,
              name: product.name,
              price: product.base_price,
              category_slug: product.category_slug,
              category_name: getCategoryName(product.category_slug),
              primary_image: product.variants?.[0]?.image || null,
              colors: product.variants?.map(v => v.color_code).filter(Boolean) || []
            }))
            allProducts.push(...transformed)
          }
        }
        
        setProducts(allProducts)
        setError(null)
      } catch (err) {
        console.error('Error fetching products:', err)
        setError('Failed to connect to server')
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

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
        img: product.primary_image,
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
        <h1><b>ACCESSORIES COLLECTION</b></h1>
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
            <p style={{ fontSize: '14px', marginTop: '10px' }}>Please make sure products are added in the admin dashboard.</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <p>No accessories available yet.</p>
          </div>
        ) : (
          getSortedProducts().map(product => (
            <div key={product.id} className="product-card" onClick={() => navigate(`/product/${product.id}`)}>
              <img 
                src={product.primary_image ? resolveBackendUrl(product.primary_image) : '/assets/placeholders/no-image.png'} 
                alt={product.name}
                onError={(e) => { e.target.src = '/assets/placeholders/no-image.png' }}
              />
              <button
                className={`wishlist-heart ${isInWishlist(product.id) ? 'active' : ''}`}
                onClick={(e) => toggleWishlist(e, product)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
              <h3>{product.name}</h3>
              <p>TK {parseFloat(product.price).toFixed(2)} BDT</p>
              <span className="product-category" style={{ fontSize: '12px', color: '#666' }}>{product.category_name}</span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
