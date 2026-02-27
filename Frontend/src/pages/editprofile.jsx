import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../config/api'
import './editprofile.css'

export default function EditProfile({ navigate }){
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [verifyLink, setVerifyLink] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError('')
      setMessage('')
      setVerifyLink('')

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
        if (!res.ok) {
          if (!cancelled) navigate('login')
          return
        }
        const p = data?.data || {}
        if (!cancelled) {
          setForm({
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            email: p.email || '',
          })
          setCurrentEmail(p.email || '')
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function updateField(key, val){ setForm(prev => ({...prev, [key]: val})) }

  async function save(){
    setError('')
    setMessage('')
    setVerifyLink('')

    const token = localStorage.getItem('authToken')
    if (!token) {
      navigate('login')
      return
    }

    const trimmed = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
    }

    try {
      // 1) Update name immediately
      const res1 = await fetch(getApiUrl('/api/user/update_profile.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
        body: JSON.stringify({ first_name: trimmed.first_name, last_name: trimmed.last_name }),
      })
      const data1 = await res1.json().catch(() => null)
      if (!res1.ok) {
        setError(data1?.message || `Update failed (HTTP ${res1.status})`)
        return
      }

      // 2) If email changed, request verification link
      if (trimmed.email && trimmed.email !== currentEmail) {
        const res2 = await fetch(getApiUrl('/api/user/request_email_change.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          body: JSON.stringify({ email: trimmed.email }),
        })
        const data2 = await res2.json().catch(() => null)
        if (!res2.ok) {
          setError(data2?.message || `Email change failed (HTTP ${res2.status})`)
          return
        }
        setMessage(data2?.message || 'We sent a confirmation link to your new email.')
        if (data2?.data?.verify_link) setVerifyLink(data2.data.verify_link)
        return
      }

      setMessage(data1?.message || 'Profile updated')
      setTimeout(() => navigate('profile'), 400)
    } catch (e) {
      setError(e?.message || 'Network error')
    }
  }

  function logout(){
    try {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      localStorage.removeItem('isLoggedIn')
      localStorage.removeItem('isAdmin')
    } catch(e) {}
    navigate('login')
  }

  return (
    <div>
      <Navbar navigate={navigate} />
      <main className="editprofile-container">
        <h1 className="editprofile-title"><b>EDIT PROFILE</b></h1>

        <section className="editprofile-section">
          <div className="section-header">
            <h2 className="section-title">PERSONAL INFORMATION</h2>
          </div>

          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{error}</div>}
          {message && <div className="success-message" style={{color: 'green', marginBottom: '10px', textAlign: 'center'}}>{message}</div>}
          {verifyLink && (
            <div className="success-message" style={{ color: 'green', marginBottom: '10px', textAlign: 'center', wordBreak: 'break-all' }}>
              Local verify link: <a href={verifyLink}>{verifyLink}</a>
            </div>
          )}

          <div className="edit-grid">
            <div className="edit-item">
              <label className="edit-label">First Name</label>
              <input className="edit-input" value={form.firstName} onChange={e=>updateField('firstName', e.target.value)} disabled={loading} />
            </div>
            <div className="edit-item">
              <label className="edit-label">Last Name</label>
              <input className="edit-input" value={form.lastName} onChange={e=>updateField('lastName', e.target.value)} disabled={loading} />
            </div>
            <div className="edit-item">
              <label className="edit-label">Email Address</label>
              <input type="email" className="edit-input" value={form.email} onChange={e=>updateField('email', e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className="edit-actions">
            <button className="btn-save" onClick={save}>SAVE CHANGES</button>
            <button className="btn-cancel" onClick={()=> navigate('profile')}>CANCEL</button>
          </div>
        </section>

        {/* Additional actions similar to profile */}
        <section className="profile-actions">
          <button className="action-btn" onClick={() => navigate('profile/change-password')}>CHANGE PASSWORD</button>
          <button className="action-btn" onClick={() => navigate('refund')}>REFUND REQUEST</button>
          <button className="action-btn" onClick={() => navigate('payment-success')}>TRACK ORDER</button>
        </section>

        <section className="profile-logout-row">
          <button className="logout-btn" onClick={logout}>LOG OUT</button>
        </section>
      </main>
    </div>
  )
}
