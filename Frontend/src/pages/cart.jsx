import React, { useState, useEffect } from 'react'
import { useLocation } from '../lib/useLocation'
import './cart.css'
import Header from './navbar'

export default function Cart({ navigate }) {
  const [cartItems, setCartItems] = useState([])
  const { formatPrice } = useLocation()

  // Load cart from localStorage
  useEffect(() => {
    const loadCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]')
        setCartItems(cart)
      } catch (e) {
        setCartItems([])
      }
    }
    loadCart()

    // Listen for storage changes
    const onStorage = () => loadCart()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0)

  // Update quantity - if quantity reaches 0, remove the item
  const updateQuantity = (id, change) => {
    const updatedItems = cartItems
      .map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0, item.qty + change)
          return { ...item, qty: newQty }
        }
        return item
      })
      .filter((item) => item.qty > 0) // Remove items with quantity 0
    
    setCartItems(updatedItems)
    localStorage.setItem('cart', JSON.stringify(updatedItems))
  }

  // Remove item from cart
  const removeItem = (id) => {
    const updatedItems = cartItems.filter((item) => item.id !== id)
    setCartItems(updatedItems)
    localStorage.setItem('cart', JSON.stringify(updatedItems))
  }

  return (
    <>
      {/* Header */}
      <Header navigate={navigate} />

      {/* Main Content */}
      <main className="main-container">
        <h1 className="page-title">SHOPPING BAG</h1>

        {cartItems.length === 0 ? (
          // Empty cart state
          <div className="empty-cart">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h2>Your shopping bag is empty</h2>
            <p>Add items to get started</p>
          </div>
        ) : (
          // Cart with items
          <div className="cart-container">
            {/* Cart Items */}
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <button className="remove-item-btn" onClick={() => removeItem(item.id)} aria-label="Remove item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                  <div className="item-image">
                    <img src={item.img} alt={item.title} />
                  </div>
                  <div className="item-details">
                    <h3 className="item-name">{item.title}</h3>
                    <p className="item-color">Color: {item.color}</p>
                    <p className="item-size">Size: {item.size}</p>
                    <p className="item-stock">In stock</p>
                  </div>
                  <div className="item-each">
                    <p className="column-label">EACH</p>
                    <p className="price">{formatPrice(item.price)}</p>
                  </div>
                  <div className="item-quantity">
                    <p className="column-label">QUANTITY</p>
                    <div className="quantity-controls">
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>
                        −
                      </button>
                      <span className="qty-value">{item.qty}</span>
                      <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                  <div className="item-total">
                    <p className="column-label">TOTAL</p>
                    <p className="price">{formatPrice(item.price * item.qty)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Footer */}
            <div className="cart-footer">
              <div className="subtotal-section">
                <span className="subtotal-label">SUBTOTAL</span>
                <span className="subtotal-value">{formatPrice(subtotal)}</span>
              </div>
              <button className="checkout-btn" onClick={() => navigate('payment')}>
                CHECKOUT
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
