import type { Guest, Household, SocialCircle } from '@/types/guest';
import type { Table } from '@/types/venue';
import type { Constraint } from '@/types/constraint';

export interface Assignment {
  guestId: string;
  tableId: string;
  seatIndex: number;
}

/**
 * Auto-assign unassigned guests to seats, respecting:
 * 1. Households — keep family units at the same table
 * 2. Must-sit-together constraints (hard)
 * 3. Must-not-sit-together constraints (hard)
 * 4. Social circles — try to keep together (soft, will split if needed)
 * 5. Only assigns confirmed + tentative RSVP guests
 */
export function computeAutoAssignments(
  guests: Guest[],
  tables: Table[],
  households: Household[],
  socialCircles: SocialCircle[],
  constraints: Constraint[]
): Assignment[] {
  // 1. Filter to assignable guests
  const assignable = guests.filter(
    (g) =>
      !g.tableId &&
      (g.rsvpStatus === 'confirmed' || g.rsvpStatus === 'tentative')
  );
  if (assignable.length === 0) return [];

  const assignableIds = new Set(assignable.map((g) => g.id));

  // 2. Union-Find to build affinity groups
  const parent = new Map<string, string>();
  const rank = new Map<string, number>();

  function find(x: string): string {
    if (!parent.has(x)) {
      parent.set(x, x);
      rank.set(x, 0);
    }
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  }

  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    const rankA = rank.get(ra) ?? 0;
    const rankB = rank.get(rb) ?? 0;
    if (rankA < rankB) {
      parent.set(ra, rb);
    } else if (rankA > rankB) {
      parent.set(rb, ra);
    } else {
      parent.set(rb, ra);
      rank.set(ra, rankA + 1);
    }
  }

  // Init all assignable guests
  for (const g of assignable) find(g.id);

  // Merge households
  for (const household of households) {
    const members = household.guestIds.filter((id) => assignableIds.has(id));
    for (let i = 1; i < members.length; i++) {
      union(members[0], members[i]);
    }
  }

  // Merge must-sit-together constraints
  for (const c of constraints) {
    if (c.type === 'must-sit-together') {
      const [a, b] = c.guestIds;
      if (assignableIds.has(a) && assignableIds.has(b)) {
        union(a, b);
      }
    }
  }

  // 3. Build groups from union-find
  const groupMap = new Map<string, string[]>();
  for (const g of assignable) {
    const root = find(g.id);
    if (!groupMap.has(root)) groupMap.set(root, []);
    groupMap.get(root)!.push(g.id);
  }

  // Sort groups largest-first for better bin-packing
  const groups = Array.from(groupMap.values()).sort(
    (a, b) => b.length - a.length
  );

  // 4. Build must-not-sit-together lookup
  const mustNotSitWith = new Map<string, Set<string>>();
  for (const c of constraints) {
    if (c.type === 'must-not-sit-together') {
      const [a, b] = c.guestIds;
      if (!mustNotSitWith.has(a)) mustNotSitWith.set(a, new Set());
      if (!mustNotSitWith.has(b)) mustNotSitWith.set(b, new Set());
      mustNotSitWith.get(a)!.add(b);
      mustNotSitWith.get(b)!.add(a);
    }
  }

  // 5. Build social circle membership for tiebreaking
  const guestCircles = new Map<string, Set<string>>();
  for (const circle of socialCircles) {
    for (const gid of circle.guestIds) {
      if (!guestCircles.has(gid)) guestCircles.set(gid, new Set());
      for (const other of circle.guestIds) {
        if (other !== gid) guestCircles.get(gid)!.add(other);
      }
    }
  }

  // 6. Track capacity and occupants per table
  const tableRemaining = new Map<string, number>();
  const tableOccupants = new Map<string, Set<string>>();
  const usedSeats = new Map<string, Set<number>>();

  for (const table of tables) {
    const remaining = table.capacity - table.assignedGuestIds.length;
    tableRemaining.set(table.id, remaining);
    tableOccupants.set(table.id, new Set(table.assignedGuestIds));

    // Track which seat indices are already taken
    const taken = new Set<number>();
    for (const gid of table.assignedGuestIds) {
      const g = guests.find((x) => x.id === gid);
      if (g?.seatIndex !== null && g?.seatIndex !== undefined) {
        taken.add(g.seatIndex);
      }
    }
    usedSeats.set(table.id, taken);
  }

  const assignments: Assignment[] = [];

  function nextSeatIndex(tableId: string): number {
    const used = usedSeats.get(tableId)!;
    let idx = 0;
    while (used.has(idx)) idx++;
    return idx;
  }

  function hasConflict(guestId: string, tableId: string): boolean {
    const notWith = mustNotSitWith.get(guestId);
    if (!notWith) return false;
    const occupants = tableOccupants.get(tableId)!;
    for (const occ of occupants) {
      if (notWith.has(occ)) return true;
    }
    return false;
  }

  function assignToTable(guestId: string, tableId: string) {
    const seatIdx = nextSeatIndex(tableId);
    assignments.push({ guestId, tableId, seatIndex: seatIdx });
    tableRemaining.set(tableId, (tableRemaining.get(tableId) ?? 0) - 1);
    tableOccupants.get(tableId)!.add(guestId);
    usedSeats.get(tableId)!.add(seatIdx);
  }

  function socialOverlap(guestIds: string[], tableId: string): number {
    const occupants = tableOccupants.get(tableId)!;
    let overlap = 0;
    for (const gid of guestIds) {
      const friends = guestCircles.get(gid);
      if (friends) {
        for (const occ of occupants) {
          if (friends.has(occ)) overlap++;
        }
      }
    }
    return overlap;
  }

  // 7. Place groups
  for (const group of groups) {
    // Find best table: fits entire group, no conflicts, best social overlap
    let bestTableId: string | null = null;
    let bestScore = -1;

    for (const table of tables) {
      const remaining = tableRemaining.get(table.id) ?? 0;
      if (remaining < group.length) continue;

      // Check must-not-sit-together
      let conflict = false;
      for (const gid of group) {
        if (hasConflict(gid, table.id)) {
          conflict = true;
          break;
        }
        // Also check within group
        const notWith = mustNotSitWith.get(gid);
        if (notWith) {
          for (const other of group) {
            if (other !== gid && notWith.has(other)) {
              conflict = true;
              break;
            }
          }
        }
        if (conflict) break;
      }
      if (conflict) continue;

      // Score: social overlap (higher = better), then tighter fit (lower remaining = better)
      const overlap = socialOverlap(group, table.id);
      const tightness = 1000 - (remaining - group.length); // prefer tighter fit
      const score = overlap * 10000 + tightness;

      if (score > bestScore) {
        bestScore = score;
        bestTableId = table.id;
      }
    }

    if (bestTableId) {
      for (const gid of group) {
        assignToTable(gid, bestTableId);
      }
    } else {
      // Group doesn't fit any single table — place individually
      for (const gid of group) {
        let indBestTableId: string | null = null;
        let indBestScore = -1;

        for (const table of tables) {
          const remaining = tableRemaining.get(table.id) ?? 0;
          if (remaining < 1) continue;
          if (hasConflict(gid, table.id)) continue;

          const overlap = socialOverlap([gid], table.id);
          // Prefer tables where group members already sit
          const groupOverlap = group.filter(
            (other) => other !== gid && tableOccupants.get(table.id)!.has(other)
          ).length;
          const tightness = 1000 - remaining;
          const score = groupOverlap * 100000 + overlap * 10000 + tightness;

          if (score > indBestScore) {
            indBestScore = score;
            indBestTableId = table.id;
          }
        }

        if (indBestTableId) {
          assignToTable(gid, indBestTableId);
        }
      }
    }
  }

  return assignments;
}
