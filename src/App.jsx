import { ReactFlowProvider } from '@xyflow/react'
import DockBar from './components/DockBar'
import FocusFab from './components/FocusFab'
import FocusMode from './components/FocusMode'
import LicenseKeyDialog from './components/LicenseKeyDialog'
import MainHeader from './components/MainHeader'
import UpgradeModal from './components/UpgradeModal'
import VoidFlowCanvas from './components/VoidFlowCanvas'
import { BillingProvider } from './stores/BillingProvider'
import { VoidTubeProvider, useVoidTubeStore } from './stores/useVoidTubeStore'
import { cn } from './lib/utils'

function AppShell() {
  const { addVideoNode, generateVideoPlaylist, focus } = useVoidTubeStore()

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      <MainHeader
        onAddVideo={addVideoNode}
        onGeneratePlaylist={generateVideoPlaylist}
      />

      <div className={cn('relative min-h-0 flex-1', focus.active && 'focus-canvas-dim')}>
        <VoidFlowCanvas />
        {!focus.active && <DockBar />}
        {!focus.active && <FocusFab />}
      </div>

      <FocusMode />
    </div>
  )
}

export default function App() {
  return (
    <BillingProvider>
      <VoidTubeProvider>
        <ReactFlowProvider>
          <AppShell />
          <UpgradeModal />
          <LicenseKeyDialog />
        </ReactFlowProvider>
      </VoidTubeProvider>
    </BillingProvider>
  )
}
