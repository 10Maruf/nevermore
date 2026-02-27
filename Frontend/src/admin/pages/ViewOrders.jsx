import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../config/api';
import './ViewOrders.css';

export default function ViewOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeAssetTab, setActiveAssetTab] = useState('assets');
  const [activeView, setActiveView] = useState('front');
  const [selectedTextInfo, setSelectedTextInfo] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/orders/orders.php?status=${filter}`));
      const data = await response.json();
      
      if (data.status === 'success') {
        setOrders(data.data);
      } else {
        console.error('Failed to fetch orders:', data.message);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(getApiUrl('/api/orders/orders.php'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          status: newStatus
        })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Close modal
        setSelectedOrder(null);
        // Refresh orders list
        fetchOrders();
        alert('Order status updated successfully to: ' + newStatus);
      } else {
        alert('Failed to update order status: ' + data.message);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return `TK ${parseFloat(price).toFixed(2)}`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'status-badge pending';
      case 'processing': return 'status-badge processing';
      case 'completed': return 'status-badge completed';
      case 'cancelled': return 'status-badge cancelled';
      default: return 'status-badge';
    }
  };

  const downloadAsset = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'asset.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download the asset. Please try again.');
    }
  };

  return (
    <div className="page-container">
      <h1>View Orders</h1>
      
      <div className="filter-section">
        <label htmlFor="status-filter">Filter by Status:</label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">No orders found</div>
      ) : (
        <div className="orders-table-container">
          <div className="table-scroll" style={{overflowX: 'auto'}}>
            <table className="orders-table" style={{minWidth: '900px'}}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="order-id">{order.order_id}</td>
                  <td>{order.first_name} {order.last_name}</td>
                  <td>{order.user_email}</td>
                  <td className="items-count">{order.items?.length || 0} items</td>
                  <td className="total-amount">{formatPrice(order.total_amount)}</td>
                  <td className="payment-method">{order.payment_method?.toUpperCase()}</td>
                  <td>
                    <span className={getStatusBadgeClass(order.status)}>
                      {order.status}
                    </span>
                  </td>
                  <td className="order-date">{formatDate(order.created_at)}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-view"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details - {selectedOrder.order_id}</h3>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Customer Information */}
              <div className="detail-section">
                <h4>Customer Information</h4>
                <p><strong>Name:</strong> {selectedOrder.first_name} {selectedOrder.last_name}</p>
                <p><strong>Email:</strong> {selectedOrder.user_email}</p>
                <p><strong>Phone:</strong> {selectedOrder.phone}</p>
                {selectedOrder.company && <p><strong>Company:</strong> {selectedOrder.company}</p>}
              </div>

              {/* Shipping Address */}
              <div className="detail-section">
                <h4>Shipping Address</h4>
                <p>{selectedOrder.address}</p>
                {selectedOrder.apartment && <p>{selectedOrder.apartment}</p>}
                <p>{selectedOrder.city}, {selectedOrder.postal_code}</p>
                <p>{selectedOrder.country}</p>
              </div>

              {/* Order Items */}
              <div className="detail-section">
                <h4>Order Items</h4>
                <div className="order-items-list">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="order-item-wrapper">
                      <div className="order-item">
                        <img src={item.img} alt={item.title} className="item-image" />
                        <div className="item-details">
                          <p className="item-title">{item.title}</p>
                          <p className="item-variant">Size: {item.size} | Color: {item.color}</p>
                          <p className="item-qty">Quantity: {item.qty}</p>
                        </div>
                        <div className="item-price">{formatPrice(item.price * item.qty)}</div>
                      </div>

                      {/* Assets and Preview Section - Only for Custom Designed Products */}
                      {item.isCustom && (
                        <div className="item-assets-preview">
                          <h5 style={{ fontSize: '18px', fontWeight: '400' }}>Assets and Preview</h5>
                          
                          {/* Tabs */}
                          <div className="tabs-container">
                            <button 
                              className={`tab-button ${activeAssetTab === `assets-${index}` ? 'active' : ''}`}
                              onClick={() => setActiveAssetTab(`assets-${index}`)}
                            >
                              Assets
                            </button>
                            <button 
                              className={`tab-button ${activeAssetTab === `preview-${index}` ? 'active' : ''}`}
                              onClick={() => setActiveAssetTab(`preview-${index}`)}
                            >
                              Preview
                            </button>
                          </div>

                          {/* Assets Tab Content */}
                          {activeAssetTab === `assets-${index}` && (
                            <div className="assets-content">
                              {/* View Tabs */}
                              <div className="view-tabs">
                                <button 
                                  className={`view-tab ${activeView === `front-${index}` ? 'active' : ''}`}
                                  onClick={() => setActiveView(`front-${index}`)}
                                >
                                  Front View
                                </button>
                                <button 
                                  className={`view-tab ${activeView === `back-${index}` ? 'active' : ''}`}
                                  onClick={() => setActiveView(`back-${index}`)}
                                >
                                  Back View
                                </button>
                                <button 
                                  className={`view-tab ${activeView === `leftSleeve-${index}` ? 'active' : ''}`}
                                  onClick={() => setActiveView(`leftSleeve-${index}`)}
                                >
                                  Left Sleeve
                                </button>
                                <button 
                                  className={`view-tab ${activeView === `rightSleeve-${index}` ? 'active' : ''}`}
                                  onClick={() => setActiveView(`rightSleeve-${index}`)}
                                >
                                  Right Sleeve
                                </button>
                              </div>

                              {/* Current View Assets */}
                              {['front', 'back', 'leftSleeve', 'rightSleeve'].map(viewName => (
                                activeView === `${viewName}-${index}` && (
                                  <div key={viewName} className="view-assets">
                                    <h6>{viewName === 'front' ? 'Front View' : 
                                         viewName === 'back' ? 'Back View' :
                                         viewName === 'leftSleeve' ? 'Left Sleeve' : 'Right Sleeve'}</h6>
                                    
                                    {/* Images Section */}
                                    <div className="assets-subsection">
                                      <h6>Images</h6>
                                      {item.customAssets?.[viewName]?.images?.length > 0 ? (
                                        <table className="assets-table">
                                          <thead>
                                            <tr>
                                              <th>Name</th>
                                              <th>URL</th>
                                              <th>Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {item.customAssets[viewName].images.map((image, idx) => (
                                              <tr key={idx}>
                                                <td>{image.filename || `asset${idx + 1}.jpg`}</td>
                                                <td className="url-cell">{image.url}</td>
                                                <td className="actions-cell">
                                                  <button 
                                                    className="btn-view"
                                                    onClick={() => window.open(image.url, '_blank')}
                                                  >
                                                    View
                                                  </button>
                                                  <button 
                                                    className="btn-download"
                                                    onClick={() => downloadAsset(image.url, image.filename || `asset${idx + 1}.jpg`)}
                                                  >
                                                    Download
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <p className="no-assets">No images in this view</p>
                                      )}
                                    </div>

                                    {/* Text Section */}
                                    <div className="assets-subsection">
                                      <h6>Text</h6>
                                      {item.customAssets?.[viewName]?.texts?.length > 0 ? (
                                        <table className="assets-table">
                                          <thead>
                                            <tr>
                                              <th>Name</th>
                                              <th>Details</th>
                                              <th>Actions</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {item.customAssets[viewName].texts.map((text, idx) => (
                                              <tr key={idx}>
                                                <td>{text.content || `Text ${idx + 1}`}</td>
                                                <td className="details-cell">
                                                  Font: {text.fontFamily || 'N/A'}, Size: {text.fontSize || 'N/A'}px, Color: {text.color || 'N/A'}
                                                </td>
                                                <td className="actions-cell">
                                                  <button 
                                                    className="btn-view"
                                                    onClick={() => setSelectedTextInfo(text)}
                                                  >
                                                    View
                                                  </button>
                                                  <button 
                                                    className="btn-download"
                                                    onClick={() => {
                                                      const textData = `Text: ${text.content}\nFont: ${text.fontFamily}\nSize: ${text.fontSize}px\nColor: ${text.color}`;
                                                      const blob = new Blob([textData], { type: 'text/plain' });
                                                      const url = URL.createObjectURL(blob);
                                                      const link = document.createElement('a');
                                                      link.href = url;
                                                      link.download = `text${idx + 1}.txt`;
                                                      link.click();
                                                      URL.revokeObjectURL(url);
                                                    }}
                                                  >
                                                    Download
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <p className="no-assets">No text in this view</p>
                                      )}
                                    </div>
                                  </div>
                                )
                              ))}
                            </div>
                          )}

                          {/* Preview Tab Content */}
                          {activeAssetTab === `preview-${index}` && (
                            <div className="preview-content">
                              {item.previewImage ? (
                                <div className="preview-item">
                                  <img src={item.previewImage} alt={`Preview for ${item.title}`} className="preview-image" />
                                  <button 
                                    className="btn-download"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = item.previewImage;
                                      link.download = `preview-${item.id || index}.png`;
                                      link.click();
                                    }}
                                  >
                                    Download Preview
                                  </button>
                                </div>
                              ) : item.img ? (
                                <div className="preview-item">
                                  <img src={item.img} alt={`Preview for ${item.title}`} className="preview-image" />
                                  <button 
                                    className="btn-download"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = item.img;
                                      link.download = `preview-${item.id || index}.png`;
                                      link.click();
                                    }}
                                  >
                                    Download Preview
                                  </button>
                                </div>
                              ) : (
                                <p className="no-assets">No preview image available</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="detail-section">
                <h4>Order Summary</h4>
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping ({selectedOrder.shipping_method}):</span>
                  <span>{formatPrice(selectedOrder.shipping_cost)}</span>
                </div>
                <div className="summary-row total">
                  <span><strong>Total:</strong></span>
                  <span><strong>{formatPrice(selectedOrder.total_amount)}</strong></span>
                </div>
              </div>

              {/* Order Status Update */}
              <div className="detail-section">
                <h4>Update Order Status</h4>
                <div className="status-update-section">
                  <span className={getStatusBadgeClass(selectedOrder.status)}>
                    Current: {selectedOrder.status}
                  </span>
                  <div className="status-buttons">
                    {selectedOrder.status !== 'pending' && (
                      <button
                        className="btn-status pending"
                        onClick={() => updateOrderStatus(selectedOrder.order_id, 'pending')}
                      >
                        Set Pending
                      </button>
                    )}
                    {selectedOrder.status !== 'processing' && (
                      <button
                        className="btn-status processing"
                        onClick={() => updateOrderStatus(selectedOrder.order_id, 'processing')}
                      >
                        Set Processing
                      </button>
                    )}
                    {selectedOrder.status !== 'completed' && (
                      <button
                        className="btn-status completed"
                        onClick={() => updateOrderStatus(selectedOrder.order_id, 'completed')}
                      >
                        Set Completed
                      </button>
                    )}
                    {selectedOrder.status !== 'cancelled' && (
                      <button
                        className="btn-status cancelled"
                        onClick={() => updateOrderStatus(selectedOrder.order_id, 'cancelled')}
                      >
                        Set Cancelled
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Info Modal */}
      {selectedTextInfo && (
        <div className="modal-overlay" onClick={() => setSelectedTextInfo(null)}>
          <div className="modal-content text-info-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Text Information</h3>
              <button className="modal-close" onClick={() => setSelectedTextInfo(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="text-info-item">
                <strong>Content:</strong> <span>{selectedTextInfo.content}</span>
              </div>
              <div className="text-info-item">
                <strong>Font Family:</strong> <span>{selectedTextInfo.fontFamily || 'Arial'}</span>
              </div>
              <div className="text-info-item">
                <strong>Font Size:</strong> <span>{selectedTextInfo.fontSize || '20'}px</span>
              </div>
              <div className="text-info-item">
                <strong>Color:</strong> 
                <span>
                  {selectedTextInfo.color || '#000000'}
                  <span 
                    className="color-preview" 
                    style={{ backgroundColor: selectedTextInfo.color || '#000000' }}
                  ></span>
                </span>
              </div>
              {selectedTextInfo.position && (
                <>
                  <div className="text-info-item">
                    <strong>Position X:</strong> <span>{selectedTextInfo.position.x}px</span>
                  </div>
                  <div className="text-info-item">
                    <strong>Position Y:</strong> <span>{selectedTextInfo.position.y}px</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
