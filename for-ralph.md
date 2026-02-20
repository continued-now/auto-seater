# Auto-Seater: Feature Spec & Success Criteria

> **Created:** 2026-02-20
> **Source:** `research.md` (35 competitor tools, 10 universal pain points, 5 algorithm categories)
> **Purpose:** Actionable feature spec with measurable success criteria, informed by where competitors fail.

---

## Part 1: Competitor Pitfall Analysis

The following 10 pitfalls are synthesized from user complaints across Reddit, Hacker News, WeddingWire, The Knot, App Store, Trustpilot, and Capterra. Each represents a systemic failure that multiple competitors share.

### Pitfall Summary Table

| # | Pitfall | Severity | Tools Affected | Root Cause |
|---|---------|----------|----------------|------------|
| 1 | Data Loss & Unreliable Saving | Critical | WeddingWire, SeatCharter, AllSeated/Prismm | No auto-save; browser-dependent state; no recovery |
| 2 | Tedious One-by-One Placement | High | WeddingWire, Zola, AllSeated/Prismm | No batch operations; no household grouping on drag |
| 3 | No Intelligent Auto-Seating | High | 31 of 35 tools | Algorithm complexity; "good enough" manual approach assumed |
| 4 | Poor Mobile Experience | Medium-High | WeddingWire, Zola, Cvent, most desktop apps | Desktop-first architecture; canvas not touch-optimized |
| 5 | Broken PDF/Print Export | High | WeddingWire, AllSeated/Prismm, PowerSchool | DOM-to-PDF rendering bugs; no WYSIWYG print pipeline |
| 6 | Aggressive Paywalls & Bait-and-Switch | High | AllSeated/Prismm, Zola, Table Tailor, SeatPuzzle | Freemium designed to frustrate; work held hostage |
| 7 | No Real-Time Collaboration | Medium-High | WeddingWire, Zola, The Knot, PerfectTablePlan | Single-user architecture; no sync layer |
| 8 | Can't Handle Last-Minute Changes | High | All 35 tools | Full re-optimization required; no incremental update |
| 9 | No Venue-Accurate Floor Plans | Medium-High | WeddingWire, Zola, The Knot, most mobile apps | Generic shape palettes; no dimension input system |
| 10 | Can't Model Complex Social Dynamics | High | All 35 tools (even PerfectTablePlan limited) | Binary keep/apart only; no weighted relationships |

---

### Pitfall 1: Data Loss & Unreliable Saving

- **Severity:** Critical
- **Affected Tools:** WeddingWire, SeatCharter, Seating Chart Planner, AllSeated/Prismm (timeout issues)
- **User Quotes:**
  - *"This evening I have had to re-enter the seating chart three times... lost ALL the data."* — Julie, WeddingWire Forum
  - *"The d*mn thing does not save! Data disappeared after browser refresh."* — Ben & Rachel, WeddingWire Forum
- **Root Cause:** Tools rely on explicit manual saves or session-based storage. No auto-save, no local persistence fallback, no recovery mechanism. Browser tabs closing or sessions timing out destroy hours of work.
- **What Success Looks Like:** State persists automatically every change. Closing and reopening the browser recovers the exact state. Offline edits sync when connectivity returns. Users never think about saving.

---

### Pitfall 2: Tedious One-by-One Guest Placement

- **Severity:** High
- **Affected Tools:** WeddingWire (especially post-UI update), Zola, AllSeated/Prismm
- **User Quotes:**
  - *"Now you have to drag and drop individual people instead of whole parties."* — Mrs.BowmanToBe, WeddingWire Forum
  - *"I redid ours like 10 times and boy do I regret the amount of time wasted."* — KGroenwold, WeddingWire Forum
- **Root Cause:** No concept of party/household grouping in the drag system. Each guest is an independent entity. Multi-select is absent or broken. For 150–300 guests, this becomes a multi-hour ordeal.
- **What Success Looks Like:** Drag a household/party and the entire group moves as one. Multi-select guests and assign to a table in a single action. Auto-seating eliminates the need for manual placement of most guests.

---

### Pitfall 3: No Intelligent Auto-Seating Suggestions

