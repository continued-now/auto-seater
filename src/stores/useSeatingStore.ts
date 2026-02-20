import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import type { Guest, Household, SocialCircle, RSVPStatus, DietaryTag, AccessibilityTag } from '@/types/guest';
import type { Table, Fixture, Wall, VenueConfig, VenueTemplate } from '@/types/venue';
import type { Constraint, ConstraintViolation } from '@/types/constraint';
import type { AppStep } from '@/types/seating';
import { createId } from '@/lib/id';
import { defaultVenueConfig, PREBUILT_TEMPLATES } from '@/lib/venue-templates';
import { validateConstraints } from '@/lib/constraint-validator';
import { getTableDefaults } from '@/lib/table-geometry';
import { saveToIndexedDB } from '@/lib/storage';
import type { TableShape } from '@/types/venue';

// Debounced IndexedDB backup
let idbTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedIDBSave(state: SeatingState) {
  if (idbTimer) clearTimeout(idbTimer);
  idbTimer = setTimeout(() => {
    saveToIndexedDB('seating-state', {
      guests: state.guests,
      households: state.households,
      socialCircles: state.socialCircles,
      venue: state.venue,
      constraints: state.constraints,
      templates: state.templates,
    });
  }, 2000);
}

export interface SeatingState {
  // Data
  guests: Guest[];
  households: Household[];
  socialCircles: SocialCircle[];
  venue: VenueConfig;
  constraints: Constraint[];
  templates: VenueTemplate[];

  // UI (excluded from undo/redo)
  currentStep: AppStep;
  selectedGuestIds: string[];
  selectedTableId: string | null;
  selectedElementId: string | null;
  selectedElementType: 'table' | 'fixture' | 'wall' | null;
  canvasToolMode: 'select' | 'draw-wall';
  searchQuery: string;
  zoom: number;
  panOffset: { x: number; y: number };
  lastSavedAt: number | null;

  // Guest actions
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'tableId' | 'seatIndex' | 'householdId' | 'socialCircleIds'>) => string;
  updateGuest: (id: string, updates: Partial<Guest>) => void;
  deleteGuests: (ids: string[]) => void;
  importGuests: (guests: Guest[]) => void;
  setGuestRSVP: (ids: string[], status: RSVPStatus) => void;
  addGuestDietaryTag: (id: string, tag: DietaryTag) => void;
  removeGuestDietaryTag: (id: string, tag: DietaryTag) => void;
  addGuestAccessibilityTag: (id: string, tag: AccessibilityTag) => void;
  removeGuestAccessibilityTag: (id: string, tag: AccessibilityTag) => void;

  // Household actions
  createHousehold: (name: string, guestIds: string[]) => string;
  updateHousehold: (id: string, updates: Partial<Household>) => void;
  deleteHousehold: (id: string) => void;
  addGuestToHousehold: (guestId: string, householdId: string) => void;
  removeGuestFromHousehold: (guestId: string) => void;

  // Social circle actions
  createSocialCircle: (name: string, color: string) => string;
  updateSocialCircle: (id: string, updates: Partial<SocialCircle>) => void;
  deleteSocialCircle: (id: string) => void;
  addGuestToSocialCircle: (guestId: string, circleId: string) => void;
  removeGuestFromSocialCircle: (guestId: string, circleId: string) => void;

  // Venue actions
  updateVenueConfig: (updates: Partial<VenueConfig>) => void;
  addTable: (shape: TableShape) => string;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  addFixture: (fixture: Omit<Fixture, 'id'>) => string;
  updateFixture: (id: string, updates: Partial<Fixture>) => void;
  deleteFixture: (id: string) => void;

  // Wall actions
  addWall: (wall: Omit<Wall, 'id'>) => string;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  deleteWall: (id: string) => void;

  // Seating actions
  assignGuestToTable: (guestId: string, tableId: string, seatIndex: number) => void;
  unassignGuest: (guestId: string) => void;
  swapGuests: (guestAId: string, guestBId: string) => void;
  bulkAssignToTable: (guestIds: string[], tableId: string) => void;

  // Constraint actions
  addConstraint: (type: Constraint['type'], guestIds: [string, string], reason: string) => string;
  deleteConstraint: (id: string) => void;
  getViolations: () => ConstraintViolation[];

  // Template actions
  saveTemplate: (name: string, description: string) => string;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  loadPrebuiltTemplate: (index: number) => void;

  // UI actions
  setCurrentStep: (step: AppStep) => void;
  setSelectedGuestIds: (ids: string[]) => void;
  toggleGuestSelection: (id: string) => void;
  setSelectedTableId: (id: string | null) => void;
  setSelectedElement: (id: string | null, type: 'table' | 'fixture' | 'wall' | null) => void;
  clearSelection: () => void;
  setCanvasToolMode: (mode: 'select' | 'draw-wall') => void;
  setSearchQuery: (query: string) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
}

