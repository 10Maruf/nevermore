import React, { useState, useEffect } from "react"
import { getApiUrl, resolveBackendUrl } from '../../config/api'

export default function ProductForm({ mode = 'add', productId = null, onSuccess, onCancel }) {
  const standardSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
  const shortsSizes = ["28", "30", "32", "34", "36", "38", "40", "42"]
  const accessorySizes = ["ONE SIZE"]
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedItem, setSelectedItem] = useState('')
  const [customColors, setCustomColors] = useState([])
  const [showAddColor, setShowAddColor] = useState(false)
  const [newColorName, setNewColorName] = useState('')
  const [draggedImageIndex, setDraggedImageIndex] = useState(null)
  const [availableColors, setAvailableColors] = useState([])
  const [selectedVariantId, setSelectedVariantId] = useState(null)
  const [productVariants, setProductVariants] = useState([])
  
  const [formData, setFormData] = useState({
    name: "",
    category_slug: "",
    description: "",
    base_price: "",
    color: "",
    sizeQuantities: {},
    images: [],
    size_fit: "",
    care_maintenance: ""
  })

  // Predefined color options
  const colorOptions = [
    { name: "Black", value: "Black" },
    { name: "White", value: "White" },
    { name: "Gray", value: "Gray" },
    { name: "Brown", value: "Brown" },
    { name: "Navy", value: "Navy" },
    { name: "Blue", value: "Blue" },
    { name: "Red", value: "Red" },
    { name: "Green", value: "Green" },
    { name: "Yellow", value: "Yellow" },
    { name: "Orange", value: "Orange" },
    { name: "Pink", value: "Pink" },
    { name: "Purple", value: "Purple" },
    { name: "Maroon", value: "Maroon" },
    { name: "Olive", value: "Olive" },
  ]

  // Category structure
  const categoryStructure = {
    men: {
      label: 'Men',
      items: [
        { id: 'men-tees', name: 'Tees', page: '/men/tees' },
        { id: 'men-hoodies', name: 'Hoodies', page: '/men/hoodies' },
        { id: 'men-sweatshirts', name: 'Sweatshirts', page: '/men/sweatshirts' },
        { id: 'men-tanktops', name: 'Tank Tops', page: '/men/tanktops' },
        { id: 'men-shorts', name: 'Shorts', page: '/men/shorts' },
        { id: 'men-joggers', name: 'Joggers', page: '/men/joggers' },
        { id: 'men-polo-shirt', name: 'Polo Shirt', page: '/men/polo-shirt' },
        { id: 'men-windbreaker', name: 'Windbreaker', page: '/men/windbreaker' },
        { id: 'men-new-collection', name: 'New Collection', page: '/men/new-arrival' }
      ]
    },
    women: {
      label: 'Women',
      items: [
        { id: 'women-tees', name: 'Tees', page: '/women/tees' },
        { id: 'women-hoodies', name: 'Hoodies', page: '/women/hoodies' },
        { id: 'women-sweatshirts', name: 'Sweatshirts', page: '/women/sweatshirts' },
        { id: 'women-tanktops', name: 'Tank Tops', page: '/women/tanktops' },
        { id: 'women-shorts', name: 'Shorts', page: '/women/shorts' },
        { id: 'women-joggers', name: 'Joggers', page: '/women/joggers' },
        { id: 'women-polo-shirt', name: 'Polo Shirt', page: '/women/polo-shirt' },
        { id: 'women-windbreaker', name: 'Windbreaker', page: '/women/windbreaker' },
        { id: 'women-new-collection', name: 'New Collection', page: '/women/new-arrival' }
      ]
    },
    accessories: {
      label: 'Accessories',
      items: [
        { id: 'caps', name: 'Caps', page: '/accessories/cap' },
        { id: 'wallets', name: 'Wallets', page: '/accessories/wallet' },
        { id: 'tote-bags', name: 'Tote Bags', page: '/accessories/tote' },
        { id: 'backpack', name: 'Backpack', page: '/accessories/backpack' },
        { id: 'home-decor', name: 'Home & Decor', page: '/accessories/home-decor' },
        { id: 'accessories-new-collection', name: 'New Collection', page: '/accessories/new-arrival' }
      ]
    }
  }

  // Get sizes based on selected item
  const getSizesForItem = () => {
    if (selectedItem.includes('shorts') || selectedItem.includes('joggers')) {
      return shortsSizes
    } else if (selectedCategory === 'accessories') {
      return accessorySizes
    } else {
      return standardSizes
    }
  }

  const currentSizes = getSizesForItem()

  // Parse category_slug to set selectedCategory and selectedItem in edit mode
  useEffect(() => {
    if (formData.category_slug) {
      // Find which category this belongs to
      for (const [catKey, catData] of Object.entries(categoryStructure)) {
        const item = catData.items.find(i => i.id === formData.category_slug)
        if (item) {
          setSelectedCategory(catKey)
          setSelectedItem(item.id)
          break
        }
      }
    }
  }, [formData.category_slug])

  // Update category_slug when category and item are selected
  useEffect(() => {
    if (selectedCategory && selectedItem) {
      setFormData(prev => ({
        ...prev,
        category_slug: selectedItem
      }))
    }
  }, [selectedCategory, selectedItem])

  // Load custom colors from localStorage
  useEffect(() => {
    const savedColors = localStorage.getItem('customColors')
    if (savedColors) {
      setCustomColors(JSON.parse(savedColors))
    }
  }, [])

  // Fetch product data in edit mode
  useEffect(() => {
    if (mode === 'edit' && productId) {
      fetchProductData()
    }
  }, [mode, productId])

  const fetchProductData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl(`/api/products/products.php?id=${productId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      
      if (data.status === 'success' && data.data?.product) {
        const product = data.data.product
        
        // Store all variants for color switching
        setProductVariants(product.variants || [])
        
        // Extract unique colors from variants
        const colors = [...new Set((product.variants || []).map(v => v.color).filter(Boolean))]
        setAvailableColors(colors)
        
        // Load first variant's data by default
        if (product.variants && product.variants.length > 0) {
          loadVariantData(product, product.variants[0])
        }
        
        // Set common product data that doesn't change between variants
        setFormData(prev => ({
          ...prev,
          name: product.name || '',
          category_slug: product.category_slug || '',
          description: product.description || '',
          base_price: product.base_price || '',
          size_fit: product.size_fit || '',
          care_maintenance: product.care_maintenance || ''
        }))
      } else {
        setError('Failed to load product data')
      }
    } catch (err) {
      console.error('Error fetching product:', err)
      setError('Failed to load product data')
    } finally {
      setLoading(false)
    }
  }
  
  const loadVariantData = (product, variant) => {
    // Build size quantities from this variant's inventory
    const sizeQuantities = {}
    if (variant.inventory && variant.inventory.length > 0) {
      variant.inventory.forEach(inv => {
        sizeQuantities[inv.size] = inv.quantity
      })
    }
    
    // Format images from this variant and sort by order
    const images = variant.images && variant.images.length > 0 
      ? variant.images
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((img, idx) => {
            let fullUrl = ''
            if (img.url) {
              fullUrl = resolveBackendUrl(img.url)
            }
            
            return {
              id: `existing-${idx}`,
              name: img.url ? img.url.split('/').pop() : `Image ${idx + 1}`,
              url: fullUrl || '/assets/placeholders/no-image.png',
              serverUrl: img.url || ''
            }
          })
          .filter(img => img.url && img.url !== '/assets/placeholders/no-image.png')
      : []

    setFormData(prev => ({
      ...prev,
      color: variant.color || '',
      sizeQuantities: sizeQuantities,
      images: images
    }))
    
    setSelectedVariantId(variant.variant_id)
  }
  
  const handleColorSwitch = (color) => {
    // Find the variant with the selected color
    const variant = productVariants.find(v => v.color === color)
    if (variant) {
      // Load this variant's data
      const product = {
        name: formData.name,
        category_slug: formData.category_slug,
        description: formData.description,
        base_price: formData.base_price,
        size_fit: formData.size_fit,
        care_maintenance: formData.care_maintenance
      }
      loadVariantData(product, variant)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSizeQuantityChange = (size, quantity) => {
    const qty = parseInt(quantity) || 0
    setFormData((prev) => ({
      ...prev,
      sizeQuantities: {
        ...prev.sizeQuantities,
        [size]: qty,
      },
    }))
  }

  const handleAddCustomColor = () => {
    if (newColorName.trim()) {
      const updatedColors = [...customColors, newColorName.trim()]
      setCustomColors(updatedColors)
      localStorage.setItem('customColors', JSON.stringify(updatedColors))
      setFormData(prev => ({ ...prev, color: newColorName.trim() }))
      setNewColorName('')
      setShowAddColor(false)
      setSuccess('Color added successfully!')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  const handleDragStart = (index) => {
    setDraggedImageIndex(index)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (dropIndex) => {
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) return
    
    const updatedImages = [...formData.images]
    const draggedImage = updatedImages[draggedImageIndex]
    updatedImages.splice(draggedImageIndex, 1)
    updatedImages.splice(dropIndex, 0, draggedImage)
    
    setFormData(prev => ({ ...prev, images: updatedImages }))
    setDraggedImageIndex(null)
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    if (files.length === 0) return
    
    // Check if adding these files would exceed the limit
    if (formData.images.length + files.length > 6) {
      setError('Maximum 6 images allowed per product')
      e.target.value = ''
      return
    }
    
    setLoading(true)
    const uploadedImages = []
    
    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      
      for (const file of files) {
        // Validate file type
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
          setError(`Invalid file type: ${file.name}. Only JPG, PNG, and WEBP allowed.`)
          continue
        }
        
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError(`File too large: ${file.name}. Maximum 5MB.`)
          continue
        }
        
        // Create FormData for upload
        const formData = new FormData()
        formData.append('image', file)
        
        // Upload image
        const response = await fetch(getApiUrl('/api/admin/upload_image.php'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })
        
        const data = await response.json()
        
        if (data.status === 'success') {
          uploadedImages.push({
            id: Date.now() + Math.random(),
            name: data.data.filename,
            url: resolveBackendUrl(data.data.image_url),
            serverUrl: data.data.image_url
          })
        } else {
          setError(data.message || `Failed to upload ${file.name}`)
        }
      }
      
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedImages],
      }))
      
      if (uploadedImages.length > 0) {
        setSuccess(`${uploadedImages.length} image(s) uploaded successfully!`)
        setTimeout(() => setSuccess(''), 3000)
      }
      
    } catch (err) {
      console.error('Image upload error:', err)
      setError('Failed to upload images. Please try again.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const handleRemoveImage = (imageId) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }))
  }

  const handleSubmit = async () => {
    setError('')
    setSuccess('')

    // Validation
    if (!formData.name || !formData.category_slug || !formData.base_price) {
      setError('Product name, category, and price are required')
      return
    }

    if (!formData.color) {
      setError('Please select a color')
      return
    }

    if (formData.images.length === 0) {
      setError('At least one product image is required')
      return
    }

    const hasQuantity = Object.values(formData.sizeQuantities).some(q => q > 0)
    if (!hasQuantity) {
      setError('Please add at least one size with quantity')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      // Map images with their order (index)
      const imageUrls = formData.images.map((img, index) => ({
        url: img.serverUrl,
        order: index
      }))
      
      const sizesData = Object.entries(formData.sizeQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([size, qty]) => ({ size, quantity: parseInt(qty) }))

      let productData = {
        name: formData.name,
        category_slug: formData.category_slug,
        description: formData.description,
        base_price: parseFloat(formData.base_price),
        color: formData.color || null,
        sizes: sizesData,
        images: imageUrls,
        size_fit: formData.size_fit || '',
        care_maintenance: formData.care_maintenance || ''
      }

      // For edit mode, add product_id and variant_id to update specific variant
      if (mode === 'edit') {
        productData.product_id = productId
        if (selectedVariantId) {
          productData.variant_id = selectedVariantId
        }
      }

      const url = getApiUrl('/api/products/manage.php')
      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess(mode === 'edit' ? 'Product updated successfully!' : 'Product added successfully!')
        setTimeout(() => {
          if (onSuccess) onSuccess()
        }, 1500)
      } else {
        setError(data.message || `Failed to ${mode === 'edit' ? 'update' : 'add'} product`)
      }
    } catch (err) {
      console.error(`${mode} product error:`, err)
      setError(`Failed to ${mode === 'edit' ? 'update' : 'add'} product. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && mode === 'edit' && !formData.name) {
    return <div style={{padding: '40px', textAlign: 'center'}}>Loading product data...</div>
  }

  return (
    <div>
      <h2 style={{marginBottom: '20px', color: '#000'}}>{mode === 'edit' ? 'MODIFY PRODUCT' : 'ADD NEW PRODUCT'}</h2>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="form-group">
        <label>Product Name *</label>
        <input
          type="text"
          name="name"
          placeholder="e.g., T-shirt"
          value={formData.name}
          onChange={handleInputChange}
          className="form-control"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Category *</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setSelectedItem('')
              setFormData(prev => ({ ...prev, category_slug: '', sizeQuantities: {} }))
            }}
            className="form-control"
          >
            <option value="">Select Category</option>
            {Object.entries(categoryStructure).map(([key, cat]) => (
              <option key={key} value={key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Item *</label>
          <select 
            value={selectedItem} 
            onChange={(e) => {
              setSelectedItem(e.target.value)
              setFormData(prev => ({ ...prev, sizeQuantities: {} }))
            }}
            disabled={!selectedCategory}
            className="form-control"
          >
            <option value="">Select Item</option>
            {selectedCategory && categoryStructure[selectedCategory].items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {selectedItem && (
            <small>Product will appear on: {categoryStructure[selectedCategory]?.items.find(i => i.id === selectedItem)?.page}</small>
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Color *</label>
        {mode === 'edit' && availableColors.length > 1 ? (
          <>
            <div style={{marginBottom: '10px', padding: '10px', background: '#f0f0f0', borderRadius: '4px'}}>
              <small style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>
                This product has {availableColors.length} color variants. Select a color to view and edit its data:
              </small>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSwitch(color)}
                    className={formData.color === color ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: formData.color === color ? '#007bff' : '#6c757d',
                      border: 'none',
                      borderRadius: '4px',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              name="color"
              value={formData.color}
              className="form-control"
              disabled
              style={{backgroundColor: '#e9ecef'}}
            />
          </>
        ) : (
          <>
            <select
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="form-control"
            >
              <option value="">Select Color</option>
              {colorOptions.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.name}
                </option>
              ))}
              {customColors.map((color, idx) => (
                <option key={`custom-${idx}`} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddColor(!showAddColor)}
              className="btn btn-secondary"
              style={{marginTop: '10px', padding: '8px 16px'}}
            >
              {showAddColor ? 'Cancel' : 'Add Custom Color'}
            </button>
            {showAddColor && (
              <div style={{marginTop: '10px', display: 'flex', gap: '10px'}}>
                <input
                  type="text"
                  placeholder="Enter color name"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="form-control"
                  style={{flex: 1}}
                />
                <button
                  type="button"
                  onClick={handleAddCustomColor}
                  className="btn btn-success"
                  style={{padding: '8px 16px'}}
                >
                  Save
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="form-group">
        <label>Price (TK) *</label>
        <input
          type="number"
          name="base_price"
          placeholder="e.g., 780.00"
          value={formData.base_price}
          onChange={handleInputChange}
          className="form-control"
          step="0.01"
          min="0"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          placeholder="Product description..."
          value={formData.description}
          onChange={handleInputChange}
          className="form-control"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Size & Quantity *</label>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px'}}>
          {currentSizes.map((size) => (
            <div key={size}>
              <label>{size}</label>
              <input
                type="number"
                placeholder="Qty"
                value={formData.sizeQuantities[size] || ""}
                onChange={(e) => handleSizeQuantityChange(size, e.target.value)}
                min="0"
                max="1000"
              />
            </div>
          ))}
        </div>
        <small>Enter quantity for each available size. Leave 0 or empty for unavailable sizes.</small>
      </div>

      <div className="form-group">
        <label>Size & Fit</label>
        <textarea
          name="size_fit"
          placeholder="Model is wearing size Medium..."
          value={formData.size_fit}
          onChange={handleInputChange}
          className="form-control"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Care & Maintenance</label>
        <textarea
          name="care_maintenance"
          placeholder="Machine wash cold..."
          value={formData.care_maintenance}
          onChange={handleInputChange}
          className="form-control"
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Product Images * (Upload 1-6 images)</label>
        <div style={{marginBottom: '10px'}}>
          <input
            type="file"
            id="product-images-upload"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleImageUpload}
            style={{display: 'none'}}
            disabled={formData.images.length >= 6 || loading}
          />
          <button
            type="button"
            onClick={() => document.getElementById('product-images-upload').click()}
            className="btn btn-secondary"
            disabled={formData.images.length >= 6 || loading}
            style={{padding: '10px 20px', cursor: 'pointer'}}
          >
            {loading ? 'Uploading...' : 'Choose Files'}
          </button>
        </div>

        {formData.images.length > 0 && (
          <div className="images-preview">
            {formData.images.map((image, index) => (
              <div 
                key={image.id} 
                className="image-item"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                style={{cursor: 'move'}}
              >
                <div style={{position: 'absolute', top: '5px', left: '5px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px'}}>
                  {index + 1}
                </div>
                <img src={image.url} alt={image.name} />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(image.id)}
                  className="remove-image-btn"
                >
                  ×
                </button>
                <p>{image.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-success"
          style={{padding: '8px 20px', fontSize: '14px', backgroundColor: '#28a745', border: 'none'}}
        >
          {loading ? 'Processing...' : (mode === 'edit' ? 'UPDATE PRODUCT' : 'PUBLISH PRODUCT')}
        </button>
        
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn btn-secondary"
            style={{padding: '8px 20px', fontSize: '14px'}}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
