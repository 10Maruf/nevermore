import React, { useState, useEffect } from "react"
import { getApiUrl } from '../../config/api'
import "./ManageDiscount.css"
import { formatTk } from "../format"

export default function ManageDiscount() {
  const [discounts, setDiscounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage",
    value: "",
    min_purchase: "",
    expiryDate: "",
    maxUses: "",
  })

  useEffect(() => {
    fetchDiscounts()
  }, [])

  const fetchDiscounts = async () => {
    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl('/api/discounts/discounts.php'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      const data = await response.json()
      
      if (data.status === 'success') {
        setDiscounts(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching discounts:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddDiscount = async () => {
    setError("")
    setSuccess("")
    
    if (!formData.code || !formData.value) {
      setError("Code and value are required")
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl('/api/discounts/discounts.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          type: formData.type,
          value: parseFloat(formData.value),
          min_purchase: formData.minPurchase ? parseFloat(formData.minPurchase) : 0,
          expiry_date: formData.expiryDate || null,
          max_uses: formData.maxUses ? parseInt(formData.maxUses) : null
        })
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess('Discount created successfully!')
        setFormData({ code: "", type: "percentage", value: "", minPurchase: "", expiryDate: "", maxUses: "" })
        fetchDiscounts()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to create discount')
      }
    } catch (err) {
      console.error('Error creating discount:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount code?')) {
      return
    }

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(getApiUrl(`/api/discounts/discounts.php?id=${id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess('Discount deleted successfully!')
        fetchDiscounts()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Failed to delete discount')
      }
    } catch (err) {
      console.error('Error deleting discount:', err)
      setError('Network error. Please try again.')
    }
  }

  return (
    <div className="page-container">
      <h1>Manage Discount</h1>

      {error && <div className="alert alert-error" style={{padding: '12px', marginBottom: '20px', background: '#fee', border: '1px solid #fcc', color: '#c00', borderRadius: '6px'}}>{error}</div>}
      {success && <div className="alert alert-success" style={{padding: '12px', marginBottom: '20px', background: '#efe', border: '1px solid #cfc', color: '#0a0', borderRadius: '6px'}}>{success}</div>}

      <div className="discount-form">
        <h2>Create Discount Code</h2>

        <div className="form-row">
          <div className="form-group">
            <label>Discount Code *</label>
            <input
              type="text"
              name="code"
              placeholder="e.g., SAVE20"
              value={formData.code}
              onChange={handleInputChange}
              disabled={loading}
              style={{textTransform: 'uppercase'}}
            />
          </div>

          <div className="form-group">
            <label>Type *</label>
            <select name="type" value={formData.type} onChange={handleInputChange} disabled={loading}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (Tk)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Value *</label>
            <input
              type="number"
              name="value"
              placeholder={formData.type === "percentage" ? "20" : "10.00"}
              value={formData.value}
              onChange={handleInputChange}
              step="0.01"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Minimum Purchase (Tk)</label>
            <input
              type="number"
              name="minPurchase"
              placeholder="0"
              value={formData.minPurchase}
              onChange={handleInputChange}
              step="0.01"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <input 
              type="date" 
              name="expiryDate" 
              value={formData.expiryDate} 
              onChange={handleInputChange} 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Max Uses</label>
            <input
              type="number"
              name="maxUses"
              placeholder="Leave empty for unlimited"
              value={formData.maxUses}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleAddDiscount} disabled={loading}>
          {loading ? 'Creating...' : 'Create Discount'}
        </button>
      </div>

      <div className="discount-table">
        <h2>Active Discounts</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Min Purchase</th>
                <th>Expiry Date</th>
                <th>Max Uses</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "20px" }}>
                    No discounts created yet
                  </td>
                </tr>
              ) : (
                discounts.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.code}</strong>
                  </td>
                  <td>{d.type === "percentage" ? "%" : "Tk"}</td>
                  <td>{d.value}</td>
                  <td>{formatTk(d.min_purchase)}</td>
                  <td>{d.expiry_date || "No expiry"}</td>
                  <td>{d.max_uses || "Unlimited"} {d.max_uses ? `(${d.current_uses} used)` : ''}</td>
                  <td>
                    <span className={`badge ${d.status === 'active' ? 'active' : 'inactive'}`}>
                      {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDiscount(d.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
