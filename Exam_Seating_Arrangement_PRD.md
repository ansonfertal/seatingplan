# PRD: Examination Seating Arrangement & Print Pack Generator

**Status:** Draft for AI-coding-tool hand-off.\
**Audience:** Examination coordinator and implementation team.

> **Sample-template dependency:** The institution will upload five
> sample forms: Attendance Sheet #1, Attendance Sheet #2, Seating
> Arrangement Sheet, Daily Attendance Sheet, and Room Seating Plan.
> Until inspected, this PRD specifies required behavior and content, not
> exact form fields, labels, margins, logos, or page geometry. Implement
> adaptable templates; do not guess sample-specific fields.

## 1. Vision and goals

Build a web app that lets an authorized exam coordinator set up an
examination, import candidates, configure rooms/benches, generate a
validated seating allocation, review/finalize it, and create five
readable print-ready documents.

Success means: - Candidate import catches missing fields and duplicate
register numbers before committing. - Every allocation is independently
validated; violations are never silently accepted. - Room capacity is
never exceeded. - Every candidate is assigned once or explicitly
reported as unassigned with a reason. - Print/PDF output is aligned,
legible, and consistent with the uploaded institutional samples. - All
five documents use the same finalized allocation version.

## 2. Users, scope, and non-goals

### Primary user

**Exam Coordinator/Admin:** creates exams, imports/corrects students,
configures rooms, generates/reviews allocations, finalizes and prints
documents.

Authentication can be omitted for a local prototype. Any deployed
multi-user service must provide authentication, authorization, protected
student data, and backups.

### MVP scope

-   Exam name, date, start time, end time or duration.
-   Student import: register number, name, branch, semester, subject
    code.
-   Room configuration: room identifier, bench rows/columns, capacity,
    1--3 students per bench, optionally blocked benches/seats.
-   Automated assignment with the hard constraints below.
-   Review, validated manual moves/swaps, versioning, finalization.
-   Five institution-specific print outputs, PDF and browser print,
    combined print pack, allocation CSV/XLSX.

### Non-goals

Question paper creation, invigilator rostering, answer-script/result
management, ERP integration, student logins, and automatic timetable
generation.

## 3. Workflow

1.  Create examination.
2.  Upload XLSX/CSV student list; map columns; inspect preview/errors;
    confirm import.
3.  Add/select rooms and configure physical bench grids.
4.  Select rooms and generate allocation.
5.  Review room maps, capacity, conflicts, unassigned candidates;
    optionally make validated swaps or regenerate.
6.  Finalize a versioned allocation.
7.  Preview, print, or download the five documents and combined PDF.
8.  If changes are made later, create a new version and mark prior print
    packs as superseded.

## 4. Functional requirements

### 4.1 Examination setup

-   Create, edit, duplicate, archive exams.
-   Required: exam name, date, start time, and end time or duration.
-   Validate end time; support overnight exams only if explicitly
    enabled.
-   Store time in configured institutional time zone.
-   Show exam metadata on outputs wherever the sample form has matching
    fields.

### 4.2 Student import

Required columns: register number (string), name, branch, semester,
subject code.

-   Support `.xlsx` and `.csv`; offer column mapping.
-   Preview normalized records before import.
-   Report missing values, malformed rows, duplicate register numbers,
    blank/extra rows.
-   Preserve leading zeros and register-number formatting; never parse
    register numbers as numbers.
-   Allow correction, error-report download, replace/append modes, and
    clear duplicate policy.
-   Treat branch/subject comparisons consistently (e.g., trimmed,
    case-normalized comparison) while preserving original display text.
-   Recommended initial data model: one exam-candidate record per
    register number per paper/sitting. If one student may have multiple
    subject codes in a sitting, confirm whether this means multiple
    candidate entries or a list of papers before implementation.

### 4.3 Rooms and benches

Room fields: room name/number, rows, columns, students per bench (1, 2,
or 3), configured maximum capacity, room order, optional blocked
benches/seats.

-   Provide visual row/column grid editor.
-   Theoretical capacity = rows × columns × students-per-bench;
    effective capacity subtracts unavailable positions.
