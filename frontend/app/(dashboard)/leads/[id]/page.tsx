'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { LeadActivityFeed } from '@/components/leads/lead-activity-feed'
import { Skeleton } from '@/components/ui/skeleton'
import { useLead, useLeadActivities, useCloseWonLead, useCloseLostLead } from '@/hooks/use-leads'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useState } from 'react'

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const leadId = Number(id)
  const [showCloseWon, setShowCloseWon] = useState(false)
  const [showCloseLost, setShowCloseLost] = useState(false)

  const { data: lead, isLoading } = useLead(leadId)
  const { data: activities, isLoading: activitiesLoading } = useLeadActivities(leadId)
  const { mutate: closeWon, isPending: closingWon } = useCloseWonLead(leadId)
  const { mutate: closeLost, isPending: closingLost } = useCloseLostLead(leadId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    )
  }

  if (!lead) {
    return <div className="text-center py-16 text-gray-400">Lead not found</div>
  }

  const canClose = !['closed_won', 'closed_lost'].includes(lead.stage)

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={`Lead #${lead.id}`}
        description={lead.customer_name || `Customer #${lead.customer}`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.back()} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {canClose && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => setShowCloseWon(true)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Won
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => setShowCloseLost(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Lost
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" className="gap-1">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stage & Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-700">Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Stage</span>
                  <StatusBadge status={lead.stage} type="lead_stage" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Assigned To</span>
                  <span className="font-medium">{lead.assigned_to_name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="font-medium">{lead.source || '—'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-700">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-medium">{lead.interested_category || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Budget</span>
                  <span className="font-medium">
                    {lead.budget_min || lead.budget_max
                      ? `${formatCurrency(lead.budget_min)} – ${formatCurrency(lead.budget_max)}`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Occasion</span>
                  <span className="font-medium">{lead.occasion || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Required By</span>
                  <span className="font-medium">{formatDate(lead.required_date)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-700">Dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created</span>
                  <span>{formatDate(lead.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Follow-up</span>
                  <span
                    className={
                      lead.follow_up_date && new Date(lead.follow_up_date) < new Date()
                        ? 'text-red-500 font-medium'
                        : ''
                    }
                  >
                    {formatDate(lead.follow_up_date)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {lead.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-gray-700">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{lead.notes}</p>
                </CardContent>
              </Card>
            )}

            {lead.lost_reason && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-red-700">Lost Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-600">{lead.lost_reason}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="mt-4">
          <LeadActivityFeed
            leadId={leadId}
            activities={activities}
            isLoading={activitiesLoading}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={showCloseWon}
        onOpenChange={setShowCloseWon}
        title="Mark as Won"
        description="Are you sure you want to mark this lead as Closed Won?"
        confirmLabel="Mark as Won"
        variant="default"
        onConfirm={() => {
          closeWon(undefined, { onSuccess: () => setShowCloseWon(false) })
        }}
        isLoading={closingWon}
      />

      <ConfirmDialog
        open={showCloseLost}
        onOpenChange={setShowCloseLost}
        title="Mark as Lost"
        description="Are you sure you want to mark this lead as Closed Lost?"
        confirmLabel="Mark as Lost"
        variant="destructive"
        onConfirm={() => {
          closeLost({ lost_reason: 'Not specified' }, { onSuccess: () => setShowCloseLost(false) })
        }}
        isLoading={closingLost}
      />
    </div>
  )
}
