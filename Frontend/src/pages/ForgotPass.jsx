import React, { useState } from 'react'
import Header from './navbar'
import { getApiUrl } from '../config/api'
import './log.css'

export default function ForgotPass({ navigate }){
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [resetLink, setResetLink] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setResetLink('')
    setLoading(true)

    try {
      const response = await fetch(getApiUrl('/api/auth/request_password_reset.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({ email }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setError(data?.message || `Request failed (HTTP ${response.status})`)
        return
      }

      setMessage(data?.message || 'If the email exists, we sent a reset link.')
      if (data?.data?.reset_link) {
        setResetLink(data.data.reset_link)
      }
    } catch (err) {
      setError(err?.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page-wrapper">
      <Header navigate={navigate} />
      <div className="container">
        <div className="form-box">
          <h2>Reset Password</h2>
          <p style={{textAlign:'center', marginBottom:10, fontSize:14}}>We will send a reset link to your email.</p>
          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{error}</div>}
          {message && <div className="success-message" style={{color: 'green', marginBottom: '10px', textAlign: 'center'}}>{message}</div>}
          {resetLink && (
            <div className="success-message" style={{ color: 'green', marginBottom: '10px', textAlign: 'center', wordBreak: 'break-all' }}>
              Local reset link: <a href={resetLink}>{resetLink}</a>
            </div>
          )}
          <form onSubmit={onSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send link'}</button>
            <button type="button" className="cancel-btn" onClick={()=>navigate('login')}>Cancel</button>
          </form>
        </div>
      </div>
    </div>
  )
}
