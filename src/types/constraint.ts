export type ConstraintType = 'must-sit-together' | 'must-not-sit-together' | 'prefer-near';

export interface Constraint {
  id: string;
  type: ConstraintType;
  guestIds: [string, string];
  reason: string;
}

export interface ConstraintViolation {
  constraintId: string;
  tableId: string;
  message: string;
  severity?: 'warning' | 'error';
}
