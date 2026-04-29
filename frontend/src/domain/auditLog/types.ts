/** Types for the cross-entity admin activity feed.
 *  Backend contract lives at openspec/specs/backend/audit-log/spec.md.
 */

export type EntityType = 'pet' | 'owner' | 'medical_note' | 'vaccination';
export type ActionType = '+' | '~' | '-';

export interface ActivityRow {
  entity_type: EntityType;
  entity_id: number;
  entity_label: string;
  history_id: number;
  history_type: ActionType;
  history_date: string;
  history_user: { id: number; email: string } | null;
}

export interface ActivityResponse {
  count: number;
  results: ActivityRow[];
}

export interface ActivityFilters {
  entity_type?: EntityType;
  action?: ActionType;
  user?: number;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}
