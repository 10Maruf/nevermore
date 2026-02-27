import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../config/api'
import './profilechangepass.css'

export default function ProfileChangePass({ navigate }) {
  const [profile, setProfile] = useState({ first_name: '', last_name: '', email: '' })
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const token = localStorage.getItem('authToken')
      if (!token) {
        navigate('login')
        return
      }
      try {
        const res = await fetch(getApiUrl('/api/user/profile.php'), {
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        const data = await res.json().catch(() => null)
        if (res.ok && !cancelled) {
          const p = data?.data || {}
          setProfile({ first_name: p.first_name || '', last_name: p.last_name || '', email: p.email || '' })
        }
      } catch (e) {}
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    
    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirm password do not match!')
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      navigate('login')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/api/user/change_password.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
          confirm_password: formData.confirmPassword,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.message || `Change password failed (HTTP ${res.status})`)
        return
      }

      setMessage(data?.message || 'Password changed. Please login again.')
      setTimeout(() => {
        try {
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('isAdmin')
        } catch (e) {}
        navigate('login')
      }, 800)
    } catch (e) {
      setError(e?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('profile')
  }

  return (
    <div>
      <Navbar navigate={navigate} />

      {/* Main Content */}
      <main className="profile-container">
        <h1 className="profile-title"><b>MY PROFILE</b></h1>

        {/* Personal Information Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">PERSONAL INFORMATION</h2>
            <button className="btn-edit">EDIT</button>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <label className="info-label">First Name</label>
              <p className="info-value">{profile.first_name}</p>
            </div>

            <div className="info-item">
              <label className="info-label">Last Name</label>
              <p className="info-value">{profile.last_name}</p>
            </div>

            <div className="info-item">
              <label className="info-label">Email Address</label>
              <p className="info-value">{profile.email}</p>
            </div>
          </div>
        </section>

        {/* Password Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">PASSWORD</h2>
          </div>

          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{error}</div>}
          {message && <div className="success-message" style={{color: 'green', marginBottom: '10px', textAlign: 'center'}}>{message}</div>}

          <form className="password-form" onSubmit={handleSubmit}>
            <div className="password-grid">
              <input 
                type="password" 
                name="currentPassword"
                placeholder="Current Password" 
                className="password-input"
                value={formData.currentPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <input 
                type="password" 
                name="newPassword"
                placeholder="New Password" 
                className="password-input"
                value={formData.newPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <input 
                type="password" 
                name="confirmPassword"
                placeholder="Confirm Password" 
                className="password-input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="password-btns">
              <button type="submit" className="btn-save" disabled={loading}>{loading ? 'SAVING...' : 'SAVE CHANGES'}</button>
              <button type="button" className="btn-cancel" onClick={handleCancel} disabled={loading}>CANCEL</button>
            </div>
          </form>
        </section>

        {/* Action Buttons Section */}
        <section className="profile-actions">
          <button className="action-btn refund-btn" onClick={() => navigate('refund')}>
            REFUND REQUEST
          </button>
          <button className="action-btn track-btn" onClick={() => navigate('payment-success')}>
            TRACK ORDER
          </button>
        </section>
      </main>
    </div>
  )
}