- **Severity:** High
- **Affected Tools:** 31 of 35 tools have zero auto-seating. Even PerfectTablePlan's genetic algorithm *"cannot be guaranteed to find absolutely the best layout."*
- **User Quotes:**
  - *"The solution has always been to do it by hand."* — pricees, Hacker News
  - *"The seating chart was the most painful part of the planning process."* — FinallyMrsT, WeddingWire Forum
- **Root Cause:** The problem is NP-Hard (equivalent to Restricted Quadratic Multiknapsack). Most tools avoid algorithm investment entirely. The few that attempt it offer no web-based, collaborative version.
- **What Success Looks Like:** One-click auto-seating that respects all constraints. Algorithm runs in under 10 seconds for 200 guests. Output is a strong starting point that users refine, not replace. Users can re-run optimization on a subset of tables without disrupting settled assignments.

---

### Pitfall 4: Poor Mobile Experience

- **Severity:** Medium-High
- **Affected Tools:** WeddingWire (no mobile), Zola (iOS only), Seating-Chart App, Cvent
- **User Quotes:**
  - *"The app doesn't even show the seating chart as an option."* — Laura, WeddingWire.ca Forum
  - *"Tables appear too small to view (3/16" diameter on iPhone 7+), no zoom capability."* — Werkingman, App Store
- **Root Cause:** Desktop-first architectures with canvas rendering that ignores touch interactions. No pinch-zoom, no responsive breakpoints, no mobile-specific interaction patterns (long-press, bottom sheets).
- **What Success Looks Like:** Full functionality on phones and tablets. Touch targets meet 44×44px (iOS) / 48×48dp (Android) minimums. Pinch-zoom and two-finger pan on the floor plan. Guest list accessible via bottom sheet on mobile. No feature parity gap between desktop and mobile.

---

### Pitfall 5: Broken PDF/Print Export

- **Severity:** High
- **Affected Tools:** WeddingWire (blank PDFs), AllSeated/Prismm, PowerSchool, Seating-Chart App
- **User Quotes:**
  - *"Downloads blank seating assignments instead of names."* — Tiffany, WeddingWire Forum
  - *"My seating chart pdf doesn't show anything visible, just a dark line."* — Golden, WeddingWire Forum
- **Root Cause:** DOM-to-PDF conversion breaks layout. Canvas elements don't serialize correctly. No dedicated server-side PDF rendering pipeline. Print stylesheets missing or untested.
- **What Success Looks Like:** PDF output is pixel-identical to on-screen view. Names are legible at every zoom level. Multiple paper sizes supported (A4, Letter, A1 poster). Place cards and escort cards export as print-ready PDFs. Export tested on Chrome, Safari, Firefox, and iOS Safari.

---

### Pitfall 6: Aggressive Paywalls & Bait-and-Switch

- **Severity:** High
- **Affected Tools:** AllSeated/Prismm, Zola (15-guest cap), Table Tailor, SeatPuzzle, Seating-Chart App (50-guest cap)
- **User Quotes:**
  - *"When AllSeated converted to a paid model... they essentially held our existing work hostage."* — Software Advice
  - *"I had the app for two minutes before it wanted me to buy the premium version."* — Always on Track, App Store
- **Root Cause:** Free tiers designed to be useless (15–50 guest caps). Core workflow gates at critical moments. Existing data held hostage behind upgrade prompts.
- **What Success Looks Like:** Free tier is genuinely usable for small events (≤50 guests) with no feature gatekeeping on core workflow. Paid features are additive (collaboration, export formats, premium templates), not essential. User data is always exportable regardless of plan.

---

### Pitfall 7: No Real-Time Collaboration

- **Severity:** Medium-High
- **Affected Tools:** WeddingWire, Zola, The Knot, most mobile apps, PerfectTablePlan
- **User Quotes:**
  - *"I would make a floor plan, download a pdf, send it to my colleague, get feedback and go back to edit it."* — Capterra
  - *"Versions matter — she'd often make a draft and want to tell me 'ok tell me if you like this better than the previous version.'"* — verelo, Hacker News
