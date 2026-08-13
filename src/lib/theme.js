export const THEME_STORAGE_KEY = 'voidtube-theme'

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.classList.toggle('dark', next === 'dark')
  document.documentElement.style.colorScheme = next
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // ignore
  }
  return next
}

export function initTheme() {
  return applyTheme(getStoredTheme())
}

export function toggleTheme() {
  const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
  return applyTheme(next)
}
