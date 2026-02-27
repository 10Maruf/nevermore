"use client"

import { useState } from "react"
import "./PaymentModal.css"

const PaymentModal = () => {
  const [activeTab, setActiveTab] = useState("cards")

  const cards = [
    { id: 1, name: "AB+", logo: "🏦" },
    { id: 2, name: "Citybank", logo: "🏢" },
    { id: 3, name: "MTB", logo: "🏛️" },
    { id: 4, name: "MyPrime", logo: "💳" },
    { id: 5, name: "SB", logo: "🏪" },
    { id: 6, name: "EBIT", logo: "💰" },
    { id: 7, name: "Midlandsbank", logo: "🏭" },
    { id: 8, name: "Trust Bank", logo: "🤝" },
  ]

  const mobileBanking = [
    { id: 1, name: "bKash", logo: "📱" },
    { id: 2, name: "Nagad", logo: "📲" },
    { id: 3, name: "Rocket", logo: "🚀" },
  ]

  return (
    <div className="modal">
      <div className="modal-header">
        <button className="back-btn">←</button>
        <div className="logo-circle">
          <span className="logo-text">evermore</span>
        </div>
      </div>


      <div className="tabs">
        <button className={`tab ${activeTab === "cards" ? "active" : ""}`} onClick={() => setActiveTab("cards")}>
          CARDS
        </button>
        <button className={`tab ${activeTab === "mobile" ? "active" : ""}`} onClick={() => setActiveTab("mobile")}>
          MOBILE BANKING
        </button>
        <button className={`tab ${activeTab === "net" ? "active" : ""}`} onClick={() => setActiveTab("net")}>
          NET BANKING
        </button>
      </div>

      <div className="content">
        {activeTab === "cards" && (
          <div className="grid">
            {cards.map((card) => (
              <div key={card.id} className="card-item">
                <div className="card-logo">{card.logo}</div>
                <div className="card-name">{card.name}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "mobile" && (
          <div className="grid">
            {mobileBanking.map((service) => (
              <div key={service.id} className="card-item">
                <div className="card-logo">{service.logo}</div>
                <div className="card-name">{service.name}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "net" && (
          <div className="empty-state">
            <p>No net banking options available</p>
          </div>
        )}
      </div>

      <div className="footer">
        <span className="pay-icon">💳</span>
        <span className="pay-amount">PAY 3,730.00 BDT</span>
      </div>
    </div>
  )
}

export default PaymentModal
