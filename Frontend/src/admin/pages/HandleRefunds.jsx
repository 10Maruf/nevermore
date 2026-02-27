import React, { useState } from "react"
import RefundDetailsPanel from "../components/RefundDetailsPanel"
import { formatTk } from "../format"
import "./HandleRefunds.css"

export default function HandleRefunds() {
  const [refunds, setRefunds] = useState([
    {
      id: "REF001",
      orderId: "ORD001",
      customerEmail: "samir@example.com",
      requestedItems: ["Black Tee - M", "Blue Hoodie - L"],
      refundAmount: 89.99,
      status: "Pending",
      dateRequested: "2024-01-15",
      orderInfo: {
        items: [
          { name: "Black Tee", size: "M", price: 29.99, qty: 1 },
          { name: "Blue Hoodie", size: "L", price: 59.99, qty: 1 },
        ],
        totalAmount: 89.99,
      },
    },
    {
      id: "REF002",
      orderId: "ORD002",
      customerEmail: "sidratur@gmail.com",
      requestedItems: ["Women Sweatshirt - S"],
      refundAmount: 45.0,
      status: "Approved",
      dateRequested: "2024-01-14",
      orderInfo: {
        items: [{ name: "Women Sweatshirt", size: "S", price: 45.0, qty: 1 }],
        totalAmount: 45.0,
      },
    },
  ])

  const [selectedRefund, setSelectedRefund] = useState(null)
  const [showPanel, setShowPanel] = useState(false)

  const handleViewDetails = (refund) => {
    setSelectedRefund(refund)
    setShowPanel(true)
  }

  const handleUpdateRefund = (updatedRefund) => {
    setRefunds(refunds.map((r) => (r.id === updatedRefund.id ? updatedRefund : r)))
    setShowPanel(false)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "#f39c12"
      case "Approved":
        return "#2ecc71"
      case "Rejected":
        return "#e74c3c"
      case "Refunded":
        return "#3498db"
      default:
        return "#95a5a6"
    }
  }

  return (
    <div className="page-container">
      <h1>Handle Refunds & Returns</h1>

      <div className="refunds-table">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Refund ID</th>
                <th>Order ID</th>
                <th>Customer Email</th>
                <th>Requested Items</th>
                <th>Refund Amount</th>
                <th>Status</th>
                <th>Date Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
              <tr key={refund.id}>
                <td>
                  <strong>{refund.id}</strong>
                </td>
                <td>{refund.orderId}</td>
                <td>{refund.customerEmail}</td>
                <td>{refund.requestedItems.join(", ")}</td>
                <td>{formatTk(refund.refundAmount)}</td>
                <td>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(refund.status) }}>
                    {refund.status}
                  </span>
                </td>
                <td>{refund.dateRequested}</td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => handleViewDetails(refund)}>
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {showPanel && selectedRefund && (
        <RefundDetailsPanel refund={selectedRefund} onClose={() => setShowPanel(false)} onUpdate={handleUpdateRefund} />
      )}
    </div>
  )
}
