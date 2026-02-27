/**
 * useLocation Hook
 * React hook for accessing user location and currency
 */

import { useState, useEffect } from 'react'
import { clearLocationCache, detectUserLocation, getCurrencyForCountry, formatPriceByCurrency, convertPriceByCurrency } from './locationService'

export function useLocation() {
  const [location, setLocation] = useState(null)
  const [currency, setCurrency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    async function loadLocation() {
      try {
        setLoading(true)
        const locationData = await detectUserLocation()
        setLocation(locationData)

        const currencyData = locationData?.currency || getCurrencyForCountry(locationData.countryCode)
        setCurrency(currencyData)
        
        setError(null)
      } catch (err) {
        console.error('Error loading location:', err)
        setError(err.message)
        
        // Set default Bangladesh
        setLocation({
          country: 'Bangladesh',
          countryCode: 'BD',
          city: '',
          region: '',
          postal: ''
        })
        setCurrency(getCurrencyForCountry('BD'))
      } finally {
        setLoading(false)
      }
    }

    loadLocation()
  }, [refreshNonce])

  const refreshLocation = async () => {
    try {
      clearLocationCache()
    } catch {
      // ignore
    }
    setRefreshNonce(n => n + 1)
  }

  // Helper functions
  const formatPriceHelper = (priceInBDT) => {
    if (!currency) return `৳ ${priceInBDT.toFixed(2)}`
    return formatPriceByCurrency(priceInBDT, currency)
  }

  const formatPriceWithCodeHelper = (priceInBDT) => {
    // Keep legacy behavior: return a code-prefixed string.
    if (!currency) return `TK ${priceInBDT.toFixed(2)}`
    const converted = convertPriceByCurrency(priceInBDT, currency)
    return `${currency.code} ${converted.toFixed(2)}`
  }

  const convertPriceHelper = (priceInBDT) => {
    if (!currency) return priceInBDT
    return convertPriceByCurrency(priceInBDT, currency)
  }

  return {
    location,
    currency,
    loading,
    error,
    formatPrice: formatPriceHelper,
    formatPriceWithCode: formatPriceWithCodeHelper,
    convertPrice: convertPriceHelper,
    isReady: !loading && location !== null,
    refreshLocation
  }
}
