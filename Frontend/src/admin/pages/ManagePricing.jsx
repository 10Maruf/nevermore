import React, { useState, useEffect } from "react"
import { getApiUrl } from '../../config/api'
import "./ManagePricing.css"
import { formatTk } from "../format"

export default function ManagePricing() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedProduct, setSelectedProduct] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch(getApiUrl('/api/products/categories.php'))
      const data = await response.json()
      
      if (data.status === 'success') {
        // Handle both array and object responses
        const categoriesArray = Array.isArray(data.data) ? data.data : (data.data?.categories || [])
        setCategories(categoriesArray)
        console.log('Categories set:', categoriesArray.length)
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      console.log('Fetching products with token:', token ? 'exists' : 'missing')
      
      const response = await fetch(getApiUrl('/api/products/manage.php'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Products data:', data)
      
      if (data.status === 'success') {
        // Handle both array and object responses
        const productsArray = Array.isArray(data.data) ? data.data : (data.data?.products || [])
        setProducts(productsArray)
        console.log('Products set:', productsArray.length)
      } else {
        setError('Failed to load products')
        console.error('API error:', data.message)
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePrice = async () => {
    setError('')
    setSuccess('')

    if (!selectedProduct) {
      setError('Please select a product')
      return
    }

    if (!newPrice || parseFloat(newPrice) <= 0) {
      setError('Please enter a valid price')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl('/api/products/manage.php'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: parseInt(selectedProduct),
          base_price: parseFloat(newPrice)
        })
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess('Price updated successfully!')
        setNewPrice('')
        setSelectedProduct('')
        setSelectedCategory('') // Reset category too
        fetchProducts() // Refresh product list
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to update price')
      }
    } catch (err) {
      console.error('Error updating price:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedProductData = products.find(p => p.id === parseInt(selectedProduct))
  
  // Filter products by selected category
  const filteredProducts = selectedCategory 
    ? products.filter(p => p.category_slug === selectedCategory)
    : []

  console.log('Component rendering - products count:', products.length)
  console.log('Selected category:', selectedCategory, 'Filtered:', filteredProducts.length)
  console.log('Loading:', loading, 'Error:', error, 'Success:', success)

  return (
    <div className="page-container" style={{background: '#fff', padding: '20px', minHeight: '100vh'}}>
      <h1 style={{color: '#000'}}>Manage Pricing</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      
      {loading && <p style={{color: '#000'}}>Loading products...</p>}

      <div className="pricing-form">
        <h2>Update Product Price</h2>

        <div className="form-group">
          <label>Select Category *</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => {
              setSelectedCategory(e.target.value)
              setSelectedProduct("") // Reset product selection when category changes
            }}
            disabled={loading}
          >
            <option value="">-- Select a Category --</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Select Product *</label>
          <select 
            value={selectedProduct} 
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={loading || !selectedCategory}
          >
            <option value="">
              {selectedCategory ? '-- Select a Product --' : '-- Select Category First --'}
            </option>
            {filteredProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (Current: {formatTk(product.base_price)})
              </option>
            ))}
          </select>
        </div>

        {selectedProductData && (
          <div className="form-group" style={{background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '15px'}}>
            <h3 style={{margin: '0 0 10px 0', color: '#333'}}>Current Product Details</h3>
            <p style={{margin: '5px 0', color: '#000'}}><strong>Name:</strong> {selectedProductData.name}</p>
            <p style={{margin: '5px 0', color: '#000'}}><strong>Category:</strong> {selectedProductData.category_name}</p>
            <p style={{margin: '5px 0', color: '#000'}}><strong>Current Price:</strong> {formatTk(selectedProductData.base_price)}</p>
            <p style={{margin: '5px 0', color: '#000'}}><strong>Total Stock:</strong> {selectedProductData.total_quantity || 0} units</p>
          </div>
        )}

        <div className="form-group">
          <label>New Price (BDT) *</label>
          <input
            type="number"
            placeholder="Enter new price"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            step="0.01"
            min="0"
            disabled={loading}
          />
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleUpdatePrice}
          disabled={loading || !selectedProduct || !newPrice}
        >
          {loading ? 'Updating...' : 'Update Price'}
        </button>
      </div>

      <div className="pricing-table">
        <h2>All Products by Category</h2>
        
        {categories.map((category) => {
          const categoryProducts = products.filter(p => p.category_slug === category.slug)
          
          if (categoryProducts.length === 0) return null
          
          return (
            <div key={category.slug} style={{marginBottom: '30px'}}>
              <h3 style={{color: '#2c5282', marginBottom: '15px', fontSize: '18px'}}>
                {category.name} ({categoryProducts.length} products)
              </h3>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Colors</th>
                      <th>Total Stock</th>
                      <th>Current Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>
                        {p.colors ? (
                          <span style={{ color: '#000' }}>
                            {typeof p.colors === 'string' ? p.colors : p.colors.join(', ')}
                          </span>
                        ) : (
                          <span style={{ color: '#999' }}>No color</span>
                        )}
                      </td>
                      <td>{p.total_quantity || 0}</td>
                      <td style={{fontWeight: 'bold', color: '#2c5282'}}>{formatTk(p.base_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )
        })}
        
        {products.length === 0 && (
          <p style={{textAlign: 'center', padding: '20px', color: '#999'}}>
            No products found
          </p>
        )}
      </div>
    </div>
  )
}
