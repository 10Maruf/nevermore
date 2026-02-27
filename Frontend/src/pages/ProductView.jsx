import React, { useState, useEffect } from 'react'
import { getApiUrl, resolveBackendUrl } from '../config/api'
import { useLocation } from '../lib/useLocation'
import './productview.css'
import Header from './navbar'


export default function ProductView({ navigate, productId }) {
  const [open, setOpen] = useState(null) // 'size' | 'sizeguide' | 'bag' | null
  const [product, setProduct] = useState(null)
  const [selectedColor, setSelectedColor] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [bagItems, setBagItems] = useState([])
  const [quantities, setQuantities] = useState({})
  const [accordionOpen, setAccordionOpen] = useState(null)
  const [unitCm, setUnitCm] = useState(true)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [clickedImageIndex, setClickedImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Location and currency detection
  const { formatPrice } = useLocation()

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true)
        setError(null)
        
        // Try to fetch from backend API first
        const response = await fetch(getApiUrl(`/api/products/products.php?id=${productId}`))
        const data = await response.json()
        
        console.log('ProductView API Response:', data)
        
        if (data.status === 'success' && data.data && data.data.product) {
          const apiProduct = data.data.product
          
          console.log('API Product:', apiProduct)
          console.log('API Product variants:', apiProduct.variants)
          
          // Group images by color
          const imagesByColor = {}
          
          if (apiProduct.variants && apiProduct.variants.length > 0) {
            apiProduct.variants.forEach(variant => {
              // Use color name as key if color_code is not available
              const colorKey = variant.color_code || variant.color || 'default'
              if (!imagesByColor[colorKey]) {
                imagesByColor[colorKey] = []
              }
              
              if (variant.images && variant.images.length > 0) {
                variant.images.forEach(imgObj => {
                  // Handle different image formats
                  let imgUrl = ''
                  
                  if (typeof imgObj === 'string') {
                    // If imgObj is already a string URL
                    imgUrl = resolveBackendUrl(imgObj)
                  } else if (imgObj && imgObj.url) {
                    // If imgObj is an object with url property
                    const url = imgObj.url
                    imgUrl = resolveBackendUrl(url)
                  } else {
                    console.warn('Invalid image format:', imgObj)
                    return
                  }
                  
                  // Add unique images for this color
                  if (!imagesByColor[colorKey].includes(imgUrl)) {
                    imagesByColor[colorKey].push(imgUrl)
                  }
                })
              }
            })
          }
          
          // Transform backend product to match component format
          const transformedProduct = {
            id: apiProduct.id,
            title: apiProduct.name,
            price: parseFloat(apiProduct.base_price),
            description: apiProduct.description || 'Premium quality product crafted for comfort and style.',
            size_fit: apiProduct.size_fit || '',
            care_maintenance: apiProduct.care_maintenance || '',
            // Store images grouped by color
            imagesByColor: imagesByColor,
            // Get images for first color as default
            images: Object.values(imagesByColor)[0] || ['/assets/placeholders/no-image.png'],
            // Get unique colors from variants
            colors: apiProduct.variants && apiProduct.variants.length > 0
              ? apiProduct.variants
                  .filter((v, index, self) => 
                    v.color && 
                    index === self.findIndex(t => t.color === v.color)
                  )
                  .map(v => ({
                    name: v.color,
                    hex: v.color_code || '#000000' // Default to black if no color code
                  }))
              : [{name: 'DEFAULT', hex: '#000000'}],
            // Store variants for size/stock management
            variants: apiProduct.variants || [],
            category: apiProduct.category_slug
          }
          
          console.log('Transformed product:', transformedProduct)
          console.log('Images by color:', imagesByColor)
          console.log('Available colors:', transformedProduct.colors)
          console.log('Total variants:', apiProduct.variants.length)
          
          setProduct(transformedProduct)
          
          // Set initial selected variant (first variant with matching color)
          if (transformedProduct.variants.length > 0) {
            setSelectedVariant(transformedProduct.variants[0])
          }
          
          checkWishlistStatus(apiProduct.id)
        } else {
          setError('Product not found')
        }
      } catch (err) {
        console.error('Error fetching product:', err)
        setError('Failed to load product')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
    loadCart()
  }, [productId])

  function checkWishlistStatus(prodId) {
    try {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]')
      const inWishlist = wishlist.some(w => w.productId === prodId)
      setIsInWishlist(inWishlist)
    } catch (e) {
      setIsInWishlist(false)
    }
  }

  function loadCart() {
    try {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]')
      setBagItems(cart)
    } catch(e) {}
  }

  function saveCart(items) {
    localStorage.setItem('cart', JSON.stringify(items))
    setBagItems(items)
  }

  function updateQty(size, delta) {
    setQuantities(prev => ({
      ...prev,
      [size]: Math.max(0, (prev[size] || 0) + delta)
    }))
  }

  function handleColorChange(colorIndex) {
    setSelectedColor(colorIndex)
    
    // Update images based on selected color
    if (product && product.imagesByColor && product.colors[colorIndex]) {
      // Try to find images by color_code first, then by color name
      const selectedColorHex = product.colors[colorIndex].hex
      const selectedColorName = product.colors[colorIndex].name
      const colorImages = product.imagesByColor[selectedColorHex] || 
                          product.imagesByColor[selectedColorName] || 
                          ['/assets/placeholders/no-image.png']
      
      // Update product images
      setProduct(prev => ({
        ...prev,
        images: colorImages
      }))
    }
    
    // Update selected variant based on color
    if (product && product.variants && product.variants.length > 0) {
      const selectedColorName = product.colors[colorIndex].name
      const selectedColorHex = product.colors[colorIndex].hex
      // Match by color name or color_code
      const variantForColor = product.variants.find(v => 
        v.color === selectedColorName || v.color_code === selectedColorHex
      )
      if (variantForColor) {
        setSelectedVariant(variantForColor)
      }
    }
    
    // Reset quantities when color changes
    setQuantities({})
  }

  function getAvailableSizes() {
    if (!product || !product.variants) {
      // Default sizes for legacy products
      return [
        { size: 'X-SMALL', available: false, stock: 0 },
        { size: 'SMALL', available: true, stock: 10 },
        { size: 'MEDIUM', available: true, stock: 10 },
        { size: 'LARGE', available: false, stock: 0 },
        { size: 'X-LARGE', available: true, stock: 10 }
      ]
    }

    // Get inventory from current color variants
    const selectedColorName = product.colors[selectedColor]?.name
    const selectedColorHex = product.colors[selectedColor]?.hex
    
    // Match variants by color name or color_code
    const variantsForColor = product.variants.filter(v => 
      v.color === selectedColorName || v.color_code === selectedColorHex
    )
    
    // Collect all unique sizes from inventory
    const allSizes = new Set()
    variantsForColor.forEach(variant => {
      if (variant.inventory && variant.inventory.length > 0) {
        variant.inventory.forEach(inv => {
          if (inv.size) {
            allSizes.add(inv.size)
          }
        })
      }
    })
    
    // Check if sizes are numeric (for joggers, shorts, etc.)
    const sizesArray = Array.from(allSizes)
    const isNumericSizes = sizesArray.length > 0 && sizesArray.every(size => !isNaN(parseInt(size)))
    
    let sizesToDisplay = []
    
    if (isNumericSizes) {
      // For numeric sizes (joggers, shorts, etc.), sort and display as numbers
      sizesToDisplay = sizesArray
        .map(s => parseInt(s))
        .sort((a, b) => a - b)
        .map(s => s.toString())
    } else {
      // For standard clothing sizes
      const sizeMapping = {
        'XS': 'X-SMALL',
        'S': 'SMALL',
        'M': 'MEDIUM',
        'L': 'LARGE',
        'XL': 'X-LARGE'
      }
      sizesToDisplay = ['X-SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'X-LARGE']
    }
    
    return sizesToDisplay.map(displaySize => {
      // Find inventory for this size across all variants with this color
      let totalStock = 0
      
      variantsForColor.forEach(variant => {
        if (variant.inventory && variant.inventory.length > 0) {
          variant.inventory.forEach(inv => {
            const invSize = inv.size
            
            // For numeric sizes, match exactly
            if (isNumericSizes) {
              if (invSize === displaySize || parseInt(invSize) === parseInt(displaySize)) {
                totalStock += parseInt(inv.available >= 0 ? inv.available : inv.quantity || 0)
              }
            } else {
              // For standard sizes, match with mapping
              const invSizeUpper = invSize.toUpperCase()
              const sizeMapping = {
                'XS': 'X-SMALL',
                'S': 'SMALL',
                'M': 'MEDIUM',
                'L': 'LARGE',
                'XL': 'X-LARGE'
              }
              if (invSizeUpper === displaySize || sizeMapping[invSizeUpper] === displaySize) {
                totalStock += parseInt(inv.available >= 0 ? inv.available : inv.quantity || 0)
              }
            }
          })
        }
      })
      
      return {
        size: displaySize,
        available: totalStock > 0,
        stock: totalStock
      }
    })
  }


  function addToBag() {
    if (!product) return
    const selected = Object.entries(quantities).filter(([_, qty]) => qty > 0)
    if (selected.length === 0) {
      alert('Please select at least one size')
      return
    }

    let updated = [...bagItems]
    
    selected.forEach(([size, qty]) => {
      // Check if same product (name + size + color) already exists in cart
      const existingItemIndex = updated.findIndex(item => 
        item.title === product.title && 
        item.size === size && 
        item.color === product.colors[selectedColor].name
      )
      
      if (existingItemIndex !== -1) {
        // Item exists - increase quantity
        updated[existingItemIndex].qty += qty
      } else {
        // New item - add to cart
        updated.push({
          id: `${product.id}-${size}-${product.colors[selectedColor].name}-${Date.now()}`,
          productId: product.id,
          title: product.title,
          size,
          qty,
          price: product.price,
          img: product.images[0],
          color: product.colors[selectedColor].name
        })
      }
    })

    saveCart(updated)
    setQuantities({}) // Reset quantities after adding
    setOpen('bag')
  }

  function removeFromBag(itemId) {
    const updated = bagItems.filter(it => it.id !== itemId)
    saveCart(updated)
  }

  function addToWishlist() {
    if (!product) return
    
    try {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]')
      const alreadyInWishlist = wishlist.some(w => w.productId === product.id)
      
      if (!alreadyInWishlist) {
        wishlist.push({
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          title: product.title,
          img: product.images[0],
          price: product.price
        })
        localStorage.setItem('wishlist', JSON.stringify(wishlist))
        setIsInWishlist(true)
        // No alert - just visual feedback with red heart
      } else {
        // Remove from wishlist if already in it
        const updated = wishlist.filter(w => w.productId !== product.id)
        localStorage.setItem('wishlist', JSON.stringify(updated))
        setIsInWishlist(false)
        // No alert - just visual feedback with empty heart
      }
    } catch (e) {
      console.error('Failed to toggle wishlist:', e)
    }
  }

  function addBagToWishlist() {
    if (bagItems.length === 0) return
    
    try {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]')
      
      // Add each bag item to wishlist if not already present
      bagItems.forEach(bagItem => {
        const alreadyInWishlist = wishlist.some(w => w.productId === bagItem.productId)
        if (!alreadyInWishlist) {
          wishlist.push({
            id: `${bagItem.productId}-${Date.now()}`,
            productId: bagItem.productId,
            title: bagItem.title,
            img: bagItem.img
          })
        }
      })
      
      localStorage.setItem('wishlist', JSON.stringify(wishlist))
      alert('All items added to wishlist!')
    } catch (e) {
      console.error('Failed to add to wishlist:', e)
    }
  }

  function checkout() {
    if (bagItems.length > 0) {
      navigate('payment')
    }
  }

  function openImageModal(img, index) {
    setSelectedImage(img)
    setClickedImageIndex(index)
    setShowImageModal(true)
  }

  function closeImageModal() {
    setShowImageModal(false)
    setSelectedImage(null)
    setClickedImageIndex(0)
  }

  if (loading) {
    return (
      <div className="product-view-page">
        <Header navigate={navigate} />
        <div style={{padding:'40px',textAlign:'center'}}>Loading product...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-view-page">
        <Header navigate={navigate} />
        <div style={{padding:'40px',textAlign:'center', color: '#d32f2f'}}>
          {error || 'Product not found'}
        </div>
      </div>
    )
  }

  const subtotal = bagItems.reduce((s, it) => s + (it.price * it.qty), 0)

  return (
    <div className="product-view-page">
      <Header navigate={navigate} />

      <main className="product-main-container">
        <div className="product-layout">
          {/* Left: Product Images */}
          <div className="product-images-section">
            {product.images && product.images.length > 0 ? (
              product.images.map((img, idx) => (
                <div key={idx} className="product-image" onClick={() => openImageModal(img, idx)} style={{cursor: 'pointer'}}>
                  <img 
                    src={img} 
                    alt={`${product.title} view ${idx+1}`}
                    onError={(e) => {
                      console.log('Image failed to load:', img)
                      e.target.src = '/assets/placeholders/no-image.png'
                    }}
                  />
                </div>
              ))
            ) : (
              <div className="product-image">
                <img src="/assets/placeholders/no-image.png" alt="No image available" />
              </div>
            )}
          </div>

          {/* Right: Product Details */}
          <div className="product-details-section">
            <div className="details-content">
              <div className="product-header">
                <h1 className="product-title">{product.title}</h1>
                <div className="price-color-section">
                  <p className="product-price">{formatPrice(product.price)}</p>
                  {product.colors && product.colors.length > 0 && product.colors[0].name !== 'DEFAULT' && (
                    <div className="color-selector">
                      <label htmlFor="color-select">Color:</label>
                      <select 
                        id="color-select"
                        className="color-dropdown"
                        value={selectedColor}
                        onChange={(e) => handleColorChange(parseInt(e.target.value))}
                      >
                        {product.colors.map((color, idx) => (
                          <option key={idx} value={idx}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <button className="select-size-btn" onClick={() => setOpen('size')}>
                {product.category && ['tote-bags', 'caps', 'wallets', 'backpack', 'home-decor', 'accessories-new-arrival', 'accessories-new-collection'].includes(product.category) ? 'SELECT QUANTITY' : 'SELECT SIZE'}
              </button>

              {/* Accordion */}
              <div className="accordion">
                <div className={`accordion-item ${accordionOpen === 'description' ? 'active' : ''}`}>
                  <button className="accordion-header" onClick={() => setAccordionOpen(accordionOpen === 'description' ? null : 'description')}>
                    <span>DESCRIPTION</span>
                    <svg className="accordion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2"/></svg>
                  </button>
                  <div className="accordion-content">
                    <p style={{whiteSpace: 'pre-line'}}>{product.description || 'An premium quality product crafted for comfort and style. Features distinctive design for a unique look.'}</p>
                    <p className="section-title"></p>
                  </div>
                </div>

                <div className={`accordion-item ${accordionOpen === 'sizefit' ? 'active' : ''}`}>
                  <button className="accordion-header" onClick={() => setAccordionOpen(accordionOpen === 'sizefit' ? null : 'sizefit')}>
                    <span>SIZE & FIT</span>
                    <svg className="accordion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2"/></svg>
                  </button>
                  <div className="accordion-content">
                    <p style={{whiteSpace: 'pre-line'}}>{product.size_fit || 'Size and fit information not available.'}</p>
                  </div>
                </div>

                <div className={`accordion-item ${accordionOpen === 'care' ? 'active' : ''}`}>
                  <button className="accordion-header" onClick={() => setAccordionOpen(accordionOpen === 'care' ? null : 'care')}>
                    <span>CARE & MAINTENANCE</span>
                    <svg className="accordion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2"/></svg>
                  </button>
                  <div className="accordion-content">
                    <p style={{whiteSpace: 'pre-line'}}>{product.care_maintenance || 'Care and maintenance information not available.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Overlay & Side Panels */}
      {open && (
        <div className={`overlay ${open ? 'active' : ''}`} onClick={(e) => { if(e.target.classList.contains('overlay')) setOpen(null) }}>
          {/* SELECT SIZE PANEL */}
          {open === 'size' && (
            <div className="side-panel">
              <div className="panel-header">
                <h2>{product.category && ['tote-bags', 'caps', 'wallets', 'backpack', 'home-decor', 'accessories-new-arrival', 'accessories-new-collection'].includes(product.category) ? 'SELECT QUANTITY' : 'SELECT SIZE'}</h2>
                <div className="panel-actions">
                  <button className={`favorite-btn ${isInWishlist ? 'active' : ''}`} onClick={addToWishlist}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isInWishlist ? 'red' : 'none'} stroke={isInWishlist ? 'red' : 'currentColor'} strokeWidth="2">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                  <button className="panel-close" onClick={() => setOpen(null)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              {(() => {
                // Check if product has numeric sizes (joggers/shorts)
                const sizes = getAvailableSizes()
                const hasNumericSizes = sizes.length > 0 && sizes.every(s => !isNaN(parseInt(s.size)))
                // Hide size guide for accessories and numeric-sized products (joggers/shorts)
                const hideGuide = (product.category && ['tote-bags', 'caps', 'wallets', 'backpack', 'home-decor', 'accessories-new-arrival', 'accessories-new-collection'].includes(product.category)) || hasNumericSizes
                return !hideGuide && (
                  <button className="size-guide" onClick={() => setOpen('sizeguide')}>SIZE GUIDE</button>
                )
              })()}

              {product.category && ['tote-bags', 'caps', 'wallets', 'backpack', 'home-decor', 'accessories-new-arrival', 'accessories-new-collection'].includes(product.category) ? (
                // Quantity selector for accessories (no sizes)
                <div className="size-options">
                  <div className="size-option" data-available={true}>
                    <div className="size-label">QUANTITY</div>
                    <div className="quantity-controls">
                      <button className="qty-btn" disabled={(quantities['ONE_SIZE'] || 0) <= 0} onClick={() => updateQty('ONE_SIZE', -1)}>−</button>
                      <span className="qty-value">{quantities['ONE_SIZE'] || 0}</span>
                      <button className="qty-btn" disabled={(quantities['ONE_SIZE'] || 0) >= 99} onClick={() => updateQty('ONE_SIZE', 1)}>+</button>
                    </div>
                    <span className="availability-text available">ITEMS AVAILABLE</span>
                  </div>
                </div>
              ) : (
                // Size selector for clothing
              <div className="size-options">
                {getAvailableSizes().map((sizeInfo) => {
                  const qty = quantities[sizeInfo.size] || 0
                  const maxQty = sizeInfo.available ? sizeInfo.stock : 0
                  // Check if size is numeric (for joggers, shorts, etc.)
                  const isNumericSize = !isNaN(parseInt(sizeInfo.size))
                  return (
                    <div key={sizeInfo.size} className="size-option" data-available={sizeInfo.available}>
                      <div className="size-label">{isNumericSize ? sizeInfo.size : `US / ${sizeInfo.size}`}</div>
                      <div className="quantity-controls">
                        <button className="qty-btn" disabled={qty <= 0} onClick={() => updateQty(sizeInfo.size, -1)}>−</button>
                        <span className="qty-value">{qty}</span>
                        <button className="qty-btn" disabled={!sizeInfo.available || qty >= maxQty} onClick={() => updateQty(sizeInfo.size, 1)}>+</button>
                      </div>
                      {sizeInfo.available && sizeInfo.stock > 0 ? (
                        <span className="availability-text available">ITEMS AVAILABLE</span>
                      ) : (
                        <span className="availability-text unavailable">ITEMS UNAVAILABLE</span>
                      )}
                    </div>
                  )
                })}
              </div>
              )}

              <div className="panel-footer">
                <button className="add-to-bag" onClick={addToBag}>ADD TO BAG</button>
              </div>
            </div>
          )}

          {/* SIZE GUIDE PANEL */}
          {open === 'sizeguide' && (
            <div className="side-panel">
              <div className="panel-header">
                <h2>SIZE GUIDE</h2>
                <div className="panel-actions">
                  <button className="panel-close" onClick={() => setOpen('size')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <div className="unit-toggle-container">
                <div className="unit-toggle">
                  <span className={`unit-label ${unitCm ? 'active' : ''}`} onClick={() => setUnitCm(true)}>CM</span>
                  <button className={`toggle-switch ${!unitCm ? 'active' : ''}`} onClick={() => setUnitCm(!unitCm)}>
                    <span className="toggle-slider"></span>
                  </button>
                  <span className={`unit-label ${!unitCm ? 'active' : ''}`} onClick={() => setUnitCm(false)}>IN</span>
                </div>
              </div>

              <div className="size-chart-container">
                <img src={unitCm ? '/assets/images/teecm.png' : '/assets/images/teeinch.png'} alt="Size chart" className="size-chart-img" />
              </div>
            </div>
          )}

          {/* SHOPPING BAG PANEL */}
          {open === 'bag' && (
            <div className="side-panel">
              <div className="panel-header">
                <h2>SHOPPING BAG</h2>
                <div className="panel-actions">
                  <button className="panel-close" onClick={() => setOpen(null)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <div className="bag-content">
                {bagItems.length === 0 ? (
                  <div className="bag-empty">Your bag is empty</div>
                ) : (
                  <>
                    {bagItems.map(item => (
                      <div key={item.id} className="bag-item">
                        <button className="bag-item-remove" onClick={() => removeFromBag(item.id)} aria-label="Remove item">✕</button>
                        <img src={item.img} alt={item.title} />
                        <div className="bag-item-info">
                          <div className="bag-item-title">{item.title}</div>
                          <div className="bag-item-details">{item.color} | {item.size} | Qty: {item.qty}</div>
                          <div className="bag-item-price">{formatPrice(item.price * item.qty)}</div>
                        </div>
                      </div>
                    ))}
                    <div className="bag-total">
                      <div className="bag-total-label">TOTAL</div>
                      <div className="bag-total-price">{formatPrice(subtotal)}</div>
                    </div>
                  </>
                )}
              </div>

              {bagItems.length > 0 && (
                <div className="panel-footer">
                  <button className="add-to-bag" onClick={checkout}>CHECKOUT</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image Modal - fullscreen scrollable gallery */}
      {showImageModal && product && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <button className="modal-close-btn" onClick={closeImageModal}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-column">
              {product.images.map((imgSrc, idx) => (
                <img 
                  key={idx} 
                  src={imgSrc} 
                  alt={`${product.title} ${idx+1}`}
                  ref={el => {
                    if (el && idx === clickedImageIndex && showImageModal) {
                      el.scrollIntoView({ behavior: 'instant', block: 'center' })
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
