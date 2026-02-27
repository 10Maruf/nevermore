import React, { useEffect, useMemo, useState } from 'react'
import { useLocation as useRouterLocation, useSearchParams } from 'react-router-dom'
import { getApiUrl, resolveBackendUrl } from '../config/api'
import { useLocation } from '../lib/useLocation'
import './search.css'
import Header from './navbar'

export default function SearchResults({ navigate }) {
  const { formatPrice } = useLocation()

  const routerLocation = useRouterLocation()

  const [searchParams, setSearchParams] = useSearchParams()
  const legacyQuery = (searchParams.get('q') || '').trim()
  const stateQuery = (routerLocation && routerLocation.state && routerLocation.state.q
    ? String(routerLocation.state.q)
    : '').trim()

  const initialQuery = useMemo(() => {
    return stateQuery || legacyQuery || ''
  }, [legacyQuery, stateQuery])

  const [searchInput, setSearchInput] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalResults, setTotalResults] = useState(0)
  const [sortBy, setSortBy] = useState('featured')
  const [showFilter, setShowFilter] = useState(false)
  const [wishlist, setWishlist] = useState([])
  const [popularProducts, setPopularProducts] = useState([])

  const [popularLoading, setPopularLoading] = useState(false)

  // If opened via legacy URL /search?q=..., read once then clean the URL.
  useEffect(() => {
    if (legacyQuery) {
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce typing -> query (prevents API call on every keystroke)
  useEffect(() => {
    const v = searchInput.trim()
    const t = setTimeout(() => {
      setQuery(v)
    }, 250)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load popular products (backend-based)
  useEffect(() => {
    async function fetchPopularProducts() {
      try {
        setPopularLoading(true)
        const url = getApiUrl('/api/products/popular.php?limit=12&days=30')
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })
        const text = await response.text()

        // Guard: API not found or server returned HTML
        if (text.startsWith('<!') || text.startsWith('<html')) {
          return
        }

        const data = JSON.parse(text)
        if (data.status !== 'success' || !data.data || !Array.isArray(data.data.products)) {
          return
        }

        const transformed = data.data.products.map(product => {
          let primaryImage = null
          if (product.variants && product.variants.length > 0) {
            for (const variant of product.variants) {
              if (variant.image) {
                primaryImage = variant.image
                break
              }
            }
          }

          return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.base_price,
            category_slug: product.category_slug,
            category_name: product.category_name,
            parent_category: product.parent_category,
            primary_image: primaryImage,
            colors: product.variants
              ? product.variants.map(v => v.color_code).filter(Boolean)
              : []
          }
        })

        setPopularProducts(transformed)
      } catch (e) {
        // ignore
      } finally {
        setPopularLoading(false)
      }
    }

    fetchPopularProducts()
  }, [])

  async function trackPopularProduct(product) {
    try {
      if (!product?.id) return
      const url = getApiUrl('/api/products/track_click.php')
      await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: product.id, source: 'search' }),
      })
    } catch (e) {
      // ignore
    }
  }

  // Fetch search results
  useEffect(() => {
    async function fetchSearchResults() {
      if (!query || query.length < 2) {
        setProducts([])
        setLoading(false)
        setTotalResults(0)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const url = getApiUrl(`/api/products/search.php?q=${encodeURIComponent(query)}`)
        console.log('Search API URL:', url)
        
        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
          },
        })
        const text = await response.text()
        
        // Check if response is HTML (API not found) or JSON
        if (text.startsWith('<!') || text.startsWith('<html')) {
          console.error('Search API not available - received HTML instead of JSON')
          setError('Search feature is temporarily unavailable')
          setProducts([])
          setTotalResults(0)
          return
        }
        
        const data = JSON.parse(text)
        console.log('Search response:', data)
        
        if (data.status === 'success' && data.data && data.data.products) {
          // Transform the data to match expected format
          const transformedProducts = data.data.products.map(product => {
            // Get first image from first variant's image field
            let primaryImage = null
            if (product.variants && product.variants.length > 0) {
              for (const variant of product.variants) {
                if (variant.image) {
                  primaryImage = variant.image
                  break
                }
              }
            }
            
            return {
              id: product.id,
              name: product.name,
              description: product.description,
              price: product.base_price,
              category_slug: product.category_slug,
              category_name: product.category_name,
              parent_category: product.parent_category,
              primary_image: primaryImage,
              colors: product.variants 
                ? product.variants.map(v => v.color_code).filter(Boolean)
                : []
            }
          })
          
          setProducts(transformedProducts)
          setTotalResults(data.data.total || transformedProducts.length)
        } else {
          setError(data.message || 'No results found')
          setProducts([])
          setTotalResults(0)
        }
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to search products. Please try again.')
        setProducts([])
        setTotalResults(0)
      } finally {
        setLoading(false)
      }
    }

    fetchSearchResults()
  }, [query])

  // Load wishlist from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('wishlist') || '[]')
      setWishlist(saved)
    } catch (e) {}
  }, [])

  // Close filter on Escape key
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setShowFilter(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function toggleWishlist(e, product) {
    e.stopPropagation()
    const exists = wishlist.some(item => item.productId === product.id)
    let updated
    if (exists) {
      updated = wishlist.filter(item => item.productId !== product.id)
    } else {
      updated = [...wishlist, {
        id: `${product.id}-${Date.now()}`,
        productId: product.id,
        title: product.name,
        img: product.primary_image ? resolveBackendUrl(product.primary_image) : '/assets/placeholders/no-image.png',
        price: parseFloat(product.price)
      }]
    }
    setWishlist(updated)
    localStorage.setItem('wishlist', JSON.stringify(updated))
  }

  function isInWishlist(productId) {
    return wishlist.some(item => item.productId === productId)
  }

  function getSortedProducts() {
    const list = [...products]
    if (sortBy === 'price_asc') {
      list.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => b.name.localeCompare(a.name))
    }
    return list
  }

  // Highlight search term in text
  function highlightText(text, searchTerm) {
    if (!text || !searchTerm) return text
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="search-highlight">{part}</mark> : part
    )
  }

  return (
    <div className="search-results-page">
      <Header navigate={navigate} />

      <section className="search-header">
        <div className="search-header-top">
          <div className="search-title-section">
            <h1>Search</h1>
            {query && (
              <p className="search-query-info">
                {loading ? 'Searching...' : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"`}
              </p>
            )}
          </div>

          {products.length > 0 && (
            <button className="refine-btn" onClick={() => setShowFilter(true)}>REFINE</button>
          )}
        </div>

        <div className="search-input-row">
          <input
            className="search-page-input"
            value={searchInput}
            onChange={(e) => {
              const v = e.target.value
              setSearchInput(v)
            }}
            placeholder="Search products, collections..."
            aria-label="Search"
            autoComplete="off"
            autoFocus
          />
        </div>
      </section>

      {showFilter && (
        <div className="filter-popup" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setShowFilter(false) }}>
          <div className="filter-content" role="document">
            <span className="close-btn" onClick={() => setShowFilter(false)}>&times;</span>
            <h3>Sort by</h3>
            <ul className="filter-list">
              <li onClick={() => { setSortBy('featured'); setShowFilter(false); }}>Relevance</li>
              <li onClick={() => { setSortBy('name_asc'); setShowFilter(false); }}>Name, A to Z</li>
              <li onClick={() => { setSortBy('name_desc'); setShowFilter(false); }}>Name, Z to A</li>
              <li onClick={() => { setSortBy('price_asc'); setShowFilter(false); }}>Price, Low to High</li>
              <li onClick={() => { setSortBy('price_desc'); setShowFilter(false); }}>Price, High to Low</li>
            </ul>
          </div>
        </div>
      )}

      <section className="search-content">
        {!query || query.length < 2 ? (
          popularProducts.length > 0 ? (
            <>
              <div className="search-section-title">Popular products</div>
              <div className="product-grid">
                {popularProducts.map(product => (
                  <div
                    key={product.id}
                    className="product-card"
                    onClick={() => {
                      trackPopularProduct(product)
                      navigate(`/product/${product.id}`)
                    }}
                  >
                    <img
                      src={product.primary_image ? resolveBackendUrl(product.primary_image) : '/assets/placeholders/no-image.png'}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.target.src = '/assets/placeholders/no-image.png' }}
                    />
                    <div className="product-info">
                      {product.parent_category && product.category_name && (
                        <span className="product-category">{product.parent_category} / {product.category_name}</span>
                      )}
                      <span className="product-name">{product.name}</span>
                      <span className="product-price">{formatPrice(parseFloat(product.price))}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="search-message">
              {popularLoading ? (
                <>
                  <div className="search-spinner"></div>
                  <h2>Loading popular products...</h2>
                </>
              ) : (
                <>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <h2>Start typing to search</h2>
              <p>Enter at least 2 characters to search for products.</p>
                </>
              )}
            </div>
          )
        ) : loading ? (
          <div className="search-message">
            <div className="search-spinner"></div>
            <h2>Searching...</h2>
            <p>Looking for products matching "{query}"</p>
          </div>
        ) : error ? (
          <div className="search-message error">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <h2>Search Error</h2>
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="search-message">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <h2>No results found</h2>
            <p>We couldn't find any products matching "{query}".</p>
            <p className="search-suggestions">Try checking your spelling or use different keywords.</p>
          </div>
        ) : (
          <div className="product-grid">
            {getSortedProducts().map(product => (
              <div
                key={product.id}
                className="product-card"
                onClick={() => {
                  trackPopularProduct(product)
                  navigate(`/product/${product.id}`)
                }}
              >
                <img 
                  src={product.primary_image ? resolveBackendUrl(product.primary_image) : '/assets/placeholders/no-image.png'} 
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.src = '/assets/placeholders/no-image.png' }}
                />
                <button 
                  className={`wishlist-btn ${isInWishlist(product.id) ? 'active' : ''}`} 
                  onClick={(e) => toggleWishlist(e, product)}
                  aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={isInWishlist(product.id) ? '#e53935' : 'none'} stroke={isInWishlist(product.id) ? '#e53935' : '#333'} strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
                <div className="product-info">
                  <span className="product-category">{product.parent_category} / {product.category_name}</span>
                  <span className="product-name">{highlightText(product.name, query)}</span>
                  <span className="product-price">{formatPrice(parseFloat(product.price))}</span>
                  {product.colors && product.colors.length > 0 && (
                    <div className="color-options">
                      {product.colors.slice(0, 5).map((color, i) => (
                        <span 
                          key={i} 
                          className="color-dot" 
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                      {product.colors.length > 5 && (
                        <span className="more-colors">+{product.colors.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
