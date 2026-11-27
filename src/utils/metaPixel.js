// Meta (Facebook / Instagram) Pixel. The Pixel ID is public, so it comes from
// a VITE_ env var; when it is missing or still a placeholder every call below
// is a no-op and the storefront behaves exactly as before.

const PIXEL_ID = String(import.meta.env.VITE_META_PIXEL_ID || '').trim()
const CURRENCY = 'PKR'
const SCRIPT_SRC = 'https://connect.facebook.net/en_US/fbevents.js'
const INITIATE_CHECKOUT_KEY = 'dermyx_meta_initiate_checkout'
const INITIATE_CHECKOUT_TTL = 30 * 60 * 1000

const hasPixelId = () => /^\d{5,}$/.test(PIXEL_ID)

let initialized = false
let lastTrackedPath = ''
let lastInitiateCheckout = { signature: '', at: 0 }
const firedPurchases = new Set()

const currentPath = () => `${window.location.pathname}${window.location.search}`

const safeGet = (key) => {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key, value) => {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Storage can be blocked (private mode); in-memory guards still apply.
  }
}

const safeRemove = (key) => {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

const installFbq = () => {
  if (typeof window.fbq === 'function') return

  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = !0
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = !0
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  })(window, document, 'script', SCRIPT_SRC)
}

export const initMetaPixel = () => {
  if (initialized) return true
  if (typeof window === 'undefined' || !hasPixelId()) return false

  installFbq()
  window.fbq('init', PIXEL_ID)
  initialized = true
  // The base PageView is fired here once; the router tracker only handles
  // subsequent navigations and skips this path.
  lastTrackedPath = currentPath()
  window.fbq('track', 'PageView')
  return true
}

export const isMetaPixelReady = () =>
  initialized && typeof window !== 'undefined' && typeof window.fbq === 'function'

export const trackMetaEvent = (event, params = {}, eventId = '') => {
  if (!event || !isMetaPixelReady()) return false
  try {
    if (eventId) window.fbq('track', event, params, { eventID: String(eventId) })
    else window.fbq('track', event, params)
    return true
  } catch {
    return false
  }
}

export const trackCustomMetaEvent = (event, params = {}) => {
  if (!event || !isMetaPixelReady()) return false
  try {
    window.fbq('trackCustom', event, params)
    return true
  } catch {
    return false
  }
}

export const trackPageView = () => {
  if (!isMetaPixelReady()) return false
  const path = currentPath()
  if (path === lastTrackedPath) return false
  if (!trackMetaEvent('PageView')) return false
  lastTrackedPath = path
  return true
}

export const trackViewContent = (product) => {
  if (!product?._id || !product?.name) return false
  return trackMetaEvent('ViewContent', {
    content_ids: [String(product._id)],
    content_type: 'product',
    content_name: product.name,
    value: +(Number(product.price) || 0).toFixed(2),
    currency: CURRENCY,
  })
}

export const trackAddToCart = (product, quantity = 1, value) => {
  if (!product?._id) return false
  const qty = Math.max(1, Number(quantity) || 1)
  const lineValue = Number(value ?? product.price) || 0
  return trackMetaEvent('AddToCart', {
    content_ids: [String(product._id)],
    content_type: 'product',
    content_name: product.name || undefined,
    value: +lineValue.toFixed(2),
    currency: CURRENCY,
    quantity: qty,
  })
}

export const trackInitiateCheckoutOnce = (signature, { contentIds = [], value = 0, numItems = 0 } = {}) => {
  if (!signature || contentIds.length === 0) return false

  const stored = safeGet(INITIATE_CHECKOUT_KEY)
  if (stored) {
    try {
      const previous = JSON.parse(stored)
      const isSameRecently =
        previous?.signature === signature && Date.now() - Number(previous?.at || 0) < INITIATE_CHECKOUT_TTL
      if (isSameRecently) return false
    } catch {
      // Unreadable value: fall through and track again.
    }
  }
  if (lastInitiateCheckout.signature === signature && Date.now() - lastInitiateCheckout.at < INITIATE_CHECKOUT_TTL) {
    return false
  }

  const tracked = trackMetaEvent('InitiateCheckout', {
    content_ids: contentIds.map(String),
    content_type: 'product',
    value: +(Number(value) || 0).toFixed(2),
    currency: CURRENCY,
    num_items: Math.max(1, Number(numItems) || contentIds.length),
  })

  if (tracked) {
    lastInitiateCheckout = { signature, at: Date.now() }
    safeSet(INITIATE_CHECKOUT_KEY, JSON.stringify(lastInitiateCheckout))
  }
  return tracked
}

export const trackPurchaseOnce = (orderId, { value = 0, contentIds = [], numItems = 0 } = {}) => {
  if (!orderId) return false

  const key = `dermyx_meta_purchase_${orderId}`
  if (firedPurchases.has(String(orderId)) || safeGet(key)) return false

  const tracked = trackMetaEvent(
    'Purchase',
    {
      content_ids: contentIds.map(String),
      content_type: 'product',
      value: +(Number(value) || 0).toFixed(2),
      currency: CURRENCY,
      num_items: Math.max(1, Number(numItems) || contentIds.length),
    },
    String(orderId),
  )

  if (tracked) {
    firedPurchases.add(String(orderId))
    safeSet(key, '1')
    // A completed order starts a fresh funnel for the next checkout.
    lastInitiateCheckout = { signature: '', at: 0 }
    safeRemove(INITIATE_CHECKOUT_KEY)
  }
  return tracked
}
