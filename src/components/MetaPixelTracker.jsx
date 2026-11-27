import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackPageView } from '../utils/metaPixel'

const MetaPixelTracker = () => {
  const { pathname, search } = useLocation()
  const lastPath = useRef('')

  useEffect(() => {
    const path = `${pathname}${search}`
    if (lastPath.current === path) return
    lastPath.current = path
    trackPageView()
  }, [pathname, search])

  return null
}

export default MetaPixelTracker
