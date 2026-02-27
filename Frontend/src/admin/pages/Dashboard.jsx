import React, { useState, useEffect } from 'react'
import { getApiUrl } from '../../config/api'
import { getLiveCurrencyForCountry, formatPriceByCurrency, getCurrencyForCountry } from '../../lib/locationService'
import "./Dashboard.css"

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingRefunds: 0,
    activeDiscounts: 0,
    totalRevenue: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [currencyByCountryCode, setCurrencyByCountryCode] = useState({})

  const COUNTRY_CODE_BY_NAME = {
    Bangladesh: 'BD',
    India: 'IN',
    'United States': 'US',
    Canada: 'CA',
    'United Kingdom': 'GB',
    Australia: 'AU',
    'New Zealand': 'NZ',
    'United Arab Emirates': 'AE',
    'Saudi Arabia': 'SA',
    Singapore: 'SG',
    Malaysia: 'MY',
    France: 'FR',
    Germany: 'DE',
    Italy: 'IT',
    Spain: 'ES',
  }

  const getCountryCodeForOrder = (countryName) => {
    const key = String(countryName || '').trim()
    return COUNTRY_CODE_BY_NAME[key] || 'BD'
  }

  const formatOrderAmount = (amountBdt, countryName) => {
    const amount = typeof amountBdt === 'number' ? amountBdt : parseFloat(amountBdt)
    if (!Number.isFinite(amount)) return ''
    const code = getCountryCodeForOrder(countryName)
    const currency = currencyByCountryCode[code] || getCurrencyForCountry(code)
    return formatPriceByCurrency(amount, currency)
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch all orders to calculate statistics
      const ordersResponse = await fetch(getApiUrl('/api/orders/orders.php?status=all'))
      const ordersData = await ordersResponse.json()
      
      if (ordersData.status === 'success') {
        const orders = ordersData.data

        // Preload currencies for the set of countries present
        try {
          const codes = Array.from(new Set((orders || []).map(o => getCountryCodeForOrder(o.country))))
          const entries = await Promise.all(
            codes.map(async (code) => {
              try {
                const c = await getLiveCurrencyForCountry(code)
                return [code, c]
              } catch {
                return [code, getCurrencyForCountry(code)]
              }
            })
          )
          setCurrencyByCountryCode(Object.fromEntries(entries))
        } catch (e) {
          // ignore currency preload errors
        }
        
        // Calculate total orders
        const totalOrders = orders.length
        
        // Calculate total revenue (only completed orders)
        const totalRevenue = orders
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0)
        
        // Calculate pending refunds (for now set to 0, will be dynamic when refunds are implemented)
        const pendingRefunds = 0
        
        // Calculate active discounts (for now set to 0, will be dynamic when discounts are implemented)
        const activeDiscounts = 0
        
        setStats({
          totalOrders,
          pendingRefunds,
          activeDiscounts,
          totalRevenue
        })
        
        // Get recent 5 orders
        setRecentOrders(orders.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'badge completed'
      case 'pending': return 'badge pending'
      case 'processing': return 'badge processing'
      case 'cancelled': return 'badge cancelled'
      default: return 'badge'
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{background: 'white', padding: '20px', minHeight: '500px'}}>
        <p>Loading dashboard data...</p>
      </div>
    )
  }

  const statsDisplay = [
    { label: "Total Orders", value: stats.totalOrders.toLocaleString(), color: "#3498db" },
    { label: "Pending Refunds", value: stats.pendingRefunds.toString(), color: "#e74c3c" },
    { label: "Active Discounts", value: stats.activeDiscounts.toString(), color: "#2ecc71" },
    { label: "Total Revenue", value: `${stats.totalRevenue.toFixed(2)} TK`, color: "#f39c12" },
  ]

  return (
    <div className="page-container" style={{background: 'white', padding: '20px', minHeight: '500px'}}>
      <h1>Dashboard</h1>
      <div className="stats-grid">
        {statsDisplay.map((stat, idx) => (
          <div key={idx} className="stat-card" style={{ borderLeftColor: stat.color }}>
            <h3>{stat.label}</h3>
            <p className="stat-value">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <div className="table-scroll">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.order_id}</td>
                  <td>{order.first_name} {order.last_name}</td>
                  <td>{formatOrderAmount(order.total_amount, order.country)}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', padding: '20px'}}>
                  No orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
