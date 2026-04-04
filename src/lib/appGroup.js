// App Group storage — bridges to native iOS plugin for Share Extension token sharing
// On web (non-Capacitor), falls back to localStorage

import { Capacitor, registerPlugin } from '@capacitor/core'

const AppGroup = Capacitor.isNativePlatform()
  ? registerPlugin('AppGroup')
  : null

export async function setAppGroupValue(key, value) {
  if (AppGroup) {
    await AppGroup.set({ key, value })
  } else {
    localStorage.setItem(`appgroup_${key}`, value)
  }
}

export async function getAppGroupValue(key) {
  if (AppGroup) {
    const result = await AppGroup.get({ key })
    return result?.value || null
  }
  return localStorage.getItem(`appgroup_${key}`)
}

export async function removeAppGroupValue(key) {
  if (AppGroup) {
    await AppGroup.remove({ key })
  } else {
    localStorage.removeItem(`appgroup_${key}`)
  }
}
