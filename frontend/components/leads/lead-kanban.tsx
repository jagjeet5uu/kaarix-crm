'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LeadCard } from './lead-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Lead } from '@/types'
import { LEAD_STAGES } from '@/lib/constants'
import { leadsAPI } from '@/lib/api'
import { toast } from 'sonner'

interface LeadKanbanProps {
  leads: Lead[]
  isLoading?: boolean
}

const KANBAN_STAGES = LEAD_STAGES.filter(
  (s) => !['closed_won', 'closed_lost'].includes(s.value)
)

// Stages that cannot receive drops (terminal stages handled separately)
const DROPPABLE_STAGES = [
  ...KANBAN_STAGES.map((s) => s.value),
  'closed_won',
  'closed_lost',
]

export function LeadKanban({ leads, isLoading }: LeadKanbanProps) {
  const queryClient = useQueryClient()

  // Local optimistic state — maps leadId → stage
  const [optimisticStages, setOptimisticStages] = useState<Record<number, string>>({})
  // Which column is currently being dragged over
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  // Which lead is being dragged
  const [draggingId, setDraggingId] = useState<number | null>(null)

  const getLeadStage = (lead: Lead) => optimisticStages[lead.id] ?? lead.stage

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    e.dataTransfer.setData('leadId', String(leadId))
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(leadId)
    // Mark the element so LeadCard link can suppress click-after-drag
    ;(e.currentTarget as HTMLElement).dataset.dragging = 'true'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggingId(null)
    setDragOverStage(null)
    ;(e.currentTarget as HTMLElement).dataset.dragging = 'false'
  }

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column entirely (not a child element)
    const relatedTarget = e.relatedTarget as Node
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverStage(null)
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStage: string) => {
      e.preventDefault()
      setDragOverStage(null)
      setDraggingId(null)

      const leadId = Number(e.dataTransfer.getData('leadId'))
      if (!leadId) return

      const lead = leads.find((l) => l.id === leadId)
      if (!lead) return

      const currentStage = getLeadStage(lead)
      if (currentStage === newStage) return

      // Optimistic update immediately
      setOptimisticStages((prev) => ({ ...prev, [leadId]: newStage }))

      try {
        if (newStage === 'closed_won') {
          await leadsAPI.closeWon(leadId)
        } else if (newStage === 'closed_lost') {
          await leadsAPI.closeLost(leadId, { reason: 'Stage changed via Kanban' })
        } else {
          await leadsAPI.changeStage(leadId, newStage)
        }
        // Refresh data from server
        queryClient.invalidateQueries({ queryKey: ['leads'] })
        toast.success(`Lead moved to ${LEAD_STAGES.find((s) => s.value === newStage)?.label ?? newStage}`)
      } catch {
        // Rollback on failure
        setOptimisticStages((prev) => {
          const next = { ...prev }
          delete next[leadId]
          return next
        })
        toast.error('Failed to update lead stage')
      }
    },
    [leads, optimisticStages, queryClient]
  )

  const closedWon = leads.filter((l) => getLeadStage(l) === 'closed_won')
  const closedLost = leads.filter((l) => getLeadStage(l) === 'closed_lost')

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {KANBAN_STAGES.slice(0, 6).map((stage) => (
          <div key={stage.value} className="flex-shrink-0 w-64 space-y-2">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const renderColumn = (
    stageValue: string,
    stageLabel: string,
    stageLeads: Lead[],
    colorClass: { bg: string; header: string; badge: string; border: string }
  ) => {
    const isDragOver = dragOverStage === stageValue

    return (
      <div
        key={stageValue}
        className={`flex-shrink-0 w-64 rounded-xl p-3 flex flex-col transition-colors duration-150 ${colorClass.bg} ${
          isDragOver ? `ring-2 ${colorClass.border} ring-offset-1` : ''
        }`}
        onDragOver={(e) => handleDragOver(e, stageValue)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, stageValue)}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${colorClass.header}`}>
            {stageLabel}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass.badge}`}>
            {stageLeads.length}
          </span>
        </div>

        <div className="space-y-2 flex-1 min-h-[60px]">
          {stageLeads.length === 0 ? (
            <div
              className={`flex items-center justify-center h-16 text-xs border-2 border-dashed rounded-lg transition-colors ${
                isDragOver
                  ? `${colorClass.border} border-opacity-60 ${colorClass.header} opacity-70`
                  : 'border-gray-200 text-gray-300'
              }`}
            >
              {isDragOver ? 'Drop here' : 'Empty'}
            </div>
          ) : (
            stageLeads.map((lead) => (
              <div
                key={lead.id}
                draggable
                onDragStart={(e) => handleDragStart(e, lead.id)}
                onDragEnd={(e) => handleDragEnd(e)}
                className={`transition-opacity duration-150 cursor-grab active:cursor-grabbing ${
                  draggingId === lead.id ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <LeadCard lead={lead} />
              </div>
            ))
          )}
          {/* Drop target when column has cards */}
          {stageLeads.length > 0 && isDragOver && (
            <div className={`h-1 rounded-full ${colorClass.bg} opacity-50`} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {KANBAN_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => getLeadStage(l) === stage.value)
        return renderColumn(stage.value, stage.label, stageLeads, {
          bg: 'bg-gray-50',
          header: 'text-gray-600',
          badge: 'bg-white border border-gray-200 text-gray-600',
          border: 'ring-amber-400',
        })
      })}

      {/* Won column */}
      {renderColumn('closed_won', 'Won', closedWon, {
        bg: 'bg-green-50',
        header: 'text-green-700',
        badge: 'bg-green-100 text-green-700',
        border: 'ring-green-400',
      })}

      {/* Lost column */}
      {renderColumn('closed_lost', 'Lost', closedLost, {
        bg: 'bg-red-50',
        header: 'text-red-700',
        badge: 'bg-red-100 text-red-700',
        border: 'ring-red-400',
      })}
    </div>
  )
}
