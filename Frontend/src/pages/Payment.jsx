import React, { useState, useEffect } from 'react'
import { useLocation as useRouterLocation, useNavigate } from 'react-router-dom'
import { getApiUrl } from '../config/api'
import { useLocation } from '../lib/useLocation'
import { getLiveCurrencyForCountry, formatPriceByCurrency, getCurrencyForCountry } from '../lib/locationService'
import './payment.css'
import Header from './navbar'

export default function Payment({ navigate }) {
  const routerLocation = useRouterLocation()
  const rrNavigate = useNavigate()

  const [cartItems, setCartItems] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [shippingMethod, setShippingMethod] = useState('standard')
  const [country, setCountry] = useState('Bangladesh')
  const [deliveryTouched, setDeliveryTouched] = useState({ country: false })
  const [showCardDetails, setShowCardDetails] = useState(true)
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(null)
  const [discountError, setDiscountError] = useState('')
  const [discountLoading, setDiscountLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    newsletter: false,
    firstName: '',
    lastName: '',
    company: '',
    address: '',
    apartment: '',
    city: '',
    phone: '',
    cardNumber: '',
    expirationDate: '',
    securityCode: '',
    nameOnCard: '',
    billingAddress: true,
    rememberMe: false
  })

  // Use location hook for automatic detection
  const { location, currency, loading: locationLoading, formatPrice: formatPriceHelper, isReady, refreshLocation } = useLocation()

  // Checkout requires login
  useEffect(() => {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true'
    if (!isLoggedIn) {
      rrNavigate('/login', {
        replace: true,
        state: { from: routerLocation, message: 'You need to login' },
      })
    }
  }, [rrNavigate, routerLocation])

  const COUNTRY_CODE_BY_NAME = {
    Bangladesh: 'BD',
    India: 'IN',
    'United States': 'US',
    Canada: 'CA',
    'United Kingdom': 'GB',
    Australia: 'AU',
    'New Zealand': 'NZ',
    'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA',
    Singapore: 'SG',
    Malaysia: 'MY',
    France: 'FR',
    Germany: 'DE',
    Italy: 'IT',
    Spain: 'ES',
  }

  const [displayCurrency, setDisplayCurrency] = useState(null)

  const cartEmpty = cartItems.length === 0

  useEffect(() => {
    // Load cart items from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    setCartItems(cart)
  }, [])

  // Auto-fill name/email from profile when logged in
  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      const token = localStorage.getItem('authToken')
      if (!token) return

      try {
        const res = await fetch(getApiUrl('/api/user/profile.php'), {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) return

        const p = data?.data || {}
        if (cancelled) return
        setFormData(prev => ({
          ...prev,
          email: prev.email || p.email || '',
          firstName: prev.firstName || p.first_name || '',
          lastName: prev.lastName || p.last_name || '',
        }))
      } catch (e) {
        // ignore autofill errors
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [])

  // Auto-fill location data when detected
  useEffect(() => {
    if (location && isReady) {
      // Only prefill if the user didn't manually edit these fields
      if (!deliveryTouched.country) {
        // Only apply auto-country if user still on default or blank
        const current = (country || '').trim()
        if (!current || current.toLowerCase() === 'bangladesh') {
          setCountry(location.country)
        }
      }
    }
  }, [location, isReady, deliveryTouched, country])

  // Currency shown in checkout should follow selected delivery country
  useEffect(() => {
    let cancelled = false

    async function updateDisplayCurrency() {
      try {
        const selectedCode = COUNTRY_CODE_BY_NAME[country] || location?.countryCode || 'BD'
        const c = await getLiveCurrencyForCountry(selectedCode)
        if (!cancelled) setDisplayCurrency(c)
      } catch (e) {
        const selectedCode = COUNTRY_CODE_BY_NAME[country] || location?.countryCode || 'BD'
        const fallback = getCurrencyForCountry(selectedCode)
        if (!cancelled) setDisplayCurrency(fallback)
      }
    }

    updateDisplayCurrency()
    return () => { cancelled = true }
  }, [country, location?.countryCode])

  // persist cart
  function saveCart(next){
    setCartItems(next)
    localStorage.setItem('cart', JSON.stringify(next))
  }

  function incrementQty(id){
    const next = cartItems.map(ci => ci.id === id ? {...ci, qty: ci.qty + 1} : ci)
    saveCart(next)
  }

  function decrementQty(id){
    const next = cartItems.flatMap(ci => {
      if(ci.id !== id) return [ci]
      const newQty = (ci.qty || 0) - 1
      if(newQty <= 0) return [] // remove item when qty hits 0
      return [{...ci, qty: newQty}]
    })
    saveCart(next)
  }

  function removeItem(id){
    const next = cartItems.filter(ci => ci.id !== id)
    saveCart(next)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method)
    setShowCardDetails(method === 'card')
  }

  const calculateSubtotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0)

  const calculateDiscount = () => {
    if (!appliedDiscount) return 0
    
    const subtotal = calculateSubtotal()
    
    if (appliedDiscount.type === 'percentage') {
      return (subtotal * appliedDiscount.value) / 100
    } else {
      return appliedDiscount.value
    }
  }

  const applyDiscountCode = async () => {
    setDiscountError('')
    
    if (!discountCode.trim()) {
      setDiscountError('Please enter a discount code')
      return
    }

    setDiscountLoading(true)

    try {
      const response = await fetch(getApiUrl(`/api/discounts/discounts.php?code=${encodeURIComponent(discountCode.trim())}`))
      const data = await response.json()

      if (data.status === 'success') {
        const discount = data.data
        
        // Check minimum purchase requirement
        const subtotal = calculateSubtotal()
        if (discount.min_purchase > 0 && subtotal < discount.min_purchase) {
          setDiscountError(`Minimum purchase of TK ${discount.min_purchase.toFixed(2)} required`)
          setDiscountLoading(false)
          return
        }
        
        setAppliedDiscount(discount)
        setDiscountError('')
        alert(`Discount code "${discount.code}" applied successfully!`)
      } else {
        setDiscountError(data.message || 'Invalid discount code')
      }
    } catch (err) {
      console.error('Error applying discount:', err)
      setDiscountError('Failed to apply discount code')
    } finally {
      setDiscountLoading(false)
    }
  }

  const removeDiscount = () => {
    setAppliedDiscount(null)
    setDiscountCode('')
    setDiscountError('')
  }

  // Use location-based currency formatting
  function fmt(amountTk){
    const c = displayCurrency || currency
    if (!isReady || !c) {
      return `৳ ${amountTk.toFixed(2)}`
    }
    // Ensure checkout uses the selected delivery-country currency
    return formatPriceByCurrency(amountTk, c)
  }

  const getShippingCostFor = (method) => {
    // Free shipping: 0 TK
    // Standard shipping: Bangladesh = 0 TK, others = USD 5 converted to TK
    // Express shipping: USD 15 converted to TK
    const usdToTk = 110 // approximate
    if (method === 'free') {
      return 0
    }
    if (method === 'standard') {
      const normalized = (country || '').trim().toLowerCase()
      return normalized === 'bangladesh' ? 0 : 5 * usdToTk
    }
    return 15 * usdToTk
  }

  const getShippingCost = () => getShippingCostFor(shippingMethod)

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const shipping = getShippingCost()
    const discount = calculateDiscount()
    return subtotal + shipping - discount
  }

  const handlePayNow = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.address || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    if (cartEmpty) {
      alert('You need to add product to order')
      return
    }

    try {
      // Get user data from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      console.log('User data from localStorage:', user)
      
      // Prepare order data
      const orderData = {
        user_id: parseInt(user.id) || 1,
        user_email: formData.email || user.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company: formData.company || '',
        phone: formData.phone,
        address: formData.address,
        apartment: formData.apartment || '',
        city: formData.city || '',
        postal_code: '',
        country: country,
        items: cartItems,
        subtotal: calculateSubtotal(),
        shipping_cost: getShippingCost(),
        total_amount: calculateTotal(),
        payment_method: 'card',
        shipping_method: shippingMethod
      }

      console.log('Order data being sent:', orderData)

      // Send order to backend
      const response = await fetch(getApiUrl('/api/orders/orders.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)

      if (result.status === 'success') {
        // Store order data for success page
        const orderForDisplay = {
          order_id: result.data.order_id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          user_email: formData.email,
          address: formData.address,
          apartment: formData.apartment,
          city: formData.city || '',
          items: cartItems,
          subtotal: calculateSubtotal(),
          shipping_cost: getShippingCost(),
          total_amount: calculateTotal(),
          status: 'Pending',
          comment: ''
        }
        localStorage.setItem('lastOrder', JSON.stringify(orderForDisplay))
        
        // Clear cart and navigate to success page
        localStorage.removeItem('cart')
        setCartItems([])
        navigate('payment-success')
      } else {
        alert('Order placement failed: ' + (result.message || 'Unknown error'))
        console.error('Order failed:', result)
      }
    } catch (error) {
      console.error('Order error:', error)
      alert('Failed to place order. Error: ' + error.message)
    }
  }

  const handleCashOnDelivery = async () => {
    // Validate required fields
    if (!formData.email || !formData.firstName || !formData.lastName || !formData.address || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    if (cartEmpty) {
      alert('You need to add product to order')
      return
    }

    try {
      // Get user data from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      console.log('User data from localStorage:', user)
      
      // Prepare order data
      const orderData = {
        user_id: parseInt(user.id) || 1,
        user_email: formData.email || user.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company: formData.company || '',
        phone: formData.phone,
        address: formData.address,
        apartment: formData.apartment || '',
        city: formData.city || '',
        postal_code: '',
        country: country,
        items: cartItems,
        subtotal: calculateSubtotal(),
        shipping_cost: getShippingCost(),
        discount_code: appliedDiscount ? appliedDiscount.code : null,
        discount_amount: calculateDiscount(),
        total_amount: calculateTotal(),
        payment_method: 'cod',
        shipping_method: shippingMethod
      }

      console.log('Order data being sent:', orderData)

      // Send order to backend
      const response = await fetch(getApiUrl('/api/orders/orders.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)

      if (result.status === 'success') {
        // Store order data for success page
        const orderForDisplay = {
          order_id: result.data.order_id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          user_email: formData.email,
          address: formData.address,
          apartment: formData.apartment,
          city: formData.city || '',
          items: cartItems,
          subtotal: calculateSubtotal(),
          shipping_cost: getShippingCost(),
          total_amount: calculateTotal(),
          status: 'Pending',
          comment: ''
        }
        localStorage.setItem('lastOrder', JSON.stringify(orderForDisplay))
        
        // Clear cart and navigate to success page
        localStorage.removeItem('cart')
        setCartItems([])
        navigate('payment-success')
      } else {
        alert('Order placement failed: ' + (result.message || 'Unknown error'))
        console.error('Order failed:', result)
      }
    } catch (error) {
      console.error('Order error:', error)
      alert('Failed to place order. Error: ' + error.message)
    }
  }

  return (
    <div className="payment-page">
      <Header navigate={navigate} />

      {/* Location detection notification */}
      {locationLoading && (
        <div className="location-notification location-loading">
          🌍 Detecting your location...
        </div>
      )}

      {isReady && location && (
        <div className="location-notification location-success">
          <div className="location-row">
            <div className="location-text">✓ Detected: {location.country}</div>
            <button
              type="button"
              onClick={() => refreshLocation()}
              className="location-redetect-btn"
            >
              Re-detect
            </button>
          </div>
        </div>
      )}

      <main className="main-container">
        <div className="checkout-grid">
          {/* Left Column - Form */}
          <div className="form-column">
            <div className="form-wrapper">
            {/* Contact Section */}
            <section className="form-section">
              <h2 className="section-title">CONTACT</h2>
              <div className="form-fields">
                <input 
                  type="email" 
                  name="email"
                  placeholder="Email" 
                  className="form-input"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="newsletter" 
                    name="newsletter"
                    className="checkbox"
                    checked={formData.newsletter}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="newsletter" className="checkbox-label">Email me with news and offers</label>
                </div>
              </div>
            </section>

            {/* Delivery Section */}
            <section className="form-section">
              <h2 className="section-title">DELIVERY</h2>
              <div className="form-fields">
                <div className="country-box" style={{display:'flex', alignItems:'center', gap:12}}>
                  <span style={{fontWeight:600, fontSize:12}}>Country/Region</span>
                  <select 
                    value={country}
                    onChange={(e)=> {
                      setDeliveryTouched(prev => ({ ...prev, country: true }))
                      setCountry(e.target.value)
                    }}
                    style={{border:'1px solid #e5e5e5', borderRadius:6, padding:'6px 10px', background:'#fff', fontSize:13, flex: 1}}
                  >
                    <option>Bangladesh</option>
                    <option>India</option>
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Australia</option>
                    <option>New Zealand</option>
                    <option>United Arab Emirates</option>
                    <option>Saudi Arabia</option>
                    <option>Singapore</option>
                    <option>Malaysia</option>
                    <option>France</option>
                    <option>Germany</option>
                    <option>Italy</option>
                    <option>Spain</option>
                  </select>
                  {isReady && location && (
                    <span style={{fontSize: '11px', color: '#10b981'}}>✓ Detected</span>
                  )}
                </div>
                <div className="form-row">
                  <input 
                    type="text" 
                    name="firstName"
                    placeholder="First Name" 
                    className="form-input"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                  <input 
                    type="text" 
                    name="lastName"
                    placeholder="Last Name" 
                    className="form-input"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
                <input 
                  type="text" 
                  name="address"
                  placeholder="Address" 
                  className="form-input"
                  value={formData.address}
                  onChange={handleInputChange}
                />
                <input 
                  type="text" 
                  name="apartment"
                  placeholder="Apartment, suite, etc. (Optional)" 
                  className="form-input"
                  value={formData.apartment}
                  onChange={handleInputChange}
                />
                <input 
                  type="text" 
                  name="city"
                  placeholder="City (Optional)" 
                  className="form-input"
                  value={formData.city}
                  onChange={handleInputChange}
                />
                <input 
                  type="tel" 
                  name="phone"
                  placeholder="Phone" 
                  className="form-input"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </section>

            {/* Shipping Section */}
            <section className="form-section">
              <h2 className="section-title">SHIPPING METHOD</h2>
              <div className="shipping-options">
                <label className="shipping-option">
                  <input 
                    type="radio" 
                    name="shipping" 
                    value="free" 
                    checked={shippingMethod === 'free'}
                    onChange={(e) => setShippingMethod(e.target.value)}
                  />
                  <div className="shipping-details">
                    <span className="shipping-name">Free Shipping</span>
                  <span className="shipping-price">Free</span>
                  </div>
                </label>
                <label className="shipping-option">
                  <input 
                    type="radio" 
                    name="shipping" 
                    value="standard" 
                    checked={shippingMethod === 'standard'}
                    onChange={(e) => setShippingMethod(e.target.value)}
                  />
                  <div className="shipping-details">
                    <span className="shipping-name">Standard Shipping</span>
                  <span className="shipping-price">{fmt(getShippingCostFor('standard'))}</span>
                  </div>
                </label>
                <label className="shipping-option">
                  <input 
                    type="radio" 
                    name="shipping" 
                    value="express"
                    checked={shippingMethod === 'express'}
                    onChange={(e) => setShippingMethod(e.target.value)}
                  />
                  <div className="shipping-details">
                    <span className="shipping-name">Express Shipping</span>
                  <span className="shipping-price">{fmt(getShippingCostFor('express'))}</span>
                  </div>
                </label>
              </div>
            </section>

            <div style={{display:'flex', gap:12, marginTop: 24}}>
              <button className="pay-button" style={{flex:1, opacity: 0.5, cursor: 'not-allowed', background: '#999'}} disabled title="Payment gateway not available at this moment">Make Payment</button>
              <button
                className="pay-button"
                style={{
                  flex: 1,
                  background: cartEmpty ? '#999' : '#16a34a',
                  cursor: cartEmpty ? 'not-allowed' : 'pointer',
                  opacity: cartEmpty ? 0.7 : 1,
                }}
                onClick={handleCashOnDelivery}
                disabled={cartEmpty}
                title={cartEmpty ? 'You need to add product to order' : ''}
              >
                Cash on Delivery
              </button>
            </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="summary-column">
            <div className="order-summary">
              <h2 className="summary-title">ORDER SUMMARY</h2>
              
              {cartItems.length > 0 ? (
                <>
                  {cartItems.map(item => (
                    <div key={item.id} className="product-item">
                      <button className="remove-item-btn" onClick={() => removeItem(item.id)} aria-label="Remove item">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                      <img src={item.img} alt={item.title} className="product-image" />
                      <div className="product-details">
                        <h3 className="product-name">{item.title}</h3>
                        <p className="product-variant">Size: {item.size} /Color: {item.color}</p>
                        <div className="qty-row">
                          <button className="qty-btn" onClick={() => decrementQty(item.id)}>-</button>
                          <span className="qty-value">{item.qty}</span>
                          <button className="qty-btn" onClick={() => incrementQty(item.id)}>+</button>
                        </div>
                      </div>
                      <div className="product-price">{fmt(item.price * item.qty)}</div>
                    </div>
                  ))}

                  <div className="discount-section">
                    <input 
                      type="text" 
                      placeholder="Discount Code" 
                      className="discount-input" 
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      disabled={discountLoading || appliedDiscount}
                    />
                    {appliedDiscount ? (
                      <button className="apply-button" onClick={removeDiscount} style={{background: '#dc2626'}}>
                        Remove
                      </button>
                    ) : (
                      <button className="apply-button" onClick={applyDiscountCode} disabled={discountLoading}>
                        {discountLoading ? 'Applying...' : 'Apply'}
                      </button>
                    )}
                  </div>
                  
                  {discountError && (
                    <div style={{padding: '8px 12px', background: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c00', fontSize: '14px', marginBottom: '10px'}}>
                      {discountError}
                    </div>
                  )}

                  <div className="order-totals">
                    <div className="total-row">
                      <span>Subtotal</span>
                      <span>{fmt(calculateSubtotal())}</span>
                    </div>
                    <div className="total-row">
                      <span>Shipping</span>
                      <span>{fmt(getShippingCost())}</span>
                    </div>
                    {appliedDiscount && (
                      <div className="total-row" style={{color: '#16a34a'}}>
                        <span>Discount</span>
                        <span>-{fmt(calculateDiscount())}</span>
                      </div>
                    )}
                    <div className="total-row final-total">
                      <span>Total</span>
                      <span>{fmt(calculateTotal())}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '40px 0' }}>
                  Your cart is empty. You need to add product to order.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