- **Root Cause:** Single-user desktop architectures. No real-time sync layer. Collaboration reduced to PDF email ping-pong.
- **What Success Looks Like:** Multiple users edit simultaneously with live cursor presence. Changes propagate in under 500ms. Conflict resolution handles concurrent edits to the same guest/table. Shareable link grants view or edit access without requiring an account.

---

### Pitfall 8: Can't Handle Last-Minute Changes

- **Severity:** High
- **Affected Tools:** All 35 tools. Even PerfectTablePlan and Better Seater require full re-optimization.
- **User Quotes:**
  - *"Nothing less than a NIGHTMARE! Just when we think we are done, someone calls."* — Private User, WeddingWire Forum
  - *"The cascade effect is the single most common reason couples spiral into seating chart panic."* — seatplan.io blog
- **Root Cause:** No incremental optimization. Adding or removing one guest requires re-running the entire algorithm or manually cascading changes across multiple tables. No "what-if" scenario support.
- **What Success Looks Like:** Adding/removing a guest triggers localized re-optimization (only affected tables), completing in under 2 seconds. The system suggests where to seat a new guest based on existing constraints. Undo is instant. "What-if" mode lets users preview a change before committing.

---

### Pitfall 9: No Venue-Accurate Floor Plans

- **Severity:** Medium-High
- **Affected Tools:** WeddingWire, Zola, The Knot, most mobile apps, even Cvent (limited custom shapes)
- **User Quotes:**
  - *"No option to input the area of the room or the size of the tables."* — Mrs.BowmanToBe, WeddingWire Forum
  - *"Room size changes when tables moved near edges."* — ISaidHallYes, WeddingWire Forum
- **Root Cause:** Generic shape palettes with no spatial awareness. No real-world dimension input. No way to model pillars, alcoves, stages, or irregular room shapes. Tables float in abstract space.
- **What Success Looks Like:** Users input room dimensions in feet or meters. Tables snap to grid with real proportions. Fixtures (pillars, stage, dance floor, bar) can be placed with accurate sizing. The floor plan visually represents the actual venue layout. Users can overlay a background image (photo/PDF of venue blueprint).

---

### Pitfall 10: Can't Model Complex Social Dynamics

- **Severity:** High
- **Affected Tools:** All 35 tools. PerfectTablePlan supports 23 relationship rules but *"doesn't allow for whether guests might be able to see each other."*
- **User Quotes:**
  - *"Between ex-spouses, age dynamics, and table number limitations this may very well be the most stressful part."* — Ebony502, WeddingWire Forum
  - *"I have to split up my coworkers because the worker bees don't want to sit with management."* — kt2of3, WeddingWire Forum
- **Root Cause:** Binary keep-together/keep-apart is the only relationship model offered. No concept of weighted preferences, multi-group membership, or nuanced social dynamics (e.g., "fine at the same table but not adjacent seats").
- **What Success Looks Like:** Relationship weights on a continuous scale (not binary). Guests can belong to multiple social circles simultaneously. Constraints support granularity: same table, adjacent seats, same table but not adjacent, different tables, and different table zones. The system surfaces potential conflicts visually before they become problems.

---

## Part 2: Core Feature Spec

Features are organized by the five-stage workflow (Guest List → Venue Setup → Seating → Review/Collab → Export) plus cross-cutting concerns. Each feature includes a cross-reference to the pitfall it addresses.

---

### Stage 1 — Guest List Management

