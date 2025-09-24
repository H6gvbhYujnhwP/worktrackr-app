// web/client/src/app/map.ts
import type { Ticket } from './api'

export function toApiTicket(m: any): Ticket {
  return {
    title: m.title,
    description: m.description ?? '',
    priority: m.priority ?? 'medium',

    // Map Manus fields to API:
    // Manus uses "assignedTo"; API expects "assigneeId"
    assigneeId:
      m.assigneeId ??             // already correct if present
      m.assignedTo ??             // Manus forms/components use this
      null,

    // Queues are optional in Manus; keep passthrough if ever present
    queueId: m.queueId ?? null,

    // RAMS / Scheduling
    sector: m.sector ?? null,
    scheduled_date: m.scheduledDate ?? m.scheduled_date ?? null,
    scheduled_duration_mins:
      m.scheduledDuration ?? m.scheduled_duration_mins ?? null,

    // JSON templates
    method_statement: m.methodStatement ?? m.method_statement ?? null,
    risk_assessment: m.riskAssessment ?? m.risk_assessment ?? null,
  }
}
