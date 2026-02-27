/**
 * Location Service
 * Detects user location via IP address and provides currency/address information
 */

// Currency mapping with conversion rates (base: BDT Taka)
export const CURRENCY_MAP = {
  'BD': { code: 'TK', symbol: '৳', rate: 1, name: 'Bangladesh' },
  'IN': { code: 'INR', symbol: '₹', rate: 0.78, name: 'India' },
  'US': { code: 'USD', symbol: '$', rate: 0.0091, name: 'United States' },
  'CA': { code: 'CAD', symbol: 'C$', rate: 0.011, name: 'Canada' },
  'GB': { code: 'GBP', symbol: '£', rate: 0.0069, name: 'United Kingdom' },
  'AU': { code: 'AUD', symbol: 'A$', rate: 0.013, name: 'Australia' },
  'NZ': { code: 'NZD', symbol: 'NZ$', rate: 0.015, name: 'New Zealand' },
  'AE': { code: 'AED', symbol: 'د.إ', rate: 0.033, name: 'United Arab Emirates' },
  'SA': { code: 'SAR', symbol: 'ر.س', rate: 0.034, name: 'Saudi Arabia' },
  'SG': { code: 'SGD', symbol: 'S$', rate: 0.012, name: 'Singapore' },
  'MY': { code: 'MYR', symbol: 'RM', rate: 0.039, name: 'Malaysia' },
  'EU': { code: 'EUR', symbol: '€', rate: 0.0084, name: 'Europe' },
  'FR': { code: 'EUR', symbol: '€', rate: 0.0084, name: 'France' },
  'DE': { code: 'EUR', symbol: '€', rate: 0.0084, name: 'Germany' },
  'IT': { code: 'EUR', symbol: '€', rate: 0.0084, name: 'Italy' },
  'ES': { code: 'EUR', symbol: '€', rate: 0.0084, name: 'Spain' },
}

// Default to Bangladesh if country not found
const DEFAULT_CURRENCY = CURRENCY_MAP['BD']

// FX rate caching (BDT -> target currency)
const FX_CACHE_KEY = 'fxRates'
const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const FX_BASE = 'BDT'

function readFxCache() {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.base !== FX_BASE) return null
    if (!parsed.timestamp || !parsed.rates || typeof parsed.rates !== 'object') return null
    const age = Date.now() - parsed.timestamp
    if (age > FX_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeFxCache(rates) {
  try {
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify({
      base: FX_BASE,
      timestamp: Date.now(),
      rates
    }))
  } catch {
    // ignore
  }
}