-   Configured max capacity may be lower than effective physical
    capacity, but never higher.
-   Permit a partially occupied final bench.
-   Distinguish number of benches from number of seats.
-   Room geometry changes invalidate/reopen allocation for regeneration.

### 4.4 Allocation constraints

**Definitions:** A bench is one cell in the room's row/column grid. It
contains 1--3 ordered seat positions. The stated "nearby positions in
the same bench" rule is interpreted as comparing occupants of the *same
bench*. Adjacent benches are not included unless the institution
explicitly confirms an additional rule.

Hard constraints: - **C1 Capacity:** room assignment count must not
exceed configured or effective capacity. - **C2 Subject:** no two
occupants of the same bench may share a subject code. - **C3
Branch/semester:** no two occupants of the same bench may share both
normalized branch and semester. - **C4 Unique assignment:** each
candidate appears at most once in a version; each eligible candidate is
assigned or explicitly unassigned. - **C5 Valid physical seat:** use
only available benches/positions. - **C6 Missing data:** candidates
missing branch, semester, or subject code must be corrected before
allocation.

For a 2- or 3-person bench, compare every occupant pair. A pair
conflicts if their subject codes match **OR** both branch and semester
match.

Optional later rule: prohibit same-subject (or branch/semester)
occupants on neighboring benches, with adjacency defined as
left/right/front/back and optionally diagonal. Do not assume this is
part of MVP.

### 4.5 Allocation engine

-   Pre-check total candidate count against selected rooms' effective
    capacity.
-   Allow the coordinator to select rooms and room-fill strategy (MVP:
    fill in configured room order; balancing can be added).
-   Use a deterministic constraint-aware algorithm (e.g., constraint
    satisfaction/backtracking with heuristics), not simple sequential
    filling.
-   Run an independent validator after generation; success is shown only
    if validation passes.
-   Store algorithm/version/seed and exact assignments for
    reproducibility.
-   Show assigned/unassigned counts, occupancy per room, empty seats,
    and verified violations.
-   If no solution is found, distinguish proven infeasibility from
    search timeout/heuristic failure where possible. Show actionable
    options: add rooms, change configuration, correct data, or
    explicitly authorize a rule relaxation.
-   Regenerate with a new seed/order while retaining prior versions.
-   Manual moves/swaps must pass the same validator; reject invalid
    moves with a clear explanation.
-   Do not silently leave candidates out or duplicate them.

### 4.6 Review and finalization

-   Display room grid with row/column labels and occupant register
    number(s) by position.
-   Bench detail shows register number, name, subject, branch, semester.
-   Search by name/register number and locate the seat.
-   Allow controlled manual move/swap and validation feedback.
-   Finalization locks a snapshot; later edits create a new version.
-   Warn if a print preview/download is based on a superseded
    allocation.

### 4.7 Five documents

All outputs must derive from the same finalized allocation snapshot.
Inspect the uploaded sample for exact fields, order, grouping, labels,
signatures, logo, paper size, orientation, and margins before coding the
final layouts.

**Output A --- Attendance Sheet #1** - Match sample #1's fields and
structure. - Populate exam/room/candidate details as applicable. - Leave
handwriting/signature fields blank and sufficiently spacious. - Confirm
candidate ordering (room-wise, register-number order, or seat order)
from the sample/owner.

**Output B --- Attendance Sheet #2** - Treat as a separate template; do
not assume it duplicates A. - Match its fields and provide handwriting
space. - Confirm its purpose/grouping from the sample.

**Output C --- Seating Arrangement Sheet** - Match sample's required
fields. - Prominently display room and large, high-contrast register
numbers suitable for a notice board. - Do not shrink text merely to
force all candidates onto one page; use multiple pages/room sheets if
needed. - Avoid unnecessary personal data not required by the form.

**Output D --- Daily Attendance Sheet** - Match the uploaded daily
attendance form. - Populate date/exam/room/candidate details as
required. - Reserve adequate handwriting/signature/status space. -
Confirm whether it is per room, subject, or exam-wide.