| # | Feature | Description | Success Criteria | Pitfall |
|---|---------|-------------|-----------------|---------|
| 1.1 | CSV/Excel Import with Field Mapping | Upload CSV or Excel file; UI shows column preview and lets user map each column to a guest field (name, email, dietary, group, RSVP) via dropdowns | User can import a 300-row CSV and have all fields correctly mapped in under 60 seconds. System provides a downloadable template. Preview shows first 5 rows before confirming import. | P2, P6 |
| 1.2 | Duplicate Detection & Merge | On import or manual add, detect duplicate guests using fuzzy name matching (Levenshtein distance ≤ 2). Offer merge, skip, or create-new options. | Zero duplicate entries after import of a guest list with 5% duplicates. Fuzzy matching catches "Jon Smith" vs "John Smith". Merge UI shows both records side-by-side. | P2 |
| 1.3 | RSVP Status Tracking | Each guest has a status: Invited, Accepted, Declined, Pending, Waitlisted. Filter and sort guest list by status. Status changes reflected in seating view instantly. | Seating view only shows Accepted guests by default. Declining a guest auto-removes them from their seat with cascade prompt. Status counts visible in dashboard. | P8 |
| 1.4 | Dietary & Accessibility Tags | Predefined tags (vegetarian, vegan, gluten-free, nut allergy, halal, kosher, wheelchair, hearing loop) plus custom tags. Tags visible on guest card and in seating view. | Tags display as colored badges on the floor plan. Filtering by tag highlights matching guests. Export includes dietary breakdown per table for catering. | P10 |
| 1.5 | Household / Party Grouping | Group guests into households (e.g., "The Smiths": John, Jane, Kids). Parties move as a unit during drag-and-drop. Capacity calculations count party members. | Dragging a household to a table seats all members. Removing one member from a party is possible without ungrouping all. Party headcount reflected in table capacity. | P2 |
| 1.6 | Social Circle Tagging | Assign guests to one or more social circles (Bride's Family, Groom's College, Work Friends, Neighbors). Used by auto-seating to group compatible guests. | A guest can belong to 3+ circles simultaneously. Auto-seating uses circle overlap as a positive preference signal. Circle filter highlights all members on the floor plan. | P10 |
| 1.7 | Guest Search & Filter | Full-text search across name, email, tags, notes. Multi-filter: by status, dietary tag, social circle, assigned/unassigned, table number. | Search returns results as-you-type (≤100ms latency). Combining 3+ filters works correctly. Filter state persists across page navigation. Clear-all-filters button available. | P2 |
| 1.8 | Bulk Operations | Multi-select guests via checkboxes or shift-click. Bulk assign to table, bulk tag, bulk delete, bulk change RSVP status. | Select 50 guests and assign to 5 tables (10 each) in under 10 seconds. Bulk delete shows confirmation with guest count. Undo available for all bulk operations. | P2 |

---

### Stage 2 — Venue Setup

| # | Feature | Description | Success Criteria | Pitfall |
|---|---------|-------------|-----------------|---------|
| 2.1 | Room Dimensions Input | Enter room width and height in feet or meters. Canvas scales to match. Optional background image upload (photo or PDF of venue blueprint) for tracing. | Dimensions persist across sessions. Background image aligns with grid. Switching between ft/m converts correctly. Room boundary prevents table placement outside walls. | P9 |
| 2.2 | Table Placement (Multiple Shapes) | Place tables from a palette: round (6–12 seats), rectangular (6–20), square (4–8), cocktail/standing, head table, sweetheart table. Free-position on canvas. | All 6 table types available. Tables show seat count visually (dots or chair icons around perimeter). Tables can be rotated to any angle in 15° increments, or free-rotate with modifier key. | P9 |
| 2.3 | Table Capacity Configuration | Each table has a configurable seat count (min 1, max 20). Visual representation updates to show correct number of seats. Warning if guests assigned exceed capacity. | Changing capacity from 10 to 8 on a table with 10 guests flags the overflow immediately. Seat count is visible on the table at all zoom levels. | P2, P3 |
| 2.4 | Fixtures & Obstacles | Place non-seating objects: dance floor, DJ booth, stage, bar, buffet, pillars, doors, cake table, photo booth. Objects block table placement (collision detection). | Dragging a table onto a pillar snaps it to the nearest valid position. At least 10 fixture types available. Custom rectangular obstacle with label for unlisted items. | P9 |
| 2.5 | Grid Snap Toggle | Toggle between snap-to-grid (aligned layouts) and free-form placement. Grid size configurable (1ft, 2ft, 0.5m, 1m). | Tables align to grid when snap is on. Holding a modifier key temporarily disables snap. Grid lines visible but non-distracting. Default: snap on. | P9 |
| 2.6 | Zoom, Pan & Minimap | Scroll-to-zoom, click-and-drag pan, pinch-zoom on touch. Minimap in corner shows full venue with viewport indicator. Zoom-to-fit button. | Zoom range: 25%–400%. Pan is smooth at 60fps with 30+ tables. Minimap updates in real-time. Double-click a table to zoom-to-fit that table. | P4, P9 |
| 2.7 | Venue Template Save/Load | Save current venue layout (room + tables + fixtures, without guests) as a named template. Load template for new events. | Templates persist across sessions. At least 3 templates can be saved. Loading a template populates the canvas in under 1 second. Templates export/import as JSON. | P1 |

