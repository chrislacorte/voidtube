import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyTheme, getStoredTheme } from '../lib/theme'
import { Button } from './ui/button'

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => getStoredTheme())

  useEffect(() => {
    setTheme(getStoredTheme())
  }, [])

  const handleToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-9 w-9 px-0"
      title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      aria-label={theme === 'dark' ? 'Enable light mode' : 'Enable dark mode'}
    >
      {theme === 'dark' ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
    </Button>
  )
}
