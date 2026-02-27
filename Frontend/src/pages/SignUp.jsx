import React, { useState } from 'react'
import Header from './navbar'
import { getApiUrl } from '../config/api'
import './log.css'

export default function SignUp({ navigate }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendVerifyLink, setResendVerifyLink] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResendMessage('')
    setResendVerifyLink('')

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      const response = await fetch(getApiUrl('/api/auth/register.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password
        })
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSuccess(data.message || 'Registration successful. Please verify your email.')

        // Prefill resend email with the submitted email
        setResendEmail(formData.email)
        setResendVerifyLink(data?.data?.verify_link || '')

        // Clear form data
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: ''
        })
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Network error. Please try again.')
    }
  }

  const handleResend = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResendMessage('')
    setResendVerifyLink('')

    const email = (resendEmail || '').trim()
    if (!email) {
      setResendMessage('Please enter your email to resend the verification link.')
      return
    }

    setResendLoading(true)
    try {
      const response = await fetch(getApiUrl('/api/auth/resend_verification.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json().catch(() => null)
      if (response.ok && data?.status === 'success') {
        setResendMessage(data.message || 'Verification email resent. Please check your inbox.')
        setResendVerifyLink(data?.data?.verify_link || '')
      } else {
        setResendMessage(data?.message || 'Failed to resend verification email')
      }
    } catch (err) {
      console.error('Resend verification error:', err)
      setResendMessage('Network error. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="login-page-wrapper">
      <Header navigate={navigate} />
      <div className="container">
        <div className="form-box">
          <h2>Sign Up</h2>
          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{error}</div>}
          {success && <div className="success-message" style={{color: 'green', marginBottom: '10px', textAlign: 'center'}}>{success}</div>}
          <form onSubmit={handleSubmit}>
            <input 
              type="text" 
              name="username"
              placeholder="Full Name" 
              value={formData.username}
              onChange={handleChange}
              required 
            />
            <input 
              type="email" 
              name="email"
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="Confirm Password" 
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
            />
            <button type="submit">Sign Up</button>
          </form>

          <div style={{marginTop: 14, paddingTop: 14, borderTop: '1px solid #eee'}}>
            <div style={{fontSize: 13, fontWeight: 600, marginBottom: 8}}>Didn’t get the verification email?</div>
            <form onSubmit={handleResend}>
              <input
                type="email"
                placeholder="Enter your email to resend"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={resendLoading}>
                {resendLoading ? 'Sending...' : 'Resend Verification Link'}
              </button>
            </form>
            {resendMessage && (
              <div className="success-message" style={{color: '#111827', marginTop: 8, textAlign: 'center'}}>
                {resendMessage}
              </div>
            )}
            {resendVerifyLink && (
              <div style={{marginTop: 8, textAlign: 'center', fontSize: 12}}>
                <a href={resendVerifyLink} target="_blank" rel="noreferrer">Open verification link</a>
              </div>
            )}
          </div>

          <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); navigate('login') }}>Login</a></p>
        </div>
      </div>
    </div>
  )
}
