import React, { useState } from "react"
import { getApiUrl } from '../../config/api'
import "./GenerateReports.css"
import { formatTk } from "../format"

export default function GenerateReports() {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateReport = async () => {
    setError("")
    
    if (!startDate || !endDate) {
      setError("Please select both start and end dates")
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("Start date must be before end date")
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('adminAuthToken') || localStorage.getItem('authToken')
      const response = await fetch(
        getApiUrl(`/api/orders/orders.php?start_date=${startDate}&end_date=${endDate}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (data.status === 'success') {
        const orders = data.data || []
        
        // Calculate report statistics
        const totalOrders = orders.length
        const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0)
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
        const pendingOrders = orders.filter(o => o.payment_status === 'pending').length
        const completedOrders = orders.filter(o => o.payment_status === 'paid').length
        
        const newReport = {
          id: Date.now(),
          startDate,
          endDate,
          generatedDate: new Date().toLocaleDateString(),
          totalOrders,
          totalRevenue: totalRevenue.toFixed(2),
          averageOrderValue: averageOrderValue.toFixed(2),
          pendingOrders,
          completedOrders,
          orderDetails: orders
        }
        
        setReports([newReport, ...reports])
      } else {
        setError(data.message || 'Failed to generate report')
      }
    } catch (err) {
      console.error('Error generating report:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = (report) => {
    const reportContent = `
EVERMORE ADMIN REPORT
Generated: ${report.generatedDate}
Period: ${report.startDate} to ${report.endDate}

SUMMARY
========================================
Total Orders: ${report.totalOrders}
Total Revenue: Tk ${parseFloat(report.totalRevenue).toLocaleString('en-US', {minimumFractionDigits: 2, maxFractionDigits: 2})}
Average Order Value: Tk ${parseFloat(report.averageOrderValue).toLocaleString('en-US', {minimumFractionDigits: 2, maxFractionDigits: 2})}
Pending Orders: ${report.pendingOrders}
Completed Orders: ${report.completedOrders}

ORDER DETAILS
========================================
${report.orderDetails.map((order, index) => `
Order #${index + 1}
Order ID: ${order.order_id}
Customer: ${order.customer_name || 'N/A'}
Email: ${order.customer_email || 'N/A'}
Phone: ${order.customer_phone || 'N/A'}
Amount: Tk ${parseFloat(order.total_amount).toFixed(2)}
Payment Status: ${order.payment_status}
Payment Method: ${order.payment_method}
Date: ${order.created_at}
----------------------------------------
`).join('\n')}

End of Report
    `
    const element = document.createElement("a")
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(reportContent))
    element.setAttribute("download", `evermore-report-${report.startDate}-to-${report.endDate}.txt`)
    element.style.display = "none"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="page-container">
      <h1>Generate Reports</h1>

      {error && <div className="alert alert-error" style={{padding: '12px', marginBottom: '20px', background: '#fee', border: '1px solid #fcc', color: '#c00', borderRadius: '6px'}}>{error}</div>}

      <div className="report-form">
        <h2>Create Report</h2>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>End Date *</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              disabled={loading}
            />
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={handleGenerateReport}
          disabled={loading || !startDate || !endDate}
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      <div className="reports-list">
        <h2>Generated Reports</h2>
        {reports.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px", color: "#7f8c8d" }}>No reports generated yet</p>
        ) : (
          <div className="reports-grid">
            {reports.map((report) => (
              <div key={report.id} className="report-card">
                <div className="report-header">
                  <h3>Sales Report</h3>
                  <span className="report-date">{report.generatedDate}</span>
                </div>
                <div className="report-period">
                  {report.startDate} to {report.endDate}
                </div>
                <div className="report-stats">
                  <div className="stat">
                    <span className="label">Total Orders</span>
                    <span className="value">{report.totalOrders}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Total Revenue</span>
                    <span className="value">{formatTk(report.totalRevenue)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Avg Order Value</span>
                    <span className="value">{formatTk(report.averageOrderValue)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Pending Orders</span>
                    <span className="value">{report.pendingOrders}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Completed Orders</span>
                    <span className="value">{report.completedOrders}</span>
                  </div>
                </div>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => handleDownloadReport(report)}
                  style={{marginTop: '15px', width: '100%'}}
                >
                  Download Report
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
