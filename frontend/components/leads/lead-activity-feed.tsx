'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Mail, Calendar, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { LeadActivity } from '@/types'
import { useAddLeadActivity } from '@/hooks/use-leads'
import { Skeleton } from '@/components/ui/skeleton'

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  visit: Calendar,
  note: FileText,
}

interface LeadActivityFeedProps {
  leadId: number
  activities?: LeadActivity[]
  isLoading?: boolean
}

export function LeadActivityFeed({ leadId, activities, isLoading }: LeadActivityFeedProps) {
  const [activityType, setActivityType] = useState('note')
  const [description, setDescription] = useState('')
  const { mutate: addActivity, isPending } = useAddLeadActivity(leadId)

  const handleSubmit = () => {
    if (!description.trim()) return
    addActivity(
      { activity_type: activityType, description },
      {
        onSuccess: () => {
          setDescription('')
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Add activity form */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
        <p className="text-sm font-semibold text-gray-700">Log Activity</p>
        <div className="flex gap-2">
          <Select value={activityType} onValueChange={setActivityType}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="visit">Visit</SelectItem>
              <SelectItem value="note">Note</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Describe the activity..."
            className="flex-1 min-h-[72px] text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!description.trim() || isPending}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            {isPending ? 'Saving...' : 'Log Activity'}
          </Button>
        </div>
      </div>

      {/* Activity list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))
          : activities?.length === 0
          ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No activities yet
            </div>
          )
          : activities?.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] || FileText
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mt-1">
                    <Icon className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-700 capitalize">
                        {activity.activity_type}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">
                        {activity.created_by_name}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{activity.description}</p>
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}
