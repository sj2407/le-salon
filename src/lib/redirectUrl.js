import { Capacitor } from '@capacitor/core'

const WEB_BASE = 'https://le-salon.vercel.app'

export const getRedirectUrl = (path = '') =>
  Capacitor.isNativePlatform() ? WEB_BASE + path : window.location.origin + path
