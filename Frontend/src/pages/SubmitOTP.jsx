import React from 'react'
import Header from './navbar'
import './log.css'

export default function SubmitOTP({ navigate }){
  return (
    <div className="login-page-wrapper">
      <Header navigate={navigate} />
      <div className="container">
        <div className="form-box">
          <h2>Reset Password</h2>
          <p style={{textAlign:'center', marginBottom:10, fontSize:14}}>Submit the OTP sent to your email.</p>
          <form onSubmit={(e)=>{e.preventDefault(); alert('OTP submitted'); navigate('login')}}>
            <input type="text" placeholder="Enter OTP" required />
            <button type="submit">Submit</button>
            <button type="button" className="cancel-btn" onClick={()=>navigate('forgot')}>Cancel</button>
          </form>
        </div>
      </div>
    </div>
  )
}