---

### Stage 3 — Seating Assignment

| # | Feature | Description | Success Criteria | Pitfall |
|---|---------|-------------|-----------------|---------|
| 3.1 | Drag-and-Drop (Dual-Panel) | Left panel: guest list (filterable, scrollable). Right panel: floor plan canvas. Drag guests from list to table seats. Drag between seats to reassign. | Drag starts with 150ms hold (prevents accidental). Drop target highlights green (valid) or red (full/conflict). Guest disappears from unassigned list on drop. Works on touch devices. | P2, P4 |
| 3.2 | Swap Mode | Drag one seated guest onto another seated guest to swap their positions. Both guests move simultaneously. | Swap completes in a single drag action. Visual preview shows both guests' new positions before release. Swap respects constraints (warns if swap creates a conflict). | P2 |
| 3.3 | Auto-Seating Algorithm | One-click button runs optimization: CSP for hard constraints → SA/GA for soft preferences → hill-climbing refinement. Respects all defined constraints and preferences. | Algorithm completes in ≤10 seconds for 200 guests across 20 tables. Result satisfies 100% of hard constraints. Soft preference score is ≥80% of theoretical maximum. User can accept, reject, or partially accept the result. | P3, P10 |
| 3.4 | Constraint Definition (Must / Must-Not) | Per-guest-pair constraints: must-sit-together (same table), must-not-sit-together (different tables). UI: select two guests, choose constraint type. Visual indicator on both guests. | Constraints show as colored lines between guest cards (green = must, red = must-not). Violating a hard constraint shows an immediate warning. Constraints persist and are respected by auto-seating. | P10 |
| 3.5 | Preference Weights | Continuous relationship weight between guest pairs: -10 (strong avoid) to +10 (strong prefer). Default: 0 (neutral). Social circle membership auto-generates baseline positive weights. | Weight slider or numeric input per pair. Auto-seating uses weights to maximize total satisfaction score. Import weights from CSV (guest1, guest2, weight). | P10 |
| 3.6 | Conflict Indicators | Visual badges on tables and guests showing constraint violations, capacity overflow, dietary clustering issues, or gender imbalance. Summary panel shows all active conflicts. | Red badge with count on any table with issues. Clicking badge shows itemized conflict list. Zero false positives. Conflicts update in real-time as guests are moved. | P3, P10 |
| 3.7 | Localized Re-Optimization | When a guest is added, removed, or moved, re-optimize only the affected tables (not the entire arrangement). Suggest optimal placement for a newly added guest. | Re-optimization completes in ≤2 seconds for a single-guest change. Unaffected tables remain exactly as-is. System suggests the top 3 table options for a new guest with reasoning. | P8 |
| 3.8 | Unassigned Guest Tracker | Persistent indicator showing count and list of guests not yet assigned to any table. Filterable by RSVP status (show only Accepted unassigned). | Counter visible at all times (e.g., "12 guests unassigned"). Clicking opens filtered guest list. Counter turns green at 0. Auto-seating assigns all accepted guests — counter reaches 0. | P2 |
| 3.9 | Table Balance Indicators | Per-table metrics: seat fill percentage, gender ratio, average age (if provided), dietary tag distribution. Visual heat map or progress bars. | Fill percentage shown on each table (e.g., "8/10"). Warning at >100% capacity. Gender ratio displayed as simple M/F/X count. Metrics update live during drag operations. | P3 |

---

### Stage 4 — Review & Collaboration

