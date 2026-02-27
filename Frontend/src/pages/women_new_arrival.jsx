import React, { useState, useEffect } from 'react'
import { getApiUrl, resolveBackendUrl } from '../config/api'
import './men_tees.css'
import Header from './navbar'

export default function WomenNewArrival({ navigate }){
  const [showFilter, setShowFilter] = useState(false)
  const [sortBy, setSortBy] = useState('featured')
  const [wishlist, setWishlist] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn') === 'true'
    setIsLoggedIn(loggedIn)
  }, [])

  useEffect(() => {
    function onKey(e){ if(e.key === 'Escape') setShowFilter(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]')
      setWishlist(saved)
    } catch(e) {}
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch(getApiUrl('/api/products/products.php?category=women-new-collection'))
      const data = await response.json()
      
      if (data.status === 'success' && data.data.products) {
        // Transform products to match the expected format
        const transformedProducts = data.data.products.map(product => {
          // Get first variant's image if available
          let imageUrl = '/assets/placeholders/product.png'
          if (product.variants && product.variants.length > 0 && product.variants[0].image) {
            imageUrl = resolveBackendUrl(product.variants[0].image)
          }
          
          return {
            id: product.id,
            img: imageUrl,
            title: product.name,
            price: `TK ${parseFloat(product.base_price).toFixed(2)} BDT`,
            priceValue: parseFloat(product.base_price)
          }
        })
        setProducts(transformedProducts)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

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
        title: product.title,
        img: product.img,
        price: product.priceValue
      }]
    }
    setWishlist(updated)
    localStorage.setItem('wishlist', JSON.stringify(updated))
  }

  function isInWishlist(productId) {
    return wishlist.some(item => item.productId === productId)
  }

  if (loading) {
    return (
      <div className="men-tees-page">
        <Header navigate={navigate} />
        <section className="page-title">
          <h1><b>WOMEN'S NEW ARRIVAL</b></h1>
        </section>
        <div style={{textAlign: 'center', padding: '50px'}}>Loading products...</div>
      </div>
    )
  }

  return (
    <div className="men-tees-page">
      <Header navigate={navigate} />

      <section className="page-title">
        <h1><b>WOMEN'S NEW ARRIVAL</b></h1>
        <button className="refine-btn" onClick={() => setShowFilter(true)}>REFINE</button>
      </section>

      {showFilter && (
        <div className="filter-popup" role="dialog" aria-modal="true" onClick={(e)=>{ if(e.target === e.currentTarget) setShowFilter(false)}}>
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
        {(() => {
          // derive a working list based on selected sort
          const list = [...products]
          if(sortBy === 'price_asc'){
            list.sort((a,b)=> a.priceValue - b.priceValue)
          } else if(sortBy === 'price_desc'){
            list.sort((a,b)=> b.priceValue - a.priceValue)
          } else if(sortBy === 'best'){
            // best-selling is not available in data; simulate by keeping original order but could be replaced
          }
          
          if (list.length === 0) {
            return <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '50px'}}>No products available in this category yet.</div>
          }
          
          return list.map(p => (
            <div key={p.id} className="product-card" onClick={() => navigate(`product/${p.id}`)}>
              <img src={p.img} alt={p.title} />
              {isLoggedIn && (
                <button 
                  className={`wishlist-heart ${isInWishlist(p.id) ? 'active' : ''}`}
                  onClick={(e) => toggleWishlist(e, p)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </button>
              )}
              <h3>{p.title}</h3>
              <p className="price">{p.price}</p>
            </div>
          ))
        })()}
      </section>
    </div>
  )
}