export const useSeatingStore = create<SeatingState>()(
  persist(
    temporal(
      immer<SeatingState>((set, get) => ({
        // Initial data
        guests: [],
        households: [],
        socialCircles: [],
        venue: { ...defaultVenueConfig },
        constraints: [],
        templates: [],

        // Initial UI
        currentStep: 'guests',
        selectedGuestIds: [],
        selectedTableId: null,
        selectedElementId: null,
        selectedElementType: null,
        canvasToolMode: 'select',
        searchQuery: '',
        zoom: 1,
        panOffset: { x: 0, y: 0 },
        lastSavedAt: null,

        // Guest actions
        addGuest: (guestData) => {
          const id = createId();
          const now = Date.now();
          set((state) => {
            state.guests.push({
              ...guestData,
              id,
              householdId: null,
              socialCircleIds: [],
              tableId: null,
              seatIndex: null,
              createdAt: now,
              updatedAt: now,
            });
            state.lastSavedAt = now;
          });
          debouncedIDBSave(get());
          return id;
        },

        updateGuest: (id, updates) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === id);
            if (guest) {
              Object.assign(guest, updates, { updatedAt: Date.now() });
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteGuests: (ids) => {
          set((state) => {
            const idSet = new Set(ids);
            state.guests = state.guests.filter((g) => !idSet.has(g.id));
            state.selectedGuestIds = state.selectedGuestIds.filter((id) => !idSet.has(id));
            // Remove from tables
            for (const table of state.venue.tables) {
              table.assignedGuestIds = table.assignedGuestIds.filter((gid) => !idSet.has(gid));
            }
            // Remove from households
            for (const household of state.households) {
              household.guestIds = household.guestIds.filter((gid) => !idSet.has(gid));
            }
            // Remove from social circles
            for (const circle of state.socialCircles) {
              circle.guestIds = circle.guestIds.filter((gid) => !idSet.has(gid));
            }
            // Remove constraints involving deleted guests
            state.constraints = state.constraints.filter(
              (c) => !c.guestIds.some((gid) => idSet.has(gid))
            );
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        importGuests: (guests) => {
          set((state) => {
            state.guests.push(...guests);
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        setGuestRSVP: (ids, status) => {
          set((state) => {
            const now = Date.now();
            for (const guest of state.guests) {
              if (ids.includes(guest.id)) {
                guest.rsvpStatus = status;
                guest.updatedAt = now;
              }
            }
            state.lastSavedAt = now;
          });
          debouncedIDBSave(get());
        },

        addGuestDietaryTag: (id, tag) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === id);
            if (guest && !guest.dietaryTags.includes(tag)) {
              guest.dietaryTags.push(tag);
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        removeGuestDietaryTag: (id, tag) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === id);
            if (guest) {
              guest.dietaryTags = guest.dietaryTags.filter((t) => t !== tag);
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        addGuestAccessibilityTag: (id, tag) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === id);
            if (guest && !guest.accessibilityTags.includes(tag)) {
              guest.accessibilityTags.push(tag);
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        removeGuestAccessibilityTag: (id, tag) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === id);
            if (guest) {
              guest.accessibilityTags = guest.accessibilityTags.filter((t) => t !== tag);
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        // Household actions
        createHousehold: (name, guestIds) => {
          const id = createId();
          set((state) => {
            state.households.push({ id, name, guestIds: [...guestIds] });
            for (const guest of state.guests) {
              if (guestIds.includes(guest.id)) {
                guest.householdId = id;
                guest.updatedAt = Date.now();
              }
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        updateHousehold: (id, updates) => {
          set((state) => {
            const household = state.households.find((h) => h.id === id);
            if (household) {
              Object.assign(household, updates);
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteHousehold: (id) => {
          set((state) => {
            state.households = state.households.filter((h) => h.id !== id);
            for (const guest of state.guests) {
              if (guest.householdId === id) {
                guest.householdId = null;
                guest.updatedAt = Date.now();
              }
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        addGuestToHousehold: (guestId, householdId) => {
          set((state) => {
            const household = state.households.find((h) => h.id === householdId);
            const guest = state.guests.find((g) => g.id === guestId);
            if (household && guest) {
              // Remove from old household
              if (guest.householdId) {
                const oldHousehold = state.households.find((h) => h.id === guest.householdId);
                if (oldHousehold) {
                  oldHousehold.guestIds = oldHousehold.guestIds.filter((id) => id !== guestId);
                }
              }
              household.guestIds.push(guestId);
              guest.householdId = householdId;
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        removeGuestFromHousehold: (guestId) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === guestId);
            if (guest?.householdId) {
              const household = state.households.find((h) => h.id === guest.householdId);
              if (household) {
                household.guestIds = household.guestIds.filter((id) => id !== guestId);
              }
              guest.householdId = null;
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        // Social circle actions
        createSocialCircle: (name, color) => {
          const id = createId();
          set((state) => {
            state.socialCircles.push({ id, name, color, guestIds: [] });
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        updateSocialCircle: (id, updates) => {
          set((state) => {
            const circle = state.socialCircles.find((c) => c.id === id);
            if (circle) {
              Object.assign(circle, updates);
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteSocialCircle: (id) => {
          set((state) => {
            state.socialCircles = state.socialCircles.filter((c) => c.id !== id);
            for (const guest of state.guests) {
              guest.socialCircleIds = guest.socialCircleIds.filter((cid) => cid !== id);
              guest.updatedAt = Date.now();
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        addGuestToSocialCircle: (guestId, circleId) => {
          set((state) => {
            const circle = state.socialCircles.find((c) => c.id === circleId);
            const guest = state.guests.find((g) => g.id === guestId);
            if (circle && guest && !circle.guestIds.includes(guestId)) {
              circle.guestIds.push(guestId);
              guest.socialCircleIds.push(circleId);
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        removeGuestFromSocialCircle: (guestId, circleId) => {
          set((state) => {
            const circle = state.socialCircles.find((c) => c.id === circleId);
            const guest = state.guests.find((g) => g.id === guestId);
            if (circle && guest) {
              circle.guestIds = circle.guestIds.filter((id) => id !== guestId);
              guest.socialCircleIds = guest.socialCircleIds.filter((id) => id !== circleId);
              guest.updatedAt = Date.now();
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        // Venue actions
        updateVenueConfig: (updates) => {
          set((state) => {
            Object.assign(state.venue, updates);
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        addTable: (shape) => {
          const id = createId();
          const defaults = getTableDefaults(shape);
          set((state) => {
            const tableCount = state.venue.tables.length;
            state.venue.tables.push({
              id,
              label: `Table ${tableCount + 1}`,
              shape,
              position: { x: 200 + (tableCount % 5) * 150, y: 200 + Math.floor(tableCount / 5) * 150 },
              rotation: 0,
              capacity: defaults.capacity,
              width: defaults.width,
              height: defaults.height,
              assignedGuestIds: [],
            });
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        updateTable: (id, updates) => {
          set((state) => {
            const table = state.venue.tables.find((t) => t.id === id);
            if (table) {
              Object.assign(table, updates);
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteTable: (id) => {
          set((state) => {
            const table = state.venue.tables.find((t) => t.id === id);
            if (table) {
              // Unassign guests
              for (const guestId of table.assignedGuestIds) {
                const guest = state.guests.find((g) => g.id === guestId);
                if (guest) {
                  guest.tableId = null;
                  guest.seatIndex = null;
                  guest.updatedAt = Date.now();
                }
              }
            }
            state.venue.tables = state.venue.tables.filter((t) => t.id !== id);
            if (state.selectedTableId === id) state.selectedTableId = null;
            if (state.selectedElementId === id) {
              state.selectedElementId = null;
              state.selectedElementType = null;
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        addFixture: (fixtureData) => {
          const id = createId();
          set((state) => {
            state.venue.fixtures.push({ ...fixtureData, id });
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        updateFixture: (id, updates) => {
          set((state) => {
            const fixture = state.venue.fixtures.find((f) => f.id === id);
            if (fixture) {
              Object.assign(fixture, updates);
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteFixture: (id) => {
          set((state) => {
            state.venue.fixtures = state.venue.fixtures.filter((f) => f.id !== id);
            if (state.selectedElementId === id) {
              state.selectedElementId = null;
              state.selectedElementType = null;
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        // Wall actions
        addWall: (wallData) => {
          const id = createId();
          set((state) => {
            state.venue.walls.push({ ...wallData, id });
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        updateWall: (id, updates) => {
          set((state) => {
            const wall = state.venue.walls.find((w) => w.id === id);
            if (wall) {
              Object.assign(wall, updates);
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteWall: (id) => {
          set((state) => {
            state.venue.walls = state.venue.walls.filter((w) => w.id !== id);
            if (state.selectedElementId === id) {
              state.selectedElementId = null;
              state.selectedElementType = null;
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        // Seating actions
        assignGuestToTable: (guestId, tableId, seatIndex) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === guestId);
            const table = state.venue.tables.find((t) => t.id === tableId);
            if (!guest || !table) return;

            // Remove from old table
            if (guest.tableId) {
              const oldTable = state.venue.tables.find((t) => t.id === guest.tableId);
              if (oldTable) {
                oldTable.assignedGuestIds = oldTable.assignedGuestIds.filter((id) => id !== guestId);
              }
            }

            guest.tableId = tableId;
            guest.seatIndex = seatIndex;
            guest.updatedAt = Date.now();
            if (!table.assignedGuestIds.includes(guestId)) {
              table.assignedGuestIds.push(guestId);
            }
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        unassignGuest: (guestId) => {
          set((state) => {
            const guest = state.guests.find((g) => g.id === guestId);
            if (!guest?.tableId) return;

            const table = state.venue.tables.find((t) => t.id === guest.tableId);
            if (table) {
              table.assignedGuestIds = table.assignedGuestIds.filter((id) => id !== guestId);
            }
            guest.tableId = null;
            guest.seatIndex = null;
            guest.updatedAt = Date.now();
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        swapGuests: (guestAId, guestBId) => {
          set((state) => {
            const guestA = state.guests.find((g) => g.id === guestAId);
            const guestB = state.guests.find((g) => g.id === guestBId);
            if (!guestA || !guestB) return;

            const tempTableId = guestA.tableId;
            const tempSeatIndex = guestA.seatIndex;
            const now = Date.now();

            // Swap table assignments
            if (guestA.tableId) {
              const tableA = state.venue.tables.find((t) => t.id === guestA.tableId);
              if (tableA) {
                const idx = tableA.assignedGuestIds.indexOf(guestAId);
                if (idx >= 0) tableA.assignedGuestIds[idx] = guestBId;
              }
            }
            if (guestB.tableId) {
              const tableB = state.venue.tables.find((t) => t.id === guestB.tableId);
              if (tableB) {
                const idx = tableB.assignedGuestIds.indexOf(guestBId);
                if (idx >= 0) tableB.assignedGuestIds[idx] = guestAId;
              }
            }

            guestA.tableId = guestB.tableId;
            guestA.seatIndex = guestB.seatIndex;
            guestB.tableId = tempTableId;
            guestB.seatIndex = tempSeatIndex;
            guestA.updatedAt = now;
            guestB.updatedAt = now;
            state.lastSavedAt = now;
          });
          debouncedIDBSave(get());
        },

        bulkAssignToTable: (guestIds, tableId) => {
          set((state) => {
            const table = state.venue.tables.find((t) => t.id === tableId);
            if (!table) return;

            const now = Date.now();
            let seatIndex = table.assignedGuestIds.length;

            for (const guestId of guestIds) {
              if (seatIndex >= table.capacity) break;
              const guest = state.guests.find((g) => g.id === guestId);
              if (!guest) continue;

              // Remove from old table
              if (guest.tableId) {
                const oldTable = state.venue.tables.find((t) => t.id === guest.tableId);
                if (oldTable) {
                  oldTable.assignedGuestIds = oldTable.assignedGuestIds.filter((id) => id !== guestId);
                }
              }

              guest.tableId = tableId;
              guest.seatIndex = seatIndex;
              guest.updatedAt = now;
              table.assignedGuestIds.push(guestId);
              seatIndex++;
            }
            state.lastSavedAt = now;
          });
          debouncedIDBSave(get());
        },

        // Constraint actions
        addConstraint: (type, guestIds, reason) => {
          const id = createId();
          set((state) => {
            state.constraints.push({ id, type, guestIds, reason });
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        deleteConstraint: (id) => {
          set((state) => {
            state.constraints = state.constraints.filter((c) => c.id !== id);
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        getViolations: () => {
          const state = get();
          return validateConstraints(state.constraints, state.guests, state.venue.tables);
        },

        // Template actions
        saveTemplate: (name, description) => {
          const id = createId();
          set((state) => {
            state.templates.push({
              id,
              name,
              description,
              config: structuredClone(state.venue) as VenueConfig,
              createdAt: Date.now(),
            });
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
          return id;
        },

        loadTemplate: (id) => {
          set((state) => {
            const template = state.templates.find((t) => t.id === id);
            if (template) {
              state.venue = structuredClone(template.config) as VenueConfig;
              state.lastSavedAt = Date.now();
            }
          });
          debouncedIDBSave(get());
        },

        deleteTemplate: (id) => {
          set((state) => {
            state.templates = state.templates.filter((t) => t.id !== id);
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        loadPrebuiltTemplate: (index) => {
          const template = PREBUILT_TEMPLATES[index];
          if (!template) return;
          set((state) => {
            // Deep clone and regenerate all IDs
            const config = structuredClone(template.config) as VenueConfig;
            config.tables = config.tables.map((t) => ({ ...t, id: createId(), assignedGuestIds: [] }));
            config.fixtures = config.fixtures.map((f) => ({ ...f, id: createId() }));
            config.walls = config.walls.map((w) => ({ ...w, id: createId() }));
            state.venue = config;
            state.selectedTableId = null;
            state.selectedElementId = null;
            state.selectedElementType = null;
            state.lastSavedAt = Date.now();
          });
          debouncedIDBSave(get());
        },

        // UI actions
        setCurrentStep: (step) => set((state) => { state.currentStep = step; }),
        setSelectedGuestIds: (ids) => set((state) => { state.selectedGuestIds = ids; }),
        toggleGuestSelection: (id) => set((state) => {
          const idx = state.selectedGuestIds.indexOf(id);
          if (idx >= 0) {
            state.selectedGuestIds.splice(idx, 1);
          } else {
            state.selectedGuestIds.push(id);
          }
        }),
        setSelectedTableId: (id) => set((state) => { state.selectedTableId = id; }),
        setSelectedElement: (id, type) => set((state) => {
          state.selectedElementId = id;
          state.selectedElementType = type;
          // Keep selectedTableId in sync for backward compat
          state.selectedTableId = type === 'table' ? id : null;
        }),
        clearSelection: () => set((state) => {
          state.selectedElementId = null;
          state.selectedElementType = null;
          state.selectedTableId = null;
        }),
        setCanvasToolMode: (mode) => set((state) => { state.canvasToolMode = mode; }),
        setSearchQuery: (query) => set((state) => { state.searchQuery = query; }),
        setZoom: (zoom) => set((state) => { state.zoom = Math.max(0.25, Math.min(3, zoom)); }),
        setPanOffset: (offset) => set((state) => { state.panOffset = offset; }),
      })),
      {
        // zundo temporal config — exclude UI state from undo/redo
        limit: 100,
        partialize: (state) => {
          const { currentStep, selectedGuestIds, selectedTableId, selectedElementId, selectedElementType, canvasToolMode, searchQuery, zoom, panOffset, lastSavedAt, ...rest } = state;
          return rest;
        },
      }
    ),
    {
      name: 'auto-seater-storage',
      version: 2,
      partialize: (state) => ({
        guests: state.guests,
        households: state.households,
        socialCircles: state.socialCircles,
        venue: state.venue,
        constraints: state.constraints,
        templates: state.templates,
        currentStep: state.currentStep,
        lastSavedAt: state.lastSavedAt,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const venue = state.venue as Record<string, unknown> | undefined;
          if (venue) {
            if (!venue.walls) venue.walls = [];
            if (venue.blueprintMode === undefined) venue.blueprintMode = false;
          }
        }
        return state as never;
      },
    }
  )
);
