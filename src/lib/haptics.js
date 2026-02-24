import { haptic as iosHaptic } from 'ios-haptics'

/**
 * Haptic feedback — works on both iOS (Safari 17.4+ via checkbox switch trick)
 * and Android (navigator.vibrate). Silent no-op on desktop/unsupported.
 */
export const hapticTap = () => iosHaptic()
export const hapticConfirm = () => iosHaptic.confirm()
export const hapticError = () => iosHaptic.error()
