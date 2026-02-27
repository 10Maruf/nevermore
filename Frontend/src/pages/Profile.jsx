import React, { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../config/api'
import './profile.css'

export default function Profile({ navigate }) {
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
  })
  const [loading, setLoading] = useState(true)

  // Load user profile from backend (DB)
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
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)
        if (!res.ok) {
          if (!cancelled) navigate('login')
          return
        }

        const p = data?.data || {}
        if (!cancelled) {
          setUserData({
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            email: p.email || '',
            username: p.username || '',
          })

          // keep localStorage user in sync
          const prevUser = (() => {
            try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
          })()
          localStorage.setItem('user', JSON.stringify({ ...prevUser, email: p.email, username: p.username }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <Navbar navigate={navigate} />

      <main className="profile-container">
        <h1 className="profile-title"><b>MY PROFILE</b></h1>

        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">PERSONAL INFORMATION</h2>
            <button className="btn-edit" onClick={() => navigate('profile/edit')}>EDIT</button>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <label className="info-label">First Name</label>
              <p className="info-value">{loading ? 'Loading...' : userData.firstName}</p>
            </div>

            <div className="info-item">
              <label className="info-label">Last Name</label>
              <p className="info-value">{loading ? 'Loading...' : userData.lastName}</p>
            </div>

            <div className="info-item">
              <label className="info-label">Email Address</label>
              <p className="info-value">{loading ? 'Loading...' : userData.email}</p>
            </div>

          </div>
        </section>

        {/* Password Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2 className="section-title">PASSWORD</h2>
            <button className="btn-edit" onClick={() => navigate('profile/change-password')}>
              CHANGE PASSWORD
            </button>
          </div>
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

        {/* Centered Logout under the actions row */}
        <section className="profile-logout-row">
          <button
            className="logout-btn"
            onClick={() => {
              try {
                localStorage.removeItem('authToken')
                localStorage.removeItem('user')
                localStorage.removeItem('isLoggedIn')
                localStorage.removeItem('isAdmin')
              } catch (e) {}
              navigate('login')
            }}
          >
            LOG OUT
          </button>
        </section>
      </main>
    </div>
  )
}