**Output E --- Room Seating Plan / notice-board plan** - Diagram actual
room rows, columns, benches, and position assignments. - Label every
bench with row/column and each occupant with register number. - Include
room, exam, date, session as applicable. - Include a legend defining
position orientation (e.g., leftmost from candidate's view); confirm
orientation with institution. - Mark empty/blocked positions clearly. -
Provide a structured table alternative; prefer one room per page over
tiny text.

Common print requirements: - Reusable template system; configurable A4
portrait/landscape initially. - Consistent fonts, alignment, margins,
headers/footers, and page numbers as appropriate. - Black-and-white
legibility; no color-only meaning. - Repeat table headers; avoid
splitting rows where possible. - Preview at actual scale; PDF download
and browser print. - Test long names/register numbers and multi-page
cases. - Provide combined PDF print pack and allocation CSV/XLSX with
exam, room, row, column, position, register number, name, branch,
semester, subject code.

## 5. Suggested data model

-   **Exam:** id, name, date, start/end or duration, session,
    institution/department, status, timestamps.
-   **ExamCandidate:** id, exam_id, register_number (string), name,
    branch, semester, subject_code, source_row. Suggested uniqueness:
    exam_id + register_number for single-paper model.
-   **Room:** id, name, rows, columns, students_per_bench, max_capacity,
    room_order, active.
-   **Bench/Seat:** room_id, row, column, position, available (may be
    derived except blocked positions).
-   **AllocationVersion:** id, exam_id, version, status
    (draft/finalized/superseded), algorithm/version/seed, timestamps,
    validation summary.
-   **SeatAssignment:** allocation_version_id, candidate_id, room_id,
    row, column, position; enforce unique candidate and unique physical
    seat per version.
-   **PrintTemplate:** document type, template version, page settings,
    field/layout configuration, source-file metadata, approval status.
-   **GeneratedDocument (optional):** allocation version, document type,
    timestamp, PDF/storage reference or regeneration metadata.

## 6. UI/navigation

-   Dashboard/exams
-   Exam setup wizard
-   Student import and preview
-   Room manager/grid editor
-   Allocation generation
-   Review/finalize
-   Print pack/documents
-   Template/settings

UX: preserve progress between steps; show inline and summary validation;
use plain terms (room, bench, seat position); confirm destructive
actions; desktop-first for allocation/printing, responsive tablet
support.

## 7. Edge cases

Test empty/unsupported files, missing columns, duplicates, leading
zeros, long/Unicode names, zero candidates/rooms, all seats blocked,
insufficient capacity, invalid room capacity, partial benches,
concentrated subject/branch groups, impossible constraints, search
timeout, invalid manual swaps, changed inputs after allocation, stale
print packs, and large multi-page output.

## 8. Non-functional requirements

-   **Correctness:** independent validator; automated tests for every
    constraint.
-   **Performance target:** import at least 2,000 rows responsively in
    MVP; allocation has progress and a configurable time limit. Confirm
    actual institutional scale.
-   **Privacy/security:** student data is personal data. Protect
    routes/files, validate uploads, never execute macros, avoid logging
    full records, use HTTPS in deployment, define retention and backup.
    Multi-institution deployment requires tenant isolation.
-   **Accessibility:** keyboard-operable forms, labels, clear
    validation, adequate contrast, tabular alternative for seating
    diagram.
-   **Maintainability:** typed domain models, schema validation,
    isolated allocator/validator/renderer, versioned algorithm and
    templates.

## 9. Suggested architecture (stack is open)

A practical option is React + TypeScript, a Node/TypeScript API,
PostgreSQL for multi-user deployment (SQLite may suit a local
single-user prototype), XLSX/CSV parser, and HTML/CSS print templates
rendered to PDF. Keep allocator and validator as independently testable
modules.

The AI coding tool may choose another stack, but must document
persistence, upload processing, constraint enforcement, PDF strategy,
tests, security, and deployment.

## 10. Phased implementation plan

Each phase must produce a runnable, tested increment. Do not generate
the whole application in one step.

### Phase 0 --- Sample inspection and decisions

1.  Obtain and inspect all five sample sheets.
2.  Record fields, labels, ordering, page dimensions/orientation,
    margins, logos, signature areas, grouping, and handwriting space.
3.  Confirm same-bench-only vs neighboring-bench rules.
4.  Confirm physical orientation of seat positions.
5.  Confirm multi-subject student model and output grouping (per
    room/subject/exam).
6.  Confirm expected scale and deployment environment. **Deliverable:**
    decision log, annotated field maps, approved layout sketches.\
    **Exit criteria:** allocation semantics and document field mapping
    are sufficiently unambiguous.

### Phase 1 --- Foundation and exam setup

-   Set up project, formatting/linting, tests, environment, persistence,
    migrations.
-   Implement exam CRUD, status, navigation/wizard. **Acceptance:** exam
    can be created/edited/archived; required/time validation works; data
    survives restart; tests and setup guide pass.

### Phase 2 --- Student import and rooms

-   Implement XLSX/CSV parsing, mapping, preview, row validation,
    corrections, error report.
-   Implement room CRUD and visual bench grid; capacity and blocked-seat
    calculations. **Acceptance:** duplicates/missing data reported;
    leading zeros preserved; room capacity cannot exceed available
    physical seats; grid matches configuration.

### Phase 3 --- Allocation and validator

-   Formalize constraints and unit tests.
-   Implement deterministic constraint-aware allocation, capacity
    pre-check, failure/timeout reporting, room strategy, summary.
-   Implement independent post-allocation validator. **Acceptance:**
    candidates assigned once or explicitly unassigned; capacity and all
    bench constraints pass; validator catches intentionally corrupted
    plans; infeasible/time-limited cases never falsely report success;
    same input/seed reproduces result.

### Phase 4 --- Review, swaps, versions, finalization

-   Room map, candidate lookup, seat locator, manual moves/swaps,
    version history, finalization. **Acceptance:** invalid move is
    blocked with explanation; valid move updates map/summary; finalized
    plan is locked; later changes create a new version and stale prior
    print pack.

### Phase 5 --- Five templates and print pack

-   Implement reusable print/template renderer.
-   Build each form from Phase 0's approved mapping.
-   Add previews, PDFs, combined pack, CSV/XLSX export.
-   Tune page breaks, repeated headers, register-number size,
    handwriting space. **Acceptance:** required fields match approved
    samples; all outputs use same finalized version; no
    clipping/overlap/accidental blank pages in test PDFs; seating
    numbers readable at actual size; attendance fields spacious; room
    plan identifies row/column/position clearly.

### Phase 6 --- End-to-end hardening and deployment

-   Test realistic anonymized exams, edge cases, large output,
    browsers/printers.
-   Add auth if deployed, backups/restore, retention, security review,
    user/deployment guide. **Acceptance:** full workflow works
    end-to-end; backup/restore verified; unauthorized access blocked;
    print instructions and known limitations documented.

### Phase 7 --- Optional enhancements

Adjacent-bench/diagonal rules; roles/approval; timetable clash
detection; invigilator duties; admin template editor; barcode/QR if
requested; room-utilization analytics.

## 11. Test plan

-   **Unit:** normalization, duplicate detection, capacity/blocked
    seats, conflict checks, allocator fixtures, independent validator,
    template mapping.
-   **Integration:** upload→preview→import; persistence;
    generate→validate→save; swap→revalidate; finalize→render correct
    version.
-   **E2E:** typical multi-room exam, capacity shortage, infeasible
    grouping, long values, multi-page forms, all five print previews.
-   Use synthetic/anonymized student records for tests. PDF output is
    the reference for print regression review.

## 12. Definition of done

A feature is done only when requirements, validation/error states,
automated tests, student-data protections, supported-screen behavior,
and print/PDF checks are complete and documentation is updated.

## 13. Instructions to the AI coding tool

Implement one phase at a time. For each phase: state assumptions and
files/modules; implement only that phase; run tests and report results;
provide a manual test checklist. Do not mark future features complete
with mock buttons or placeholder documents.

Do **not** use an LLM to decide final seating. The allocator must be
rule-based, reproducible, and independently validated. When sample forms
are supplied, inspect them and update Phase 0 field maps before Phase 5.
If samples conflict with this PRD, ask for a decision rather than
silently omitting or inventing fields.
