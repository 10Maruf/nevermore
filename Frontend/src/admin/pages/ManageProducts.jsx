import React, { useState, useEffect } from "react"
import { getApiUrl } from '../../config/api'
import ProductForm from '../components/ProductForm'
import "./ManageProducts.css"

export default function ManageProducts() {
  const [products, setProducts] = useState([])
  const [viewInventoryModal, setViewInventoryModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productInventory, setProductInventory] = useState([])
  const [editMode, setEditMode] = useState(false)
  const [editProductId, setEditProductId] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // Predefined categories for the ProductForm component
  const predefinedCategories = [
    { id: 'men-tees', name: "Men's Tees", page: '/men/tees' },
    { id: 'men-hoodies', name: "Men's Hoodies", page: '/men/hoodies' },
    { id: 'men-sweatshirts', name: "Men's Sweatshirts", page: '/men/sweatshirts' },
    { id: 'men-tanktops', name: "Men's Tank Tops", page: '/men/tanktops' },
    { id: 'men-shorts', name: "Men's Shorts", page: '/men/shorts' },
    { id: 'men-joggers', name: "Men's Joggers", page: '/men/joggers' },
    { id: 'men-polo-shirt', name: "Men's Polo Shirt", page: '/men/polo-shirt' },
    { id: 'men-windbreaker', name: "Men's Windbreaker", page: '/men/windbreaker' },
    { id: 'men-new-collection', name: "Men's New Collection", page: '/men/new-arrival' },
    { id: 'women-tees', name: "Women's Tees", page: '/women/tees' },
    { id: 'women-hoodies', name: "Women's Hoodies", page: '/women/hoodies' },
    { id: 'women-sweatshirts', name: "Women's Sweatshirts", page: '/women/sweatshirts' },
    { id: 'women-tanktops', name: "Women's Tank Tops", page: '/women/tanktops' },
    { id: 'women-shorts', name: "Women's Shorts", page: '/women/shorts' },
    { id: 'women-joggers', name: "Women's Joggers", page: '/women/joggers' },
    { id: 'women-polo-shirt', name: "Women's Polo Shirt", page: '/women/polo-shirt' },
    { id: 'women-windbreaker', name: "Women's Windbreaker", page: '/women/windbreaker' },
    { id: 'women-new-collection', name: "Women's New Collection", page: '/women/new-arrival' },
    { id: 'caps', name: 'Caps', page: '/accessories/cap' },
    { id: 'tote-bags', name: 'Tote Bags', page: '/accessories/tote' },
    { id: 'wallets', name: 'Wallets', page: '/accessories/wallet' },
    { id: 'backpack', name: 'Backpack', page: '/accessories/backpack' },
    { id: 'home-decor', name: 'Home & Decor', page: '/accessories/home-decor' },
    { id: 'accessories-new-collection', name: "Accessories New Collection", page: '/accessories/new-arrival' }
  ]

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl('/api/products/manage.php'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      if (data.status === 'success') {
        setProducts(data.data.products)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    }
  }

  // Fetch products on mount
  useEffect(() => {
    fetchProducts()
  }, [])

  const handleFormSuccess = () => {
    fetchProducts()
    setEditMode(false)
    setEditProductId(null)
    setShowAddForm(false)
  }

  const handleFormCancel = () => {
    setEditMode(false)
    setEditProductId(null)
    setShowAddForm(false)
  }

  const handleModifyProduct = (productId) => {
    setEditProductId(productId)
    setEditMode(true)
    setShowAddForm(false)
  }

  const handleAddNewProduct = () => {
    setShowAddForm(true)
    setEditMode(false)
    setEditProductId(null)
  }

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this entire product and all its variants?')) {
      return
    }

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(
        getApiUrl(`/api/products/manage.php?product_id=${productId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (data.status === 'success') {
        alert('Product deleted successfully!')
        fetchProducts()
      } else {
        alert(data.message || 'Failed to delete product')
      }
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Network error. Please try again.')
    }
  }

  const handleViewInventory = async (product) => {
    setSelectedProduct(product)
    
    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(
        getApiUrl(`/api/products/products.php?id=${product.id}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      
      const data = await response.json()
      
      if (data.status === 'success' && data.data.product) {
        // Group inventory by color
        const inventoryByColor = {}
        
        data.data.product.variants.forEach(variant => {
          const color = variant.color || 'No Color'
          if (!inventoryByColor[color]) {
            inventoryByColor[color] = {
              variantId: variant.variant_id,
              color: color,
              inventory: []
            }
          }
          
          if (variant.inventory) {
            variant.inventory.forEach(inv => {
              inventoryByColor[color].inventory.push({
                size: inv.size,
                quantity: inv.quantity,
                available: inv.available
              })
            })
          }
        })
        
        setProductInventory(Object.values(inventoryByColor))
        setViewInventoryModal(true)
      } else {
        alert('Failed to load inventory')
      }
    } catch (err) {
      console.error('Error fetching inventory:', err)
      alert('Failed to load inventory')
    }
  }

  const handleDeleteVariant = async (variantId, color) => {
    if (!window.confirm(`Are you sure you want to delete the ${color} variant?`)) {
      return
    }

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(
        getApiUrl(`/api/products/manage.php?variant_id=${variantId}`),
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (data.status === 'success') {
        alert(`${color} variant deleted successfully!`)
        // Refresh inventory view
        handleViewInventory(selectedProduct)
        fetchProducts()
      } else {
        alert(data.message || 'Failed to delete variant')
      }
    } catch (err) {
      console.error('Error deleting variant:', err)
      alert('Network error. Please try again.')
    }
  }

  return (
    <div className="page-container">
      <h1>Manage Products & Categories</h1>

      {/* Show Add New Product button when not in any form mode */}
      {!showAddForm && !editMode && (
        <button className="btn btn-primary" onClick={handleAddNewProduct} style={{marginBottom: '20px'}}>
          Add New Product
        </button>
      )}

      {/* Show Add Form */}
      {showAddForm && (
        <div style={{marginBottom: '40px'}}>
          <ProductForm
            mode="add"
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* Show Edit Form */}
      {editMode && editProductId && (
        <div style={{marginBottom: '40px'}}>
          <ProductForm
            mode="edit"
            productId={editProductId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      <div className="products-table-container">
        <h2>Existing Products</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Color</th>
                <th>Price</th>
                <th>Total Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                    No products added yet
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                const category = predefinedCategories.find(c => c.id === p.category_slug)
                return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{category ? category.name : p.category_slug}</td>
                  <td>
                    {p.colors && p.colors.length > 0 ? (
                      <span style={{ color: '#000' }}>{p.colors.join(', ')}</span>
                    ) : (
                      <span style={{ color: '#999' }}>No color</span>
                    )}
                  </td>
                  <td>TK {parseFloat(p.base_price).toFixed(2)} BDT</td>
                  <td>{p.total_quantity || 0}</td>
                  <td>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => handleModifyProduct(p.id)}
                      style={{marginRight: '5px'}}
                    >
                      Modify
                    </button>
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDeleteProduct(p.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Inventory View Modal */}
      {viewInventoryModal && (
        <div className="modal-overlay" onClick={() => setViewInventoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px', maxHeight: '80vh', overflow: 'auto'}}>
            <div className="modal-header">
              <h2>Inventory for {selectedProduct?.name}</h2>
              <button className="modal-close" onClick={() => setViewInventoryModal(false)}>×</button>
            </div>
            
            <div className="modal-body" style={{padding: '20px'}}>
              {productInventory.length === 0 ? (
                <p>No inventory found for this product.</p>
              ) : (
                productInventory.map((colorGroup, idx) => (
                  <div key={idx} style={{marginBottom: '30px', border: '1px solid #ddd', borderRadius: '8px', padding: '15px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                      <h3 style={{margin: 0, color: '#000'}}>Color: {colorGroup.color}</h3>
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteVariant(colorGroup.variantId, colorGroup.color)}
                      >
                        Delete Variant
                      </button>
                    </div>
                    
                    <div className="table-scroll">
                      <table style={{width: '100%', minWidth: '400px', borderCollapse: 'collapse'}}>
                        <thead>
                          <tr style={{background: '#f5f5f5'}}>
                            <th style={{padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', color: '#000'}}>Size</th>
                            <th style={{padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', color: '#000'}}>Quantity</th>
                          </tr>
                        </thead>
                      <tbody>
                        {colorGroup.inventory.length === 0 ? (
                          <tr>
                            <td colSpan="2" style={{padding: '10px', textAlign: 'center', color: '#999'}}>No sizes available</td>
                          </tr>
                        ) : (
                          colorGroup.inventory.map((inv, invIdx) => (
                            <tr key={invIdx}>
                              <td style={{padding: '10px', borderBottom: '1px solid #eee', color: '#000'}}>{inv.size}</td>
                              <td style={{padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', color: '#000', fontWeight: 600}}>
                                {inv.quantity}
                              </td>
                            </tr>
                          ))
                        )}
                        <tr style={{background: '#f9f9f9', fontWeight: 'bold'}}>
                          <td style={{padding: '10px', color: '#000'}}>Total</td>
                          <td style={{padding: '10px', textAlign: 'right', color: '#000'}}>
                            {colorGroup.inventory.reduce((sum, inv) => sum + inv.quantity, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </div>
                ))
              )}
              
              <div style={{marginTop: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px'}}>
                <h3 style={{margin: '0 0 10px 0', color: '#000'}}>Total Stock Summary</h3>
                <p style={{margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#000'}}>
                  Grand Total: {productInventory.reduce((total, colorGroup) => 
                    total + colorGroup.inventory.reduce((sum, inv) => sum + inv.quantity, 0), 0
                  )} units
                </p>
              </div>
            </div>
            
            <div className="modal-footer" style={{padding: '15px', borderTop: '1px solid #ddd', textAlign: 'right'}}>
              <button className="btn btn-secondary" onClick={() => setViewInventoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