async function getFxRateFromBDT(targetCurrencyCode) {
  const code = String(targetCurrencyCode || '').toUpperCase()
  if (!code) throw new Error('Missing currency code')
  if (code === 'BDT' || code === 'TK') return 1

  const cached = readFxCache()
  if (cached?.rates?.[code] && Number.isFinite(cached.rates[code])) {
    return cached.rates[code]
  }

  // exchangerate.host is typically CORS-friendly.
  const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(FX_BASE)}&symbols=${encodeURIComponent(code)}`
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`FX fetch failed (HTTP ${response.status})`)
  }
  const data = await response.json()
  const rate = data?.rates?.[code]
  if (!Number.isFinite(rate)) {
    throw new Error('Invalid FX rate response')
  }

  const newRates = { ...(cached?.rates || {}) }
  newRates[code] = rate
  writeFxCache(newRates)
  return rate
}

/**
 * Get currency info for a country code, using live FX (cached) when possible.
 * Returns the same shape as getCurrencyForCountry: { code, symbol, rate, name }
 */
export async function getLiveCurrencyForCountry(countryCode) {
  const base = getCurrencyForCountry(String(countryCode || '').toUpperCase())

  // Keep BD pinned to TK/৳ with rate=1
  if (base.code === 'TK') {
    return { ...base, rate: 1 }
  }

  try {
    const rate = await getFxRateFromBDT(base.code)
    if (Number.isFinite(rate)) {
      return { ...base, rate }
    }
  } catch (e) {
    // Ignore and fall back to static rates
  }

  return base
}

/**
 * Detect user location using IP address
 * Uses a public IP geo lookup.
 * Note: some providers (e.g. ipapi.co) may block browser requests via CORS.
 */
export async function detectUserLocation() {
  try {
    // Check if location is cached in localStorage (cache for 24 hours)
    const cached = localStorage.getItem('userLocation')
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp
      const ONE_DAY = 24 * 60 * 60 * 1000
      
      if (age < ONE_DAY) {
        console.log('Using cached location:', data)
        return data
      }
    }

    // Try a CORS-friendly provider first, then fall back.
    const providers = [
      {
        name: 'ipwho.is',
        url: 'https://ipwho.is/',
        parse: (data) => {
          if (data && data.success === false) {
            throw new Error(data.message || 'Failed to fetch location')
          }
          return {
            country: data?.country || 'Bangladesh',
            countryCode: data?.country_code || 'BD',
            city: data?.city || '',
            region: data?.region || '',
            postal: data?.postal || '',
            latitude: data?.latitude ?? null,
            longitude: data?.longitude ?? null,
            ip: data?.ip || '',
            timezone: data?.timezone?.id || data?.timezone || 'Asia/Dhaka',
            // currency info (varies by country)
            currencyCode: data?.currency?.code || '',
            currencySymbol: data?.currency?.symbol || ''
          }
        }
      },
      {
        name: 'ipapi.co',
        url: 'https://ipapi.co/json/',
        parse: (data) => ({
          country: data?.country_name || 'Bangladesh',
          countryCode: data?.country_code || 'BD',
          city: data?.city || '',
          region: data?.region || '',
          postal: data?.postal || '',
          latitude: data?.latitude ?? null,
          longitude: data?.longitude ?? null,
          ip: data?.ip || '',
          timezone: data?.timezone || 'Asia/Dhaka',
          currencyCode: '',
          currencySymbol: ''
        })
      }
    ]

    let locationData = null
    let lastError = null

    for (const provider of providers) {
      try {
        const response = await fetch(provider.url, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        locationData = provider.parse(data)
        console.log(`Detected location (${provider.name}):`, locationData)
        break
      } catch (e) {
        lastError = e
        console.warn(`Location provider failed (${provider.name}):`, e)
      }
    }

    if (!locationData) {
      throw lastError || new Error('Failed to fetch location')
    }

    // Determine display currency for this country.
    // - BD: show TK (local preference) and rate=1
    // - Others: use provider currency code/symbol when available; otherwise fall back to map.
    let displayCode = ''
    let displaySymbol = ''
    let rate = null

    if ((locationData.countryCode || '').toUpperCase() === 'BD') {
      displayCode = 'TK'
      displaySymbol = '৳'
      rate = 1
    } else if (locationData.currencyCode) {
      displayCode = String(locationData.currencyCode).toUpperCase()
      displaySymbol = locationData.currencySymbol || displayCode
      try {
        rate = await getFxRateFromBDT(displayCode)
      } catch (e) {
        console.warn('FX rate fetch failed, falling back to static map:', e)
      }
    }

    if (!displayCode || !displaySymbol || !Number.isFinite(rate)) {
      const fallback = getCurrencyForCountry((locationData.countryCode || '').toUpperCase())
      displayCode = fallback.code
      displaySymbol = fallback.symbol
      rate = fallback.rate
    }

    locationData.currency = {
      code: displayCode,
      symbol: displaySymbol,
      rate
    }

    // Cache the result
    localStorage.setItem('userLocation', JSON.stringify({
      data: locationData,
      timestamp: Date.now()
    }))

    return locationData

  } catch (error) {
    console.error('Error detecting location:', error)
    
    // Return default (Bangladesh) on error
    return {
      country: 'Bangladesh',
      countryCode: 'BD',
      city: '',
      region: '',
      postal: '',
      latitude: null,
      longitude: null,
      ip: '',
      timezone: 'Asia/Dhaka',
      currency: {
        code: 'TK',
        symbol: '৳',
        rate: 1
      }
    }
  }
}

/**
 * Get currency info for a country code
 */
export function getCurrencyForCountry(countryCode) {
  return CURRENCY_MAP[countryCode] || DEFAULT_CURRENCY
}

/**
 * Format price in a provided currency object
 */
export function formatPriceByCurrency(priceInBDT, currency) {
  const c = currency || DEFAULT_CURRENCY
  const convertedPrice = priceInBDT * (Number.isFinite(c.rate) ? c.rate : 1)
  return `${c.symbol} ${convertedPrice.toFixed(2)} ${c.code}`
}

/**
 * Convert price using a provided currency object
 */
export function convertPriceByCurrency(priceInBDT, currency) {
  const c = currency || DEFAULT_CURRENCY
  return priceInBDT * (Number.isFinite(c.rate) ? c.rate : 1)
}

/**
 * Format price in user's currency
 */
export function formatPrice(priceInBDT, countryCode) {
  const currency = getCurrencyForCountry(countryCode)
  const convertedPrice = priceInBDT * currency.rate
  
  // Format with 2 decimal places and currency code
  return `${currency.symbol} ${convertedPrice.toFixed(2)} ${currency.code}`
}

/**
 * Format price with currency code
 */
export function formatPriceWithCode(priceInBDT, countryCode) {
  const currency = getCurrencyForCountry(countryCode)
  const convertedPrice = priceInBDT * currency.rate
  
  return `${currency.code} ${convertedPrice.toFixed(2)}`
}

/**
 * Get converted price value (number only)
 */
export function convertPrice(priceInBDT, countryCode) {
  const currency = getCurrencyForCountry(countryCode)
  return priceInBDT * currency.rate
}

/**
 * Clear cached location (useful for testing)
 */
export function clearLocationCache() {
  localStorage.removeItem('userLocation')
}
