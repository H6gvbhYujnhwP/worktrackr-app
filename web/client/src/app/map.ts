// web/client/src/app/map.ts
import type { Ticket } from './api'

export function toApiTicket(m: any): Ticket {
  return {
    title: m.title,
    description: m.description ?? '',
    priority: m.priority ?? 'medium',
    assigneeId: m.assigneeId ?? null,
    queueId: m.queueId ?? null,
    sector: m.sector ?? null,
    scheduled_date: m.scheduledDate ?? m.scheduled_date ?? null,
    scheduled_duration_mins:
      m.scheduledDuration ?? m.scheduled_duration_mins ?? null,
    method_statement: m.methodStatement ?? m.method_statement ?? null,
    risk_assessment: m.riskAssessment ?? m.risk_assessment ?? null,
  }
}
