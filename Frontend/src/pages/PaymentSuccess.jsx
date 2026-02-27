import React, { useState, useEffect, useRef } from 'react'
import Header from './navbar'
import { getApiUrl } from '../config/api'
import { getLiveCurrencyForCountry, formatPriceByCurrency, getCurrencyForCountry } from '../lib/locationService'
import './payment.css'

export default function PaymentSuccess({ navigate }){
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [currencyByCountryCode, setCurrencyByCountryCode] = useState({})
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  // Refs to avoid polling callback using stale state
  const selectedOrderIdRef = useRef(null)
  const orderDataRef = useRef(null)

  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId
  }, [selectedOrderId])

  useEffect(() => {
    orderDataRef.current = orderData
  }, [orderData])

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

  function formatCurrency(amountTk, countryName) {
    const amount = typeof amountTk === 'number' ? amountTk : parseFloat(amountTk)
    if (!Number.isFinite(amount)) return ''
    const code = getCountryCodeForOrder(countryName || orderData?.country)
    const currency = currencyByCountryCode[code] || getCurrencyForCountry(code)
    return formatPriceByCurrency(amount, currency)
  }

  useEffect(() => {
    fetchOrderData()
    // Set up polling to check for status updates every 5 seconds
    const interval = setInterval(fetchOrderData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrderData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const storedOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null')

      // If logged in, show full order history.
      if (token) {
        const response = await fetch(getApiUrl('/api/orders/my_orders.php?status=all'), {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
        })
        const result = await response.json().catch(() => null)

        if (response.ok && result?.status === 'success' && Array.isArray(result.data)) {
          const list = result.data
          setOrders(list)

          // Preload currencies for countries in the list
          const codes = Array.from(new Set(list.map(o => getCountryCodeForOrder(o.country))))
          try {
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
            // ignore
          }

          // Keep the user-selected order visible even when polling refreshes.
          const picked = selectedOrderIdRef.current
            ? list.find(o => o.order_id === selectedOrderIdRef.current)
            : (storedOrder?.order_id
              ? list.find(o => o.order_id === storedOrder.order_id)
              : (list[0] || null))

          if (picked) {
            setOrderData(picked)
            if (!selectedOrderIdRef.current) {
              selectedOrderIdRef.current = picked.order_id
              setSelectedOrderId(picked.order_id)
            }
          } else {
            // Fallbacks if not found in DB
            if (!orderDataRef.current && storedOrder) {
              setOrderData(storedOrder)
              if (!selectedOrderIdRef.current && storedOrder?.order_id) {
                selectedOrderIdRef.current = storedOrder.order_id
                setSelectedOrderId(storedOrder.order_id)
              }
            }
          }
          return
        }
      }

      // Not logged in (or fetch failed): fallback to lastOrder only.
      if (storedOrder?.order_id) {
        setOrderData(storedOrder)
      }
    } catch (error) {
      console.error('Error fetching order data:', error)
      // Fallback to localStorage data
      const storedOrder = JSON.parse(localStorage.getItem('lastOrder') || 'null')
      setOrderData(storedOrder)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="payment-page">
        <Header navigate={navigate} />
        <main className="main-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{textAlign:'center'}}>
            <p>Loading order details...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="payment-page">
        <Header navigate={navigate} />
        <main className="main-container" style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{textAlign:'center'}}>
            <h1 style={{fontSize:28, marginBottom:12}}>Order Placed Successfully</h1>
            <p style={{color:'#555', marginBottom:20}}>Thank you for your purchase. We will notify you when your order ships.</p>
            <button className="pay-button" style={{width:220}} onClick={()=> navigate('home')}>Go to Homepage</button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="payment-page">
      <Header navigate={navigate} />
      <main className="main-container" style={{padding: '40px 20px', maxWidth: '900px', margin: '0 auto'}}>
        <div style={{marginBottom: 30, textAlign: 'center'}}>
          <h1 style={{color: '#28a745', fontSize: 24, marginBottom: 10}}>
            Your order has been placed successfully.
          </h1>
        </div>

        {orders.length > 0 && (
          <div style={{background: 'white', border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16}}>
            <div style={{fontWeight: 700, marginBottom: 10, color: '#111827'}}>Your Orders</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {orders.map((o) => (
                <button
                  key={o.order_id}
                  type="button"
                  onClick={() => {
                    selectedOrderIdRef.current = o.order_id
                    setSelectedOrderId(o.order_id)
                    setOrderData(o)
                  }}
                  style={{
                    textAlign: 'left',
                    background: (orderData?.order_id === o.order_id || selectedOrderId === o.order_id) ? '#f3f4f6' : '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: 12}}>
                    <div style={{fontWeight: 600, color: '#111827'}}>{o.order_id}</div>
                    <div style={{color: '#111827'}}>{formatCurrency(parseFloat(o.total_amount || 0), o.country)}</div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12, color: '#6b7280', marginTop: 4}}>
                    <div>{(o.status || 'pending').toString()}</div>
                    <div>{o.created_at ? new Date(o.created_at).toLocaleString() : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{background: 'white', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden'}}>
          {/* Order Details Table */}
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <tbody>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, width: '30%', color: '#000'}}>Order Id</td>
                <td style={{padding: '15px 20px', color: '#000'}}>{orderData.order_id}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Name</td>
                <td style={{padding: '15px 20px', color: '#000'}}>{orderData.first_name} {orderData.last_name}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Mobile No.</td>
                <td style={{padding: '15px 20px', color: '#000'}}>{orderData.phone}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>E-Mail</td>
                <td style={{padding: '15px 20px', color: '#000'}}>{orderData.user_email}</td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Address</td>
                <td style={{padding: '15px 20px', color: '#000'}}>
                  {orderData.address}{orderData.apartment ? `, ${orderData.apartment}` : ''}{orderData.city ? `, ${orderData.city}` : ''}
                </td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>SKU</td>
                <td style={{padding: '15px 20px', color: '#000'}}>
                  {orderData.items && orderData.items.map(item => item.sku || item.id).join(', ')}
                </td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Subtotal</td>
                <td style={{padding: '15px 20px', color: '#000'}}>
                  {formatCurrency(parseFloat(orderData.subtotal || 0), orderData.country)}
                </td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Shipping Cost</td>
                <td style={{padding: '15px 20px', color: '#000'}}>
                  {formatCurrency(parseFloat(orderData.shipping_cost || 0), orderData.country)}
                </td>
              </tr>
              {orderData.discount_code && parseFloat(orderData.discount_amount || 0) > 0 && (
                <tr style={{borderBottom: '1px solid #ddd'}}>
                  <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Discount</td>
                  <td style={{padding: '15px 20px', color: '#16a34a'}}>
                    - {formatCurrency(parseFloat(orderData.discount_amount || 0), orderData.country)}
                  </td>
                </tr>
              )}
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Order Amount (Total)</td>
                <td style={{padding: '15px 20px', color: '#000'}}>
                  {formatCurrency(parseFloat(orderData.total_amount || 0), orderData.country)}
                </td>
              </tr>
              <tr style={{borderBottom: '1px solid #ddd'}}>
                <td style={{padding: '15px 20px', background: '#f8f9fa', fontWeight: 500, color: '#000'}}>Status</td>
                <td style={{padding: '15px 20px', color: '#000'}}>
                  {orderData.status ? orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1) : 'Pending'}
                </td>
              </tr>

            </tbody>
          </table>

          {/* Product Details Table */}
          <div style={{padding: 20, borderTop: '2px solid #ddd'}}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
              <thead>
                <tr style={{background: '#f8f9fa', borderBottom: '2px solid #ddd'}}>
                  <th style={{padding: '12px', textAlign: 'left', color: '#000', fontWeight: 600}}>SL</th>
                  <th style={{padding: '12px', textAlign: 'left', color: '#000', fontWeight: 600}}>Image</th>
                  <th style={{padding: '12px', textAlign: 'left', color: '#000', fontWeight: 600}}>Product Name</th>
                  <th style={{padding: '12px', textAlign: 'center', color: '#000', fontWeight: 600}}>Quantity</th>
                  <th style={{padding: '12px', textAlign: 'right', color: '#000', fontWeight: 600}}>Unit Price</th>
                  <th style={{padding: '12px', textAlign: 'right', color: '#000', fontWeight: 600}}>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {orderData.items && orderData.items.map((item, index) => (
                  <tr key={index} style={{borderBottom: '1px solid #e5e5e5'}}>
                    <td style={{padding: '12px', color: '#000'}}>{index + 1}</td>
                    <td style={{padding: '12px'}}>
                      <img 
                        src={item.image || item.img || '/assets/placeholders/product.png'} 
                        alt={item.name || item.title} 
                        style={{width: 60, height: 60, objectFit: 'cover', borderRadius: 4}}
                      />
                    </td>
                    <td style={{padding: '12px', color: '#000'}}>
                      <div>{item.name || item.title}</div>
                      <div style={{fontSize: 12, color: '#666'}}>SKU: {item.sku || item.id}</div>
                    </td>
                    <td style={{padding: '12px', textAlign: 'center', color: '#000'}}>{item.qty || item.quantity || 1}</td>
                    <td style={{padding: '12px', textAlign: 'right', color: '#000'}}>{formatCurrency(parseFloat(item.price || 0), orderData.country)}</td>
                    <td style={{padding: '12px', textAlign: 'right', color: '#000', fontWeight: 600}}>
                      {formatCurrency(parseFloat(item.price || 0) * (item.qty || item.quantity || 1), orderData.country)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{marginTop: 30, textAlign: 'center'}}>
          <button className="pay-button" style={{width: 220}} onClick={()=> navigate('home')}>Go to Homepage</button>
        </div>
      </main>
    </div>
  )
}