| # | Feature | Description | Success Criteria | Pitfall |
|---|---------|-------------|-----------------|---------|
| 4.1 | Shareable Link | Generate a URL granting view-only or edit access to the seating plan. No account required for viewers. Link permissions configurable (view/edit/comment). | Link generates in ≤1 second. View-only users see the floor plan and guest assignments but cannot modify. Links are revocable. Link works on mobile browsers without app install. | P7 |
| 4.2 | Real-Time Co-Editing | Multiple users edit the same seating plan simultaneously. Live cursor presence (show who's editing what). Changes propagate in ≤500ms. | 3 simultaneous editors can move guests without conflicts. Each editor's cursor shows their name/avatar. Edits by others appear smoothly (no page reload). Offline edits sync on reconnect. | P7 |
| 4.3 | Version History | Every meaningful change creates a version snapshot. Users can browse, compare, and restore previous versions. Diff view highlights what changed. | At least 50 versions retained. Restoring a version takes ≤2 seconds. Diff view shows added/removed/moved guests with color coding. Auto-named versions (timestamp + summary). | P7, P8 |
| 4.4 | Comments & Annotations | Click on a table or guest to leave a comment. Comments visible as speech-bubble icons. Thread-based replies. Tagging other collaborators with @mention. | Comments persist across sessions. At most 1-click to add a comment. Notification sent to tagged collaborators. Unread comment count shown in header. Comments exportable. | P7 |
| 4.5 | Approval Workflow | Planner submits a seating plan version for approval. Approvers (couple, client) can approve, reject with comments, or request changes. Status tracked per version. | Approval request sends notification (email or in-app). Approver sees read-only view with approve/reject buttons. Rejection requires a comment. Approval status shown on version history. | P7 |

---

### Stage 5 — Export & Print

| # | Feature | Description | Success Criteria | Pitfall |
|---|---------|-------------|-----------------|---------|
| 5.1 | PDF Export (Multiple Sizes) | Export seating plan as PDF in A4, Letter, A3, and A1 (poster) sizes. Layout auto-adjusts to paper size. All names legible at printed size. | PDF is pixel-identical to on-screen view. Names are ≥8pt font at A4 size. Colors print correctly (CMYK-safe palette). Export completes in ≤5 seconds. Tested on Chrome, Safari, Firefox. | P5 |
| 5.2 | Place Cards | Generate individual place cards (one per guest) with name, table number, and optional meal icon. Printable on standard place card stock (3.5" × 2" or A7). | Cards export as multi-up PDF (8 per A4 page). Font and layout customizable. Names handle up to 30 characters without truncation. Correct sort order (by table, then seat). | P5 |
| 5.3 | Escort Card View | Alphabetical guest list with table assignments. Designed for display at venue entrance. Two formats: poster (A1/A2) and individual cards. | Alphabetical sort handles accented characters correctly. Poster format fits up to 200 guests legibly. Guest can find their name and table in ≤5 seconds of scanning. | P5 |
| 5.4 | CSV Export | Export guest assignments as CSV: guest name, table number, seat number, dietary tags, RSVP status, notes. For catering and venue staff. | CSV opens correctly in Excel, Google Sheets, and Numbers. UTF-8 encoding handles international names. Headers match import template for round-trip compatibility. | P5 |
| 5.5 | Digital Display Link | Shareable URL showing a read-only, beautifully rendered seating chart for day-of digital display (lobby screen, projector). | Link loads in ≤3 seconds. Auto-scales to display resolution. No editing UI visible. Includes event name and date header. Works fullscreen on any device. | P5 |
| 5.6 | Print Preview | WYSIWYG preview of all export formats before generating. Shows exact page breaks, margins, and font sizes. | Preview renders in ≤2 seconds. Toggle between paper sizes in preview without re-exporting. Print-from-preview button triggers native print dialog with correct settings. | P5 |

---

### Cross-Cutting Concerns

| # | Feature | Description | Success Criteria | Pitfall |
|---|---------|-------------|-----------------|---------|
| 6.1 | Auto-Save with Conflict Resolution | Every change auto-saves to cloud within 2 seconds. If offline, saves locally and syncs on reconnect. Concurrent edit conflicts resolved via operational transform or CRDT. | User can close browser, reopen, and see exact last state. No "save" button exists in the UI. Offline banner appears when disconnected. Sync indicator shows save status. Data survives browser crash. | P1 |
| 6.2 | Mobile-Responsive Touch UI | Full feature parity on mobile and tablet. Touch-optimized interactions: pinch-zoom, long-press to select, bottom sheet for guest list, swipe gestures. Minimum 44×44px touch targets. | All Stage 1–5 features work on iPhone SE (smallest common screen). No horizontal scrolling on any breakpoint. Touch drag-and-drop works reliably (≤5% accidental drop rate). Tablet layout uses split-panel. | P4 |
| 6.3 | Undo / Redo | Full undo/redo stack for all actions: guest moves, table adds/removes, constraint changes, bulk operations. Keyboard shortcut (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z). | Undo stack holds ≥100 actions. Undo/redo completes in ≤100ms. Multi-step operations (e.g., bulk assign) undo as a single action. Undo available across page navigation within session. | P1, P8 |
| 6.4 | Offline Support | Core workflow (view plan, edit seats, add guests) works without internet. Changes queue locally and sync when online. PWA installable on mobile. | Offline indicator visible. All edits made offline sync without data loss on reconnect. Conflicts from concurrent offline edits show merge UI. App installable via "Add to Home Screen". | P1, P4 |
| 6.5 | Accessibility (WCAG 2.1 AA) | Keyboard navigation for all interactions. Screen reader labels on all interactive elements. Color-blind safe palette. Focus indicators. Reduced-motion mode. | Lighthouse accessibility score ≥90. All actions achievable via keyboard alone. Color is never the sole indicator of meaning (always paired with shape or text). Contrast ratio ≥4.5:1 for all text. | — |

---

## Part 3: Feature Priority Matrix

| # | Feature | Competitor Coverage (of 35) | Pitfall Addressed | Success Criteria (Short) |
|---|---------|:---------------------------:|:-----------------:|--------------------------|
| **Stage 1 — Guest List** | | | | |
| 1.1 | CSV/Excel Import | 22/35 | P2, P6 | 300-row import mapped in ≤60s |
| 1.2 | Duplicate Detection | 3/35 | P2 | Zero duplicates after import with 5% overlap |
| 1.3 | RSVP Tracking | 15/35 | P8 | Decline auto-removes from seat with prompt |
| 1.4 | Dietary/Accessibility Tags | 12/35 | P10 | Tags visible on floor plan; per-table dietary export |
| 1.5 | Household/Party Grouping | 8/35 | P2 | Drag party as unit; capacity counts members |
| 1.6 | Social Circle Tagging | 2/35 | P10 | Multi-circle membership; used by auto-seating |
| 1.7 | Guest Search & Filter | 18/35 | P2 | As-you-type results ≤100ms; multi-filter combos |
| 1.8 | Bulk Operations | 5/35 | P2 | 50-guest bulk assign in ≤10s |
| **Stage 2 — Venue Setup** | | | | |
| 2.1 | Room Dimensions | 10/35 | P9 | Dimensions in ft/m; background image overlay |
| 2.2 | Table Placement (Multi-Shape) | 28/35 | P9 | 6 table types; rotation in 15° increments |
| 2.3 | Table Capacity Config | 25/35 | P2, P3 | Overflow warning; visible count at all zoom levels |
| 2.4 | Fixtures & Obstacles | 12/35 | P9 | ≥10 fixture types; collision detection |
| 2.5 | Grid Snap Toggle | 8/35 | P9 | Toggle on/off; modifier key override |
| 2.6 | Zoom/Pan/Minimap | 15/35 | P4, P9 | 25%–400% zoom; 60fps pan; minimap |
| 2.7 | Venue Template Save/Load | 6/35 | P1 | ≥3 templates; load in ≤1s; JSON export |
| **Stage 3 — Seating** | | | | |
| 3.1 | Drag-and-Drop (Dual-Panel) | 26/35 | P2, P4 | Green/red drop indicators; touch support |
| 3.2 | Swap Mode | 8/35 | P2 | Single-action swap; conflict warning |
| 3.3 | Auto-Seating Algorithm | 4/35 | P3, P10 | ≤10s for 200 guests; 100% hard constraint compliance |
| 3.4 | Constraint Definition | 4/35 | P10 | Visual constraint lines; auto-seating respects all |
| 3.5 | Preference Weights | 1/35 | P10 | Continuous -10 to +10 scale; CSV importable |
| 3.6 | Conflict Indicators | 3/35 | P3, P10 | Red badge with count; zero false positives |
| 3.7 | Localized Re-Optimization | 0/35 | P8 | ≤2s for single change; top-3 suggestions |
| 3.8 | Unassigned Guest Tracker | 10/35 | P2 | Persistent counter; green at 0 |
| 3.9 | Table Balance Indicators | 2/35 | P3 | Fill %, gender ratio, live update during drag |
| **Stage 4 — Review & Collab** | | | | |
| 4.1 | Shareable Link | 10/35 | P7 | ≤1s generation; no account for viewers |
| 4.2 | Real-Time Co-Editing | 4/35 | P7 | 3 editors; ≤500ms propagation; cursor presence |
| 4.3 | Version History | 2/35 | P7, P8 | ≥50 versions; color-coded diff view |
| 4.4 | Comments & Annotations | 3/35 | P7 | 1-click comment; @mention notifications |
| 4.5 | Approval Workflow | 1/35 | P7 | Approve/reject buttons; rejection requires comment |
| **Stage 5 — Export & Print** | | | | |
| 5.1 | PDF Export (Multi-Size) | 20/35 | P5 | Pixel-identical to screen; ≥8pt names at A4 |
| 5.2 | Place Cards | 3/35 | P5 | 8-up per A4; ≤30 char names; customizable |
| 5.3 | Escort Card View | 3/35 | P5 | Alphabetical; ≤5s to find a name |
| 5.4 | CSV Export | 12/35 | P5 | UTF-8; round-trip compatible with import |
| 5.5 | Digital Display Link | 2/35 | P5 | ≤3s load; fullscreen; auto-scale |
| 5.6 | Print Preview | 8/35 | P5 | ≤2s render; toggle paper sizes in-preview |
| **Cross-Cutting** | | | | |
| 6.1 | Auto-Save | 8/35 | P1 | Every change saved ≤2s; survives browser crash |
| 6.2 | Mobile-Responsive Touch UI | 10/35 | P4 | Full parity on iPhone SE; ≤5% accidental drops |
| 6.3 | Undo/Redo | 5/35 | P1, P8 | ≥100 actions; ≤100ms; bulk ops undo as one |
| 6.4 | Offline Support | 3/35 | P1, P4 | Offline edits sync without loss; PWA installable |
| 6.5 | Accessibility (WCAG 2.1 AA) | 1/35 | — | Lighthouse ≥90; keyboard-only navigation |

---

### Differentiation Summary

The highest-impact features are those with the **lowest competitor coverage** and **highest pitfall severity**:

| Feature | Coverage | Pitfall Severity | Differentiation Potential |
|---------|:--------:|:----------------:|:-------------------------:|
| 3.7 Localized Re-Optimization | 0/35 | High (P8) | Maximum |
| 3.5 Preference Weights | 1/35 | High (P10) | Maximum |
| 4.5 Approval Workflow | 1/35 | Medium-High (P7) | High |
| 6.5 Accessibility (WCAG) | 1/35 | — | High |
| 1.6 Social Circle Tagging | 2/35 | High (P10) | High |
| 3.9 Table Balance Indicators | 2/35 | High (P3) | High |
| 4.3 Version History | 2/35 | High (P7, P8) | High |
| 5.5 Digital Display Link | 2/35 | High (P5) | High |
| 3.6 Conflict Indicators | 3/35 | High (P3, P10) | High |
| 3.3 Auto-Seating Algorithm | 4/35 | High (P3, P10) | High |
| 3.4 Constraint Definition | 4/35 | High (P10) | High |
| 4.2 Real-Time Co-Editing | 4/35 | Medium-High (P7) | High |

---

*End of feature spec.*
