import type { Constraint, ConstraintViolation } from '@/types/constraint';
import type { Guest } from '@/types/guest';
import type { Table } from '@/types/venue';

export function validateConstraints(
  constraints: Constraint[],
  guests: Guest[],
  tables: Table[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const guestMap = new Map(guests.map((g) => [g.id, g]));
  const tableMap = new Map(tables.map((t) => [t.id, t]));

  for (const constraint of constraints) {
    const [guestAId, guestBId] = constraint.guestIds;
    const guestA = guestMap.get(guestAId);
    const guestB = guestMap.get(guestBId);

    if (!guestA || !guestB) continue;
    if (!guestA.tableId || !guestB.tableId) continue;

    const sameTable = guestA.tableId === guestB.tableId;

    if (constraint.type === 'must-sit-together' && !sameTable) {
      const tableA = tableMap.get(guestA.tableId);
      const tableB = tableMap.get(guestB.tableId);
      violations.push({
        constraintId: constraint.id,
        tableId: guestA.tableId,
        message: `${guestA.name} and ${guestB.name} must sit together but are at ${tableA?.label ?? 'unknown'} and ${tableB?.label ?? 'unknown'}`,
      });
    }

    if (constraint.type === 'must-not-sit-together' && sameTable) {
      const table = tableMap.get(guestA.tableId);
      violations.push({
        constraintId: constraint.id,
        tableId: guestA.tableId,
        message: `${guestA.name} and ${guestB.name} must not sit together but are both at ${table?.label ?? 'unknown'}`,
      });
    }
  }

  return violations;
}
