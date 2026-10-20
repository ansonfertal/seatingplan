# Institutional User Operational Manual

**Exam Seating Arrangement Generator**  
*Enterprise Examination Planning & Seating Allocator*

---

## 1. System Overview

The **Exam Seating Arrangement Generator** is an institutional-grade academic examination planning tool designed to automate constraint-aware candidate seating arrangements, prevent academic malpractice, and produce official examination hall print packs conforming to university examination cell protocols.

### Key Operational Principles
- **100% Deterministic & Rule-Based:** All seating assignments are computed using mathematical constraint satisfaction algorithms with reproducible pseudo-random seeds. No stochastic guessing or uncontrolled LLMs are used.
- **Independent Validation Gatekeeper:** A decoupled verification engine audits 100% of generated and manually edited plans against hard constraints (C1–C6) before any print pack can be generated.
- **Client-Side Privacy & Security:** Candidate rosters and personal information are processed locally in your browser tab. Spreadsheet formula injection (`=`, `+`, `-`, `@`) is stripped on import, macros are blocked, and a dedicated privacy wipe action is provided.

---

## 2. End-to-End Workflow Guide

The generator features a guided 7-stage workflow stepper that walks exam superintendents through the entire process:

```
[1. Exam Setup] ➔ [2. Candidates] ➔ [3. Rooms] ➔ [4. Rules] ➔ [5. Generate] ➔ [6. Review & Swap] ➔ [7. Export & Print]
```

---

### Stage 1: Examination Configuration
1. Navigate to `/exam` or click **1. Exam Setup** in the top navigation bar.
2. Enter the **Exam Name** (e.g. `End Semester Examinations — Autumn 2026`).
3. Select the **Exam Date** and **Session** (`Forenoon [FN]` or `Afternoon [AN]`).
4. Enter optional metadata such as institution name, chief superintendent name, and center code.
5. Click **Continue to Candidate Import →**.

---

### Stage 2: Candidate Roster Upload & Verification
1. Supported file formats: `.csv`, `.xlsx`, `.xls`.
2. Drag and drop or browse to select your candidate roster file.
3. **Column Mapping Modal:** The system automatically maps common headers (`Register Number`, `Name`, `Branch`, `Semester`, `Subject Code`). Verify or adjust mapped headers.
4. **Duplicate Handling Policy:** Choose your institutional policy:
   - **Reject Duplicates (Default):** Flags duplicated register numbers as invalid rows for correction.
   - **Keep First:** Discards subsequent duplicate records.
   - **Overwrite:** Updates earlier entries with the latest row.
5. **Pre-Check Data Sanitizer:** The system automatically sanitizes cells against spreadsheet formula injection (`=`, `@`, `+`, `-`) and strictly preserves leading zeroes in register numbers (e.g. `00123`).
6. Review the **Branch & Subject Distribution Cards**. Click **Continue to Rooms & Benches →**.

---

### Stage 3: Room Setup & Visual Bench Geometry
1. Configure exam halls with physical parameters:
   - **Rows (1–20)** and **Columns (1–20)** of benches.
   - **Students per Bench (1, 2, or 3)**.
   - **Room Sequence/Order:** Sets the room fill priority.
2. **Visual Seat & Bench Editor:**
   - Click any individual seat slot (Position 1, 2, or 3) to toggle between **Available** and **Blocked/Damaged**.
   - Click the **Bench** toggle to block an entire bench position at once.
   - The system dynamically calculates **Effective Physical Capacity** (`Theoretical Capacity - Blocked Seats`).
3. Ensure total effective capacity exceeds total candidate count. Click **Continue to Seating Rules →**.

---

### Stage 4: Seating Rules & Adjacency Constraints
Configure hard institutional constraints:
- **Same Bench Separation (Hard Constraint C2 & C3):**
  - Prohibits candidates taking the same subject or from the same branch from sitting on the same bench.
- **Adjacency Separation:**
  - Option to prohibit same-branch candidates on neighboring benches horizontally, vertically, or diagonally.
- **Same Semester Separation:**
  - Prohibits candidates of the same semester sitting together on multi-seat benches.
- Click **Continue to Generate →**.

---

### Stage 5: Plan Generation & Verification Gatekeeper
1. **Capacity Gatekeeper Pre-Check:**
   - The system verifies `Total Eligible Candidates <= Sum of Selected Rooms' Effective Capacities`.
   - If capacity is insufficient, an actionable alert displays the exact deficit and suggests adding rooms.
2. **Room Fill Strategy:**
   - **Sequential (Standard):** Fills Hall 101 to capacity, then Hall 102, Hall 103, etc., while interleaving student cohorts to ensure bench compatibility.
   - **Balanced:** Distributes students evenly across all selected halls.
