import { FileText, Folder, Layout, Search, StickyNote, Type } from 'lucide-react'
import { useState } from 'react'
import { useVoidTubeStore } from '../stores/useVoidTubeStore'
import CanvasSwitcher from './CanvasSwitcher'
import SearchPanel from './SearchPanel'
import { useCanvasCenter } from './VoidFlowCanvas'

export default function TopBar() {
  const { addNode, addVideoNode, sidebarOpen, setSidebarOpen } = useVoidTubeStore()
  const getCenter = useCanvasCenter()
  const [searchOpen, setSearchOpen] = useState(false)

  const addNote = (type) => {
    const position = getCenter()
    addNode(type, position)
  }

  return (
    <>
      <header className="absolute left-0 right-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-white/5 bg-[#0d0d0d]/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Layout size={18} className="text-violet-500" />
          <span className="text-sm font-semibold tracking-tight text-white/90">VoidTube</span>
        </div>

        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`rounded-lg border px-2 py-1.5 transition ${
            sidebarOpen
              ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
              : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
          }`}
          title="Folders"
        >
          <Folder size={14} />
        </button>

        <CanvasSwitcher />

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/10"
        >
          <Search size={14} />
          YouTube suchen
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => addNote('simpleText')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            title="Simple Text Note"
          >
            <StickyNote size={14} />
            Text
          </button>
          <button
            type="button"
            onClick={() => addNote('essay')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            title="Essay Note"
          >
            <FileText size={14} />
            Essay
          </button>
          <button
            type="button"
            onClick={() => addNote('transcript')}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/70 transition hover:bg-white/10"
            title="Transcript Note"
          >
            <Type size={14} />
            Transcript
          </button>
        </div>
      </header>

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddVideo={(video, position) => addVideoNode(video, position)}
      />
    </>
  )
}
