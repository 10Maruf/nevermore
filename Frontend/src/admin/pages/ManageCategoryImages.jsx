import React, { useState, useEffect } from "react"
import "./ManageCategoryImages.css"
import { getApiUrl, resolveBackendUrl } from '../../config/api'

export default function ManageCategoryImages() {
  const [categories] = useState([
    { slug: 'men-tees', name: "Men's Tees" },
    { slug: 'men-hoodies', name: "Men's Hoodies" },
    { slug: 'men-sweatshirts', name: "Men's Sweatshirts" },
    { slug: 'men-tanktops', name: "Men's Tank Tops" },
    { slug: 'men-shorts', name: "Men's Shorts" },
    { slug: 'men-joggers', name: "Men's Joggers" },
    { slug: 'men-polo-shirt', name: "Men's Polo Shirt" },
    { slug: 'men-windbreaker', name: "Men's Windbreaker" },
    { slug: 'women-tees', name: "Women's Tees" },
    { slug: 'women-hoodies', name: "Women's Hoodies" },
    { slug: 'women-sweatshirts', name: "Women's Sweatshirts" },
    { slug: 'women-tanktops', name: "Women's Tank Tops" },
    { slug: 'women-shorts', name: "Women's Shorts" },
    { slug: 'women-joggers', name: "Women's Joggers" },
    { slug: 'women-polo-shirt', name: "Women's Polo Shirt" },
    { slug: 'women-windbreaker', name: "Women's Windbreaker" },
    { slug: 'accessories-tote', name: "Tote Bags" },
    { slug: 'accessories-wallet', name: "Wallets" },
    { slug: 'accessories-cap', name: "Caps" },
    { slug: 'accessories-backpack', name: "Backpack" },
    { slug: 'accessories-home-decor', name: "Home & Decor" }
  ])
  
  const [categoryImages, setCategoryImages] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchCategoryImages()
  }, [])

  const fetchCategoryImages = async () => {
    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl('/api/categories/category_images.php'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      console.log('Fetched category images:', data)
      
      if (data.status === 'success') {
        setCategoryImages(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching category images:', err)
    }
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError("")
    setLoading(true)

    try {
      // Upload image
      const formData = new FormData()
      formData.append('image', file)

      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const uploadResponse = await fetch(getApiUrl('/api/admin/upload_image.php'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const uploadData = await uploadResponse.json()
      console.log('Upload image response:', uploadData)

      if (uploadData.status === 'success') {
        setSelectedImage(uploadData.data.image_url)
        setImagePreview(resolveBackendUrl(uploadData.data.image_url))
      } else {
        setError(uploadData.message || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      setError('Failed to upload image')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCategoryImage = async () => {
    setError("")
    setSuccess("")

    if (!selectedCategory) {
      setError("Please select a category")
      return
    }

    if (!selectedImage) {
      setError("Please upload an image")
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl('/api/categories/category_images.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category_slug: selectedCategory,
          image_url: selectedImage
        })
      })

      const data = await response.json()
      console.log('Save category image response:', data)

      if (data.status === 'success') {
        setSuccess('Category image saved successfully!')
        setSelectedCategory("")
        setSelectedImage(null)
        setImagePreview("")
        fetchCategoryImages()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to save category image')
      }
    } catch (err) {
      console.error('Error saving category image:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCategoryImage = async (categorySlug) => {
    if (!window.confirm('Are you sure you want to delete this category image?')) {
      return
    }

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl(`/api/categories/category_images.php?category=${categorySlug}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess('Category image deleted successfully!')
        fetchCategoryImages()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to delete category image')
      }
    } catch (err) {
      console.error('Error deleting category image:', err)
      setError('Network error. Please try again.')
    }
  }

  const getCategoryImage = (slug) => {
    const found = categoryImages.find(ci => ci.category_slug === slug)
    return found ? resolveBackendUrl(found.image_url) : null
  }

  return (
    <div className="page-container">
      <h1>Manage Category Images</h1>

      {error && <div className="alert alert-error" style={{padding: '12px', marginBottom: '20px', background: '#fee', border: '1px solid #fcc', color: '#c00', borderRadius: '6px'}}>{error}</div>}
      {success && <div className="alert alert-success" style={{padding: '12px', marginBottom: '20px', background: '#efe', border: '1px solid #cfc', color: '#0a0', borderRadius: '6px'}}>{success}</div>}

      <div className="category-image-form" style={{background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '30px'}}>
        <h2 style={{fontSize: '20px', marginBottom: '20px', color: '#2c3e50'}}>Upload Category Image</h2>

        <div className="form-group" style={{marginBottom: '15px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3e50', fontSize: '14px'}}>Select Category *</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={loading}
            style={{width: '100%', padding: '10px 12px', border: '1px solid #bdc3c7', borderRadius: '6px', fontSize: '14px'}}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{marginBottom: '15px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3e50', fontSize: '14px'}}>Upload Image *</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            disabled={loading}
            style={{width: '100%', padding: '10px', border: '1px solid #bdc3c7', borderRadius: '6px'}}
          />
        </div>

        {imagePreview && (
          <div style={{marginBottom: '15px'}}>
            <img 
              src={imagePreview} 
              alt="Preview" 
              style={{maxWidth: '300px', maxHeight: '300px', borderRadius: '8px', border: '2px solid #ddd'}}
            />
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={handleSaveCategoryImage}
          disabled={loading || !selectedCategory || !selectedImage}
          style={{padding: '12px 24px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 600}}
        >
          {loading ? 'Saving...' : 'Save Category Image'}
        </button>
      </div>

      <div className="category-images-grid" style={{background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
        <h2 style={{fontSize: '20px', marginBottom: '20px', color: '#2c3e50'}}>Category Images</h2>
        
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px'}}>
          {categories.map((cat) => {
            const imageUrl = getCategoryImage(cat.slug)
            return (
              <div key={cat.slug} style={{border: '1px solid #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center'}}>
                <h3 style={{fontSize: '16px', marginBottom: '10px', color: '#000'}}>{cat.name}</h3>
                {imageUrl ? (
                  <>
                    <img 
                      src={imageUrl} 
                      alt={cat.name} 
                      style={{width: '100%', height: '200px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px'}}
                    />
                    <button 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDeleteCategoryImage(cat.slug)}
                      style={{padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <div style={{width: '100%', height: '200px', background: '#f5f5f5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999'}}>
                    No image
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
