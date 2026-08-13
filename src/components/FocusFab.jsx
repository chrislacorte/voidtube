import { Maximize2 } from 'lucide-react'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import { cn } from '../lib/utils'

export default function FocusFab() {
  const { activeCanvas, focus, enterFocusMode } = useVoidTubeStore()

  const firstVideo = activeCanvas.nodes.find((n) => n.type === 'video')

  const handleFocus = () => {
    if (firstVideo) {
      enterFocusMode(firstVideo.id)
    }
  }

  if (focus.active) return null

  return (
    <button
      type="button"
      title={firstVideo ? 'Start Focus Mode' : 'Add a video first'}
      onClick={handleFocus}
      disabled={!firstVideo}
      className={cn(
        'pointer-events-auto absolute bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center',
        'rounded-full border border-border bg-background/90 shadow-lg backdrop-blur-md',
        'text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      <Maximize2 size={20} strokeWidth={1.75} />
    </button>
  )
}
