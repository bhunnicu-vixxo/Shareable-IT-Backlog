/**
 * Frontend types for IT request submission and triage.
 */

export type RequestBusinessImpact = 'critical' | 'high' | 'medium' | 'low'
export type RequestStatus = 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'merged'
export type RequestUrgency = 'asap' | 'this_quarter' | 'this_year' | 'no_rush'

export interface ITRequest {
  id: string
  userId: number
  title: string
  description: string
  businessImpact: RequestBusinessImpact
  category: string | null
  urgency: string | null
  status: RequestStatus
  adminNotes: string | null
  rejectionReason: string | null
  reviewedBy: number | null
  linearIssueId: string | null
  linearIssueIdentifier?: string | null
  linearIssueUrl?: string | null
  createdAt: string
  updatedAt: string
  /** Populated for admin views */
  submitterEmail?: string
  submitterName?: string | null
}

export interface CreateRequestInput {
  title: string
  description: string
  businessImpact: RequestBusinessImpact
  category?: string
  urgency?: RequestUrgency
}

export interface SimilarItem {
  identifier: string
  title: string
  status: string
}

/** Maps request status to display info */
export const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; colorPalette: string }> = {
  submitted: { label: 'Submitted', colorPalette: 'blue' },
  reviewing: { label: 'Under Review', colorPalette: 'yellow' },
  approved: { label: 'Approved', colorPalette: 'green' },
  rejected: { label: 'Rejected', colorPalette: 'red' },
  merged: { label: 'Merged', colorPalette: 'purple' },
}

export const BUSINESS_IMPACT_OPTIONS: { value: RequestBusinessImpact; label: string }[] = [
  { value: 'critical', label: 'Critical — Business-stopping issue' },
  { value: 'high', label: 'High — Significant business impact' },
  { value: 'medium', label: 'Medium — Moderate impact' },
  { value: 'low', label: 'Low — Nice to have' },
]

export const URGENCY_OPTIONS: { value: RequestUrgency; label: string }[] = [
  { value: 'asap', label: 'ASAP — Needed immediately' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'no_rush', label: 'No Rush — Whenever possible' },
]
