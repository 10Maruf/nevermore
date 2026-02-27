"use client"

import { useState } from "react"
import "./RefundDetailsPanel.css"
import { formatTk } from "../lib/format"

export default function RefundDetailsPanel({ refund, onClose, onUpdate }) {
  const [selectedItems, setSelectedItems] = useState(refund.orderInfo.items.map((_, idx) => idx))

  const calculateRefundAmount = () => {
    return selectedItems.reduce((sum, idx) => {
      return sum + refund.orderInfo.items[idx].price
    }, 0)
  }

  const handleItemToggle = (idx) => {
    setSelectedItems((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]))
  }

  const handleApprove = () => {
    const updatedRefund = {
      ...refund,
      status: "Approved",
      refundAmount: calculateRefundAmount(),
    }
    onUpdate(updatedRefund)
  }

  const handleReject = () => {
    const updatedRefund = {
      ...refund,
      status: "Rejected",
    }
    onUpdate(updatedRefund)
  }

  const handleMarkRefunded = () => {
    const updatedRefund = {
      ...refund,
      status: "Refunded",
    }
    onUpdate(updatedRefund)
  }

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="refund-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>Refund Details - {refund.id}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="panel-content">
          <div className="section">
            <h3>Order Information</h3>
            <p>
              <strong>Order ID:</strong> {refund.orderId}
            </p>
            <p>
              <strong>Customer Email:</strong> {refund.customerEmail}
            </p>
            <p>
              <strong>Date Requested:</strong> {refund.dateRequested}
            </p>
          </div>

          <div className="section">
            <h3>Order Items</h3>
            <div className="items-list">
              {refund.orderInfo.items.map((item, idx) => (
                <div key={idx} className="item-checkbox">
                  <input
                    type="checkbox"
                    id={`item-${idx}`}
                    checked={selectedItems.includes(idx)}
                    onChange={() => handleItemToggle(idx)}
                  />
                  <label htmlFor={`item-${idx}`}>
                    <span className="item-name">
                      {item.name} - Size {item.size}
                    </span>
                    <span className="item-price">{formatTk(item.price)}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h3>Refund Amount</h3>
            <p className="refund-amount">{formatTk(calculateRefundAmount())}</p>
          </div>

          <div className="panel-actions">
            <button className="btn btn-success" onClick={handleApprove}>
              Approve Refund
            </button>
            <button className="btn btn-warning" onClick={handleMarkRefunded}>
              Mark as Refunded
            </button>
            <button className="btn btn-danger" onClick={handleReject}>
              Reject Refund
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
