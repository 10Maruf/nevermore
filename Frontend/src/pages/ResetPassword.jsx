import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../config/api'
import './log.css'

export default function ResetPassword({ navigate }) {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [tokenValid, setTokenValid] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function verify() {
      if (!token) {
        setTokenValid(false)
        return
      }
      try {
        const url = getApiUrl(`/api/auth/verify_password_reset.php?token=${encodeURIComponent(token)}`)
        const res = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' } })
        if (!cancelled) setTokenValid(res.ok)
      } catch (e) {
        if (!cancelled) setTokenValid(false)
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [token])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!token) {
      setError('Invalid reset link')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(getApiUrl('/api/auth/reset_password.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.message || `Reset failed (HTTP ${res.status})`)
        return
      }

      setMessage(data?.message || 'Password updated successfully')
      setTimeout(() => navigate('login'), 800)
    } catch (err) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-wrapper">
      <Navbar navigate={navigate} />
      <div className="container">
        <div className="form-box">
          <h2>Set New Password</h2>

          {tokenValid === false && (
            <div className="error-message" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>
              Reset link is invalid or expired.
            </div>
          )}

          {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px', textAlign: 'center' }}>{error}</div>}
          {message && <div className="success-message" style={{ color: 'green', marginBottom: '10px', textAlign: 'center' }}>{message}</div>}

          <form onSubmit={onSubmit}>
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || tokenValid === false}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={loading || tokenValid === false}
            />
            <button type="submit" disabled={loading || tokenValid === false}>
              {loading ? 'Updating...' : 'Update password'}
            </button>
            <button type="button" className="cancel-btn" onClick={() => navigate('login')} disabled={loading}>
              Cancel
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
