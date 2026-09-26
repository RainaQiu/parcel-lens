import { useState, type DragEvent, type KeyboardEvent } from 'react'
import { GripIcon } from '../ui/icons'
import {
  DEFAULT_BLOCK_ORDER,
  moveItem,
  PANEL_BLOCKS,
  type PanelBlockId,
} from './blockOrder'

type Props = {
  open: boolean
  order: PanelBlockId[]
  onClose: () => void
  onChange: (next: PanelBlockId[]) => void
}

export function LayoutSettings({ open, order, onClose, onChange }: Props) {
  const [dragId, setDragId] = useState<PanelBlockId | null>(null)

  if (!open) return null

  function handleDragStart(event: DragEvent<HTMLLIElement>, id: PanelBlockId) {
    setDragId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  function handleDragOver(event: DragEvent<HTMLLIElement>, overId: PanelBlockId) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (!dragId || dragId === overId) return
    const from = order.indexOf(dragId)
    const to = order.indexOf(overId)
    if (from < 0 || to < 0) return
    const rect = event.currentTarget.getBoundingClientRect()
    const mid = rect.top + rect.height / 2
    const movingDown = from < to
    if (movingDown && event.clientY < mid) return
    if (!movingDown && event.clientY > mid) return
    onChange(moveItem(order, from, to))
  }

  function handleDrop(event: DragEvent<HTMLLIElement>) {
    event.preventDefault()
    setDragId(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>, id: PanelBlockId) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    const from = order.indexOf(id)
    const to = event.key === 'ArrowUp' ? from - 1 : from + 1
    onChange(moveItem(order, from, to))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="layout-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="layout-settings-title">Parcel details layout</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </header>
        <p className="modal-copy">
          Drag to reorder information blocks. Changes apply immediately and are saved
          on this device.
        </p>
        <ol className="order-list">
          {order.map((id) => {
            const label = PANEL_BLOCKS.find((block) => block.id === id)?.label ?? id
            return (
              <li
                key={id}
                className={dragId === id ? 'order-item is-dragging' : 'order-item'}
                draggable
                tabIndex={0}
                aria-label={`${label}. Drag to reorder, or use arrow keys`}
                onDragStart={(event) => handleDragStart(event, id)}
                onDragOver={(event) => handleDragOver(event, id)}
                onDrop={handleDrop}
                onDragEnd={() => setDragId(null)}
                onKeyDown={(event) => handleKeyDown(event, id)}
              >
                <span className="drag-handle" aria-hidden="true">
                  <GripIcon />
                </span>
                <span>{label}</span>
              </li>
            )
          })}
        </ol>
        <div className="modal-footer">
          <button
            type="button"
            className="ghost"
            onClick={() => onChange([...DEFAULT_BLOCK_ORDER])}
          >
            Reset default order
          </button>
        </div>
      </div>
    </div>
  )
}
