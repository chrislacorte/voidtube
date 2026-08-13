import AppLogo from './AppLogo'
import SearchAutocomplete from './SearchAutocomplete'
import LayoutPicker from './LayoutPicker'
import PlaylistDropdown from './PlaylistDropdown'
import ThemeToggle from './ThemeToggle'
import UsageBadge from './UsageBadge'
import { Button } from './ui/button'
import { Settings } from 'lucide-react'
import { useBilling } from '../stores/BillingProvider'

export default function MainHeader({ onAddVideo, onGeneratePlaylist }) {
  const { openUpgradeModal, openLicenseDialog } = useBilling()

  return (
    <header className="top-bar">
      <div className="top-bar-bg" aria-hidden />

      <div className="top-bar-inner">
        <AppLogo />

        <div className="top-bar-search">
          <SearchAutocomplete
            onAddVideo={onAddVideo}
            onGeneratePlaylist={onGeneratePlaylist}
          />
        </div>

        <div className="top-bar-actions">
          <UsageBadge />
          <div className="top-bar-glass-chip">
            <ThemeToggle />
            <PlaylistDropdown />
            <LayoutPicker />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="top-bar-settings-btn"
            onClick={openLicenseDialog}
            aria-label="Settings — enter license key"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="top-bar-auth-btn"
            onClick={() => openUpgradeModal()}
          >
            License
          </Button>
        </div>
      </div>
    </header>
  )
}
