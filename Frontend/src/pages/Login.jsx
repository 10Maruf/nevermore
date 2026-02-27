import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getApiUrl } from '../config/api'
import './log.css'


export default function Login({ navigate }) {
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const noticeMessage = location.state?.message || ''

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    
    // All logins go through backend (including admin)
    try {
      console.log('Attempting login with:', email)
      
      const response = await fetch(getApiUrl('/api/auth/login.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', response.headers)
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        setError('Server error: Invalid response format')
        return
      }

      const data = await response.json()
      console.log('Login response:', data)

      if (data.status === 'success') {
        // IMPORTANT:
        // - Admin session must NOT become a customer session.
        // - Store admin auth separately so the main website doesn't treat admin as a logged-in customer.
        if (data.data.user.role === 'admin') {
          localStorage.setItem('adminUser', JSON.stringify(data.data.user))
          localStorage.setItem('adminAuthToken', data.data.token)
          localStorage.setItem('isAdmin', 'true')

          // Clear any customer session keys
          localStorage.removeItem('user')
          localStorage.removeItem('authToken')
          localStorage.removeItem('isLoggedIn')

          console.log('Redirecting to admin dashboard')
          window.location.href = '/admin/dashboard'
        } else {
          // Regular user session
          localStorage.setItem('user', JSON.stringify(data.data.user))
          localStorage.setItem('authToken', data.data.token)
          localStorage.setItem('isLoggedIn', 'true')

          // Clear any admin session keys
          localStorage.removeItem('adminUser')
          localStorage.removeItem('adminAuthToken')
          localStorage.removeItem('isAdmin')

          const from = location.state?.from?.pathname || '/'
          console.log('Redirecting user to:', from)
          navigate(from === '/' ? 'home' : from)
        }
      } else {
        console.error('Login failed:', data.message)
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Network error: ' + error.message)
    }
  }

  return (
    <div className="login-page-wrapper">
      {/* Standard Header */}
      <Navbar navigate={navigate} />
      <div className="container">
        <div className="form-box">
          <h2>Login</h2>
          {noticeMessage && !error && (
            <div className="error-message" style={{color: '#111827', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '10px', borderRadius: '6px', marginBottom: '10px', textAlign: 'center'}}>
              {noticeMessage}
            </div>
          )}
          {error && <div className="error-message" style={{color: 'red', marginBottom: '10px', textAlign: 'center'}}>{error}</div>}
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
            <a href="#" className="link" onClick={(e)=>{e.preventDefault(); navigate('forgot')}}><b>Forgot your Password?</b></a>
            <button type="submit">Sign In</button>
          </form>
          <p>Don't have an account? <a href="#" onClick={(e)=>{e.preventDefault(); navigate('signup')}}><b>Sign Up</b></a></p>
        </div>
      </div>
      <footer className="login-footer">
        <div className="footer-columns">
          <div className="col">
            <h5>COMPANY</h5>
            <ul>
              <li>ABOUT</li>
              <li>CAREERS</li>
              <li>REVIEWS</li>
              <li>SHIPPING</li>
              <li>RETURNS</li>
            </ul>
          </div>
          <div className="col">
            <h5>CLIENT SERVICES</h5>
            <ul>
              <li>SUPPORT</li>
              <li>TRACK ORDER</li>
              <li>MAKE A RETURN</li>
            </ul>
          </div>
          <div className="col">
            <h5>SOCIAL</h5>
            <ul>
              <li>FACEBOOK</li>
              <li>INSTAGRAM</li>
              <li>TIKTOK</li>
              <li>YOUTUBE</li>
              <li>X</li>
            </ul>
          </div>
          <div className="col">
            <h5>COUNTRY</h5>
            <ul>
              <li>ITALY</li>
              <li>FRANCE</li>
              <li>UK</li>
              <li>USA</li>
              <li>CANADA</li>
              <li>UAE</li>
              <li>BANGLADESH</li>
            </ul>
          </div>
        </div>

        <div className="footer-smalllinks">
          <a href="#">TERMS & CONDITIONS</a>
          <a href="#">CONTACT US</a>
          <a href="#">PRIVACY POLICY</a>
        </div>
      </footer>
    </div>
  )
}
