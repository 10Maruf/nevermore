import React, { useState } from "react"
import Navbar from '../components/Navbar'
import "./refund.css"

export default function Refund({ navigate }) {
  const [orderNumber, setOrderNumber] = useState("")
  const [email, setEmail] = useState("")

  const isFormValid = orderNumber.trim() !== "" && email.trim() !== ""

  const handleFindOrder = () => {
    if (isFormValid) {
      console.log("Finding order:", { orderNumber, email })
      // Add your logic here
    }
  }

  return (
    <div>
      <Navbar navigate={navigate} />
      <div className="refund-container">
        <div className="refund-content">
          <h1 className="refund-title">Start a Return</h1>
          <p className="refund-subtitle">Enter your order information to get started.</p>

          <div className="refund-form">
            <input
              type="text"
              placeholder="Order Number"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="refund-input"
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="refund-input"
            />

            <button onClick={handleFindOrder} disabled={!isFormValid} className="refund-button">
              FIND MY ORDER
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
