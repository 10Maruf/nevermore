import React, { useState, useEffect } from 'react'
import './wishlist.css'
import Header from './navbar'

export default function Wishlist({ navigate }) {
  const [wishlistItems, setWishlistItems] = useState([])

  // Load wishlist from localStorage
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]')
        setWishlistItems(wishlist)
      } catch (e) {
        setWishlistItems([])
      }
    }
    loadWishlist()

    // Listen for storage changes
    const onStorage = () => loadWishlist()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Remove item from wishlist
  const removeItem = (id) => {
    const updatedItems = wishlistItems.filter((item) => item.id !== id)
    setWishlistItems(updatedItems)
    localStorage.setItem('wishlist', JSON.stringify(updatedItems))
  }

  // Navigate to product view to select size before adding to cart
  const addToCart = (item) => {
    // Navigate to the product view page where user can select size
    if (navigate && item.productId) {
      navigate(`product/${item.productId}`)
    }
  }

  return (
    <>
      {/* Header */}
      <Header navigate={navigate} />

      {/* Main Content */}
      <main className="main-container">
        <h1 className="page-title">WISHLIST</h1>

        {wishlistItems.length === 0 ? (
          // Empty wishlist state
          <div className="empty-cart">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <h2>Your wishlist is empty</h2>
            <p>Add items to save for later</p>
            <button className="continue-shopping-btn" onClick={() => navigate('home')}>
              CONTINUE SHOPPING
            </button>
          </div>
        ) : (
          // Wishlist with items
          <div className="cart-container">
            {/* Wishlist Items */}
            <div className="cart-items">
              {wishlistItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <button className="remove-btn-wishlist" onClick={() => removeItem(item.id)}>
                    ✕
                  </button>
                  <div className="item-image">
                    <img src={item.img} alt={item.title} />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.title}</h3>
                    <p className="item-stock">In stock</p>
                  </div>
                  <div className="wishlist-actions">
                    <button className="add-to-cart-btn" onClick={() => addToCart(item)}>
                      ADD TO CART
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Continue Shopping Button */}
            <div className="wishlist-footer">
              <button className="continue-shopping-btn" onClick={() => navigate('home')}>
                CONTINUE SHOPPING
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