3. **Deterministic Seed:** Enter an integer seed (e.g. `42`) to reproduce identical allocations across runs.
4. Click **Generate Seating Plan**.
5. The independent validator automatically verifies all hard constraints (zero same-subject bench mates, zero duplicates, zero blocked seats occupied).

---

### Stage 6: Visual Spatial Review & Manual Swaps
1. **Interactive Room Grid:** Displays room benches with student register number, name, branch tag, and seat position.
2. **Real-Time Candidate Search:** Type any register number or candidate name in the search bar; the grid immediately highlights the student's room, bench, and seat.
3. **Manual Seat Swap Engine:**
   - Click the first student's seat (highlighted in amber as source).
   - Click any target seat (empty or occupied).
   - The **Pre-Swap Constraint Validator** verifies the move before applying it. If the swap causes a conflict (e.g. puts two same-branch students on the same bench), it displays a clear warning modal.
4. **Audit Versioning & Undo/Redo:**
   - Every swap is recorded in the version history.
   - Full Undo (`Ctrl+Z`) and Redo support.
   - Click **Finalize Allocation Version** to freeze the plan and prevent inadvertent changes.

---

### Stage 7: Official Export & Print Pack Generation
The system generates 5 standard examination documents formatted strictly for physical laser printing and door notices:

| Document Type | Target Audience | Paper Orientation | Key Contents |
| :--- | :--- | :--- | :--- |
| **Output A: Seating Notice Sheet** | Notice Boards & Portals | A4 Portrait | Candidate register numbers, assigned room, bench row/column, seat position. |
| **Output B: Attendance Sheet #1** | Hall Invigilator | A4 Portrait | Room-wise candidate roster with answer booklet serial number and student signature columns. |
| **Output C: Attendance Sheet #2** | Hall Invigilator | A4 Portrait | Compact dual-student bench format with present/absent checkboxes. |
| **Output D: Daily Attendance Sheet** | Chief Superintendent | A4 Portrait | Hall-wide summary of registered, present, and absent counts with official signature blocks. |
| **Output E: Room Seating Plan Diagram** | Classroom Door Notice | A4 Landscape | Spatial 2D grid diagram showing bench rows, columns, teacher desk orientation, and occupant register numbers. |

#### Export Actions Available
- **Download Combined Print Pack (PDF):** Compiles all 5 official sheets into a single master PDF with page breaks between sections.
- **Direct Print (`window.print()`):** Triggers native browser print preview with header chrome suppressed and clean table header repetitions (`thead`).
- **Export Raw Allocation Data (CSV & XLSX):** Generates spreadsheet containing full allocation coordinates (`Exam Name`, `Date`, `Session`, `Room`, `Row`, `Col`, `Position`, `Register Number`, `Name`, `Branch`, `Subject`).

---

## 3. Data Privacy & Security Hardening

- **No Remote PII Transmission:** Candidate rosters are processed entirely within the local browser environment.
- **Formula Injection Immunity:** Malicious inputs starting with `=`, `+`, `-`, `@` are stripped before data reaches algorithms or export files.
- **Safe Logging:** Console logs redact student names and register numbers (`20***01`, `J*** D***`).
- **Privacy Wipe:** Click **Clear All Student Data** in the candidate screen to permanently purge stored candidate records and draft caches from browser local storage.

---

## 4. Troubleshooting & Infeasibility Diagnostics

| Issue | Root Cause | Recommended Action |
| :--- | :--- | :--- |
| **"Capacity Deficit: X seats shortage"** | Total candidate count exceeds available room capacity. | Add more rooms in Step 3 or unblock damaged seats. |
| **"Unassigned Candidates" on multi-seat benches** | More than 50% of candidates belong to a single subject code or branch (Pigeonhole limitation). | In 2-seat benches, two students of the same subject cannot sit together. Add candidates from another cohort, or add more benches so excess single-cohort candidates can occupy single seats. |
| **"Leading zeros missing in register numbers"** | Opening raw CSV files in older versions of Excel can auto-strip zeroes. | The application preserves leading zeros. Use the application's built-in XLSX export to view numbers with exact text formatting. |
| **"Table headers not repeating on printed pages"** | Browser print settings have headers/footers disabled. | Ensure paper size is set to **A4** and scale is set to **Default (100%)** in the browser print dialog. CSS rules automatically manage header repetitions. |

---

## 5. Build & Deployment Verification

To run tests and build for production:

```bash
# Run full unit, integration, benchmark, and edge-case test suite
npm test

# Build production bundle with strict TypeScript type-checking
npm run build

# Preview production build locally
npm run preview
```
