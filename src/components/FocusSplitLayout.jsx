import { GripHorizontal, GripVertical } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import {
  FOCUS_LAYOUT_PRESETS,
  FOCUS_PANEL_LABELS,
  clampRatio,
  setSplitRatioAtPath,
  swapPanelsInTree,
} from '../lib/focusLayout'
import { cn } from '../lib/utils'

function FocusSplitHandle({ direction, onPointerDown }) {
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      role="separator"
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      className={cn(
        'focus-split-handle',
        isHorizontal ? 'focus-split-handle--vertical' : 'focus-split-handle--horizontal',
      )}
      onPointerDown={onPointerDown}
    >
      <span className="focus-split-handle-grip">
        {isHorizontal ? <GripVertical size={14} /> : <GripHorizontal size={14} />}
      </span>
    </div>
  )
}

function FocusPanelShell({ panelId, isDropTarget, onDragStart, onDragOver, onDrop, children }) {
  return (
    <div
      className={cn('focus-split-panel', isDropTarget && 'is-drop-target')}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        onDragOver(panelId)
      }}
      onDragLeave={() => onDragOver(null)}
      onDrop={(event) => {
        event.preventDefault()
        onDrop(panelId)
      }}
    >
      <div className="focus-split-panel-header">
        <button
          type="button"
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData('application/voidtube-focus-panel', panelId)
            event.dataTransfer.effectAllowed = 'move'
            onDragStart(panelId)
          }}
          onDragEnd={() => onDragStart(null)}
          className="focus-split-panel-grip"
          aria-label={`Move ${FOCUS_PANEL_LABELS[panelId]}`}
          title="Drag to swap panels"
        >
          <GripVertical size={14} strokeWidth={2} />
        </button>
        <span className="focus-split-panel-label">{FOCUS_PANEL_LABELS[panelId]}</span>
      </div>
      <div className="focus-split-panel-body">{children}</div>
    </div>
  )
}

function SplitNode({
  node,
  path,
  panels,
  draggingPanel,
  dropTargetPanel,
  onDragStart,
  onDragOver,
  onDrop,
  onRatioChange,
}) {
  const containerRef = useRef(null)

  const handleResizeStart = useCallback(
    (event) => {
      event.preventDefault()
      const container = containerRef.current
      if (!container || node.type !== 'split') return

      const isHorizontal = node.direction === 'horizontal'
      const startPos = isHorizontal ? event.clientX : event.clientY
      const rect = container.getBoundingClientRect()
      const size = isHorizontal ? rect.width : rect.height
      const startRatio = node.ratio

      const onMove = (moveEvent) => {
        const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY
        const delta = currentPos - startPos
        const nextRatio = clampRatio(startRatio + delta / size)
        onRatioChange(path, nextRatio)
      }

      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [node, path, onRatioChange],
  )

  if (node.type === 'panel') {
    return (
      <FocusPanelShell
        panelId={node.panelId}
        isDropTarget={dropTargetPanel === node.panelId && draggingPanel && draggingPanel !== node.panelId}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {panels[node.panelId]}
      </FocusPanelShell>
    )
  }

  const firstFlex = node.ratio
  const secondFlex = 1 - node.ratio

  return (
    <div
      ref={containerRef}
      className={cn(
        'focus-split-node',
        node.direction === 'horizontal'
          ? 'focus-split-node--horizontal'
          : 'focus-split-node--vertical',
      )}
    >
      <div className="focus-split-pane" style={{ flex: `${firstFlex} 1 0` }}>
        <SplitNode
          node={node.first}
          path={[...path, 'first']}
          panels={panels}
          draggingPanel={draggingPanel}
          dropTargetPanel={dropTargetPanel}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onRatioChange={onRatioChange}
        />
      </div>

      <FocusSplitHandle direction={node.direction} onPointerDown={handleResizeStart} />

      <div className="focus-split-pane" style={{ flex: `${secondFlex} 1 0` }}>
        <SplitNode
          node={node.second}
          path={[...path, 'second']}
          panels={panels}
          draggingPanel={draggingPanel}
          dropTargetPanel={dropTargetPanel}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onRatioChange={onRatioChange}
        />
      </div>
    </div>
  )
}

function LayoutPresetButton({ preset, isActive, onClick }) {
  return (
    <button
      type="button"
      className={cn('focus-layout-preset-btn', isActive && 'is-active')}
      onClick={onClick}
      title={preset.description}
      aria-label={preset.label}
    >
      <span className={`focus-layout-preset-icon focus-layout-preset-icon--${preset.id}`} />
    </button>
  )
}

export default function FocusSplitLayout({
  layout,
  panels,
  onLayoutChange,
  onApplyPreset,
}) {
  const [draggingPanel, setDraggingPanel] = useState(null)
  const [dropTargetPanel, setDropTargetPanel] = useState(null)

  const handleRatioChange = useCallback(
    (path, ratio) => {
      onLayoutChange({
        presetId: 'custom',
        tree: setSplitRatioAtPath(layout.tree, path, ratio),
      })
    },
    [layout.tree, onLayoutChange],
  )

  const handleDrop = useCallback(
    (targetPanelId) => {
      if (!draggingPanel || draggingPanel === targetPanelId) {
        setDraggingPanel(null)
        setDropTargetPanel(null)
        return
      }

      onLayoutChange({
        presetId: 'custom',
        tree: swapPanelsInTree(layout.tree, draggingPanel, targetPanelId),
      })
      setDraggingPanel(null)
      setDropTargetPanel(null)
    },
    [draggingPanel, layout.tree, onLayoutChange],
  )

  return (
    <div className="focus-split-layout">
      <div className="focus-layout-presets" role="toolbar" aria-label="Focus Layout Presets">
        {Object.values(FOCUS_LAYOUT_PRESETS).map((preset) => (
          <LayoutPresetButton
            key={preset.id}
            preset={preset}
            isActive={layout.presetId === preset.id}
            onClick={() => onApplyPreset(preset.id)}
          />
        ))}
      </div>

      <div className="focus-split-root">
        <SplitNode
          node={layout.tree}
          path={[]}
          panels={panels}
          draggingPanel={draggingPanel}
          dropTargetPanel={dropTargetPanel}
          onDragStart={setDraggingPanel}
          onDragOver={setDropTargetPanel}
          onDrop={handleDrop}
          onRatioChange={handleRatioChange}
        />
      </div>
    </div>
  )
}
