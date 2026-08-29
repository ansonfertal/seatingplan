# PRD — Exam Seating Arrangement Generator

## 1. Product Overview

### Product Name
**Exam Seating Arrangement Generator**

### Product Type
Browser-based web application for generating, validating, viewing, and downloading examination seating arrangements.

### Primary Goal
Allow an examination coordinator to enter examination details, classroom layouts, and a student list, then automatically generate a seating arrangement in which students from the same branch are separated as much as practically possible, while producing an output that resembles the provided Excel sample.

### Key Requirement
The application must work entirely in the browser for the core workflow. No server or database should be required for the first version.

### Reference File

The provided reference workbook is `Sample.xlsx`.

The workbook contains three relevant sheets:

1. **rooms**
   - Contains classroom-wise seating layouts.
   - Each classroom is represented as a visual grid of rows and bench/column positions.
   - The sample includes classrooms such as B301, B306, B307, B407, A220, and A305.
   - Student register numbers are placed into the classroom grid.

2. **Attendance sheet**
   - Contains classroom-wise attendance sheets.
   - Includes fields such as hall number, roll/register number, student name, main sheets, additional sheets, and signature.

3. **Seating Arrangement**
   - Provides a summary of room allocation.
   - Contains columns similar to:
     - Date and Time
     - Class Room No.
     - Branch
     - Roll No.
     - No. of students
     - Total

The generated workbook should preserve the **concept and visual organization** of these sheets rather than simply exporting a plain HTML table.

---

# 2. Problem Statement

Preparing examination seating manually is time-consuming and error-prone.

The coordinator needs to:

- collect examination information;
- identify available classrooms;
- enter classroom dimensions;
- determine seating capacity;
- distribute students among classrooms;
- avoid placing students from the same branch together;
- ensure every student is assigned exactly once;
- produce classroom-wise seating plans;
- produce an overall seating summary;
- produce attendance sheets;
- export the final arrangement in a printable/downloadable format.

The application should automate this process and make errors easy to detect before the final arrangement is downloaded.

---

# 3. Goals

## 3.1 Primary Goals

The application shall:

1. Collect examination details step by step.
2. Collect classroom information.
3. Collect or import student information.
4. Calculate available seating capacity.
5. Generate an optimized seating arrangement.
6. Minimize adjacent students belonging to the same branch.
7. Ensure no student is duplicated or omitted.
8. Display the arrangement visually classroom by classroom.
9. Generate an overall seating summary.
10. Generate attendance sheets.
11. Allow the user to download the result as Excel.
12. Allow the user to download/print a PDF version.
13. Allow the user to regenerate the arrangement with different settings.
14. Provide validation and warnings before export.

## 3.2 Secondary Goals

The application should:

- remember the current arrangement while the user is working;
- support CSV/Excel student import;
- allow manual corrections;
- allow classroom editing;
- provide statistics about branch distribution;
- provide a clear validation report.

---

# 4. Non-Goals for MVP

The first version does **not** need:

- user login;
- cloud database;
- multi-user collaboration;
- institution-wide account management;
- online examination attendance submission;
- biometric attendance;
- automatic integration with a college ERP;
- mobile-native applications.

These can be considered future phases.

---

# 5. Target Users

## Primary User

### Examination Coordinator

Typical workflow:

1. Select/create examination.
2. Enter date and session.
3. Add classrooms.
4. Import student list.
5. Configure seating rules.
6. Generate arrangement.
7. Inspect classroom plans.
8. Correct/rearrange if necessary.
9. Download Excel/PDF.
10. Print and distribute the sheets.

## Secondary Users

- Invigilators
- Department coordinators
- Examination cell staff

---

# 6. Recommended Technology Stack

The application should be a modern client-side web application.

## Frontend

**React + TypeScript + Vite**

Recommended libraries:

- React
- TypeScript
- React Router
- Tailwind CSS
- Zod for validation
- Zustand or React Context for application state

## Excel

Use:

**SheetJS / `xlsx`**

Responsibilities:

- import student CSV/XLSX;
- generate XLSX output;
- create multiple worksheets;
- apply cell values;
- merge cells;
- set column widths;
- set row heights;
- basic formatting.

If the selected Excel library cannot reliably reproduce the reference workbook's advanced formatting in the browser, implement the first version using a clean equivalent layout and keep the export module isolated so a more advanced Excel library can be substituted later.

## PDF

Use one of:

- jsPDF
- pdf-lib
- browser print-to-PDF as fallback

PDF export should prioritize readability and printing.

## Local Storage

Use browser `localStorage` for MVP draft persistence.

Optional later upgrade:

- IndexedDB for larger datasets.

---

# 7. High-Level User Flow

```text
Start
  |
  v
Exam Details
  |
  v
Classrooms
  |
  v
Student List
  |
  v
Seating Rules
  |
  v
Validate Input
  |
  v
Generate Arrangement
  |
  v
Validation / Quality Report
  |
  +----> Regenerate
  |
  v
Preview
  |
  +----> Edit Arrangement
  |
  v
Export
  |
  +----> Excel
  |
  +----> PDF
  |
  v
Finish
```

---

# 8. Application Screens

## Screen 1 — Welcome / Dashboard

Display:

- application name;
- short description;
- `Create New Seating Arrangement`;
- `Open Saved Draft`;
- optionally `Import Existing Data`.

### Actions

- Start New Arrangement
- Continue Draft
- Clear Draft

---

# 9. Screen 2 — Examination Details

The application should collect information step by step.

## Fields

### Examination Name

Example:

`B.Tech S5 Internal Examination`

### Examination Date

Date picker.

### Session

Two options:

- Forenoon
- Afternoon

### Start Time

Optional.

### End Time

Optional.

### Academic Year

Optional.

Example:

`2026-27`

### Semester

Optional.

Example:

`S5`

### Institution Name

Default value can be configured.

Example:

`ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY`

### Institution Location

Example:

`KALAMASSERY`

### Examination Code

Optional.

### Document/Header Code

Optional.

Example:

`AISAT/Form/QPM17/F4`

---

# 10. Screen 3 — Classroom Configuration

The coordinator should be able to add multiple classrooms.

Each classroom is a record.

## Classroom Fields

| Field | Example |
|---|---|
| Classroom/Hall Number | B301 |
| Number of Rows | 7 |
| Number of Bench Columns | 9 |
| Students per Bench | 1 |
| Usable Capacity | Automatically calculated |
| Enabled | Yes |

### Capacity Formula

```text
capacity = rows × columns × studentsPerBench
```

If some benches are unavailable, support an optional disabled-seat configuration.

Example:

```text
Rows = 7
Columns = 9
Students per bench = 1

Capacity = 7 × 9 × 1 = 63
```

---

# 11. Classroom Layout Model

The system must not assume every classroom has the same physical arrangement.

Represent a classroom as:

```typescript
type Classroom = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  studentsPerBench: number;
  disabledSeats?: SeatPosition[];
};
```

A seat should be represented as:

```typescript
type SeatPosition = {
  row: number;
  column: number;
  seatIndex: number;
};
```

For a bench that accommodates two students:

```text
Bench 1
+---------+
| Seat A  |
| Seat B  |
+---------+
```

The UI should support either:

- one student per bench, or
- multiple students per bench.

---

# 12. Classroom Layout Configuration

The user should see a visual grid while configuring the classroom.

Example:

```text
             COLUMN
       1       2       3       4       5

ROW 1 [   ]   [   ]   [   ]   [   ]   [   ]

ROW 2 [   ]   [   ]   [   ]   [   ]   [   ]

ROW 3 [   ]   [   ]   [   ]   [   ]   [   ]

ROW 4 [   ]   [   ]   [   ]   [   ]   [   ]
```

Clicking a position can toggle it as:

- Available
- Unavailable

This is useful for:

- broken benches;
- teacher desk space;
- physical obstructions;
- inaccessible positions.

---

# 13. Screen 4 — Student List

The student list must contain at minimum:

| Field | Required |
|---|---|
| Student Name | Yes |
| Register Number | Yes |
| Branch Code | Yes |

Optional fields:

- Semester
- Section
- Department
- Gender
- Student ID

Example:

| Register No. | Student Name | Branch |
|---|---|---|
| D1CS01 | ABEL SHAJI JOSEPH | CS |
| D1CS02 | ABHINAV P V | CS |
| D1ET01 | STUDENT A | ET |
| D1AM01 | STUDENT B | AM |

---

# 14. Student Import

The user should be able to enter students in three ways.

## Option A — Manual Entry

Editable table with:

- Add Student
- Delete Student
- Edit Student

## Option B — CSV Import

Expected columns:

```csv
Register Number,Student Name,Branch
D1CS01,ABEL SHAJI JOSEPH,CS
D1CS02,ABHINAV P V,CS
D1ET01,STUDENT A,ET
```

## Option C — Excel Import

Support `.xlsx`.

The import wizard should allow column mapping if column names differ.

Example:

```text
Register Number -> Column B
Student Name    -> Column C
Branch          -> Column D
```

---

# 15. Student Validation

Before proceeding, validate:

### Required

- register number exists;
- student name exists;
- branch exists.

### Uniqueness

Register number must be unique.

### Invalid Records

Highlight:

- duplicate register number;
- blank register number;
- blank name;
- blank branch;
- malformed data.

### Import Summary

Example:

```text
Students imported: 180
Valid: 177
Errors: 3
Duplicates: 2
Missing branch: 1
```

The user must fix blocking errors before generating an arrangement.

---

# 16. Capacity Validation

Before generation:

```text
Total students = 180
Total available seats = 189

Unused capacity = 9
```

If:

```text
Total students > Total available seats
```

show:

```text
Cannot generate seating arrangement.

Students: 205
Available seats: 189
Shortage: 16 seats
```

Generation must be blocked until the capacity problem is fixed.

---

# 17. Screen 5 — Seating Rules

The user should be able to configure how strict the branch-separation requirement is.

## Default Rule

Students from the same branch should not be adjacent.

### Default adjacency

Treat the following as adjacent:

- same bench;
- immediate left/right seat;
- immediate front/back position.

For the first version, diagonal adjacency should be configurable.

Recommended default:

```text
Horizontal: Yes
Vertical: Yes
Same bench: Yes
Diagonal: No
```

---

# 18. Stronger Seating Rule

Optional:

### Strict Mode

No same-branch students may occupy any neighboring position, including diagonals.

```text
X X X
X S X
X X X
```

Here all surrounding positions are considered neighbors.

---

# 19. Same-Bench Rule

If a bench seats multiple students, the application must ensure:

```text
Student A = CS
Student B = CS
```

is prohibited when the rule is enabled.

Preferred:

```text
Student A = CS
Student B = ET
```

---

# 20. Distribution Strategy

The seating algorithm should attempt to distribute branches across rooms and seats.

Example:

```text
Branches:

CS = 60
EC = 40
AI = 30
ME = 20
```

The system should avoid creating:

```text
CS CS CS CS
CS CS CS CS
```

and instead aim for:

```text
CS EC AI ME
EC AI ME CS
AI ME CS EC
ME CS EC AI
```

The exact arrangement depends on the number of students and available seats.

---

# 21. Seating Algorithm

The algorithm must be deterministic enough to debug but allow randomized regeneration.

## Phase A — Normalize Data

Convert all input into normalized internal objects.

```typescript
type Student = {
  id: string;
  registerNumber: string;
  name: string;
  branch: string;
};
```

---

## Phase B — Build Seat Graph

Represent each available seat as a node.

Connect two nodes if they are considered adjacent.

Example:

```text
Seat A ---- Seat B
  |            |
Seat C ---- Seat D
```

This graph makes the seating rule independent of the visual UI.

---

# 22. Constraint Definition

For every adjacent pair of seats:

```text
branch(seatA) != branch(seatB)
```

The algorithm should minimize violations if a perfect solution does not exist.

Define:

```text
violationCount =
number of adjacent seat pairs
having the same branch
```

The ideal arrangement has:

```text
violationCount = 0
```

---

# 23. Recommended Initial Algorithm

For MVP, implement a heuristic algorithm rather than an unnecessarily complex solver.

## Step 1 — Group Students by Branch

Example:

```text
CS -> 60
EC -> 40
AI -> 30
ME -> 20
```

## Step 2 — Sort Branches

Process larger branches first.

## Step 3 — Generate Candidate Seats

For each student, evaluate currently empty seats.

## Step 4 — Calculate Local Penalty

For every candidate seat:

```text
penalty =
number of adjacent occupied seats
whose branch equals student's branch
```

Choose the seat with the lowest penalty.

## Step 5 — Tie Breaking

If multiple seats have the same penalty:

1. choose the seat with the lowest total local branch concentration;
2. then use randomized tie breaking.

## Step 6 — Repair

After initial placement, identify violations.

Attempt swaps between students to reduce:

```text
violationCount
```

Repeat until:

- zero violations;
- maximum iterations reached;
- no improvement possible.

---

# 24. Better Algorithm for Larger Datasets

For future versions, support an optimization algorithm.

Possible approaches:

- simulated annealing;
- tabu search;
- constraint programming;
- integer programming;
- OR-Tools;
- graph coloring inspired heuristics.

Do not make OR-Tools a requirement for MVP if it causes browser deployment complexity.

---

# 25. Feasibility Detection

The system must recognize that a zero-violation solution may be mathematically impossible.

For example:

```text
Only CS students
```

cannot satisfy:

```text
No adjacent CS students
```

if there are multiple seats.

Therefore the system should distinguish:

### Perfect

```text
0 violations
```

### Best Possible / Near Perfect

```text
3 violations
```

### Poor

```text
35 violations
```

The application should never falsely claim that the arrangement is conflict-free.

---

# 26. Arrangement Quality Score

Display:

```text
Arrangement Quality: 96%
```

Suggested formula:

```text
score =
100 × (1 - weightedViolations / weightedPossibleConflicts)
```

However, the UI should also show the actual conflict count.

Example:

```text
Quality Score: 96%
Same-branch conflicts: 3
Students assigned: 180 / 180
Unused seats: 9
```

---

# 27. Branch Distribution

Show statistics:

```text
CS: 60
EC: 40
AI: 30
ME: 20
```

Also show per classroom:

```text
B301
CS: 15
EC: 12
AI: 8

B306
CS: 14
EC: 10
AI: 10
```

---

# 28. Room Allocation Strategy

The application should allocate students to classrooms before final seat assignment.

Preferred strategy:

1. calculate total classroom capacities;
2. sort rooms by configured priority;
3. distribute students across rooms;
4. avoid unnecessarily concentrating a single branch in one room;
5. generate the seat arrangement within each room.

A classroom may contain students from multiple branches.

---

# 29. Room-Level Branch Distribution

If possible, avoid:

```text
B301 -> only CS
B306 -> only CS
B307 -> only CS
```

Prefer:

```text
B301 -> CS + EC + AI
B306 -> CS + EC + ME
B307 -> CS + AI + ME
```

This improves both seating diversity and invigilation distribution.

---

# 30. Screen 6 — Generate Arrangement

Button:

**Generate Seating Arrangement**

During generation:

```text
Preparing classroom capacity...
Distributing students...
Optimizing branch separation...
Checking conflicts...
Preparing preview...
```

The process should not appear frozen for larger datasets.

---

# 31. Generated Arrangement Data Model

```typescript
type AssignedSeat = {
  classroomId: string;
  row: number;
  column: number;
  seatIndex: number;
  studentId: string;
};

type SeatingArrangement = {
  exam: ExamDetails;
  classrooms: Classroom[];
  assignments: AssignedSeat[];
  generatedAt: string;
  statistics: ArrangementStatistics;
};
```

---

# 32. Screen 7 — Validation Report

Before displaying the final result, show:

## Summary

```text
Students: 180
Assigned: 180
Unassigned: 0
Duplicate assignments: 0
Available seats: 189
Unused seats: 9
```

## Branch Conflicts

```text
Same-branch adjacent conflicts: 0
```

or:

```text
Same-branch adjacent conflicts: 3
```

## Validation Status

### Green

```text
Arrangement valid
```

### Yellow

```text
Arrangement generated with 3 unavoidable/remaining conflicts.
Review recommended.
```

### Red

```text
Arrangement invalid
```

---

# 33. Screen 8 — Seating Plan Preview

This is the most important screen.

The preview should visually resemble the provided reference workbook.

## Classroom Navigation

Tabs or dropdown:

```text
B301 | B306 | B307 | B407 | A220 | A305
```

Selecting a classroom displays its seating plan.

---

# 34. Classroom Seating Visualization

Example:

```text
                CLASSROOM: B301

                 FRONT / BOARD

        C1        C2        C3        C4

R1    [D1CS01] [D1ET01] [D1AM01] [D1CS02]

R2    [D1ET02] [D1AM02] [D1CS03] [D1ET03]

R3    [D1AM03] [D1CS04] [D1ET04] [D1AM04]

R4    [D1ET05] [D1AM05] [D1CS05] [D1ET06]
```

Each cell should show at minimum:

```text
Register Number
```

Optionally show:

```text
Name
Branch
```

on hover or in a detail panel.

---

# 35. Reference Workbook Layout

The Excel export should follow the conceptual structure of the supplied `Sample.xlsx`.

## Worksheet 1 — `Seating Arrangement`

Columns:

```text
Date and Time
Class Room No.
Branch
Roll No.
No. of students
Total
```

Example:

```text
09-08-2026 FN | B301 | CS | 15 to 29 | 15 | 15
               |      | ET | 1 to 12  | 12 | 12
               | B306 | CS | 1 to 14  | 14 | 14
               |      | AI | ...      | ... | ...
```

The exact roll-number range formatting should not be hard-coded. Generate it from the actual assigned students.

For non-contiguous register numbers, show:

```text
1 to 12, 15, 18 to 20
```

rather than incorrectly displaying a continuous range.

---

# 36. Worksheet 2 — `rooms`

Create a classroom-wise visual seating plan.

Each classroom should have a clearly separated block.

Example:

```text
ALBERTIAN INSTITUTE OF SCIENCE AND TECHNOLOGY
KALAMASSERY

SEATING ARRANGEMENT

Date: 09-08-2026
Session: Forenoon

Class room: B301

        ROW / COLUMN

          1        2        3        4

1       [CS01]   [ET01]   [AM01]   [CS02]
2       [ET02]   [AM02]   [CS03]   [ET03]
3       [AM03]   [CS04]   [ET04]   [AM04]
...
```

The actual workbook may place multiple classrooms side-by-side. For the first implementation, either of the following is acceptable:

### Preferred

One classroom block below another within the same `rooms` worksheet.

### Optional

Multiple classroom blocks horizontally, matching the reference more closely.

The implementation should keep this layout logic isolated so the export can be refined without changing the seating algorithm.

---

# 37. Worksheet 3 — `Attendance sheet`

Generate an attendance sheet for every classroom.

Fields:

```text
Hall No.
Date of Exam
Sl. No.
Roll No.
Name of the student
No. of main sheets
No. of additional sheets
Total Additional Sheet
Signature
```

Example:

```text
Hall No.: B301
Date of Exam: 09-08-2026

Sl. No. | Roll No. | Name                 | Main | Additional | Signature
1       | D1CS15   | HARIKRISHNA K MUKESH |      |            |
2       | D1ET03   | STUDENT NAME         |      |            |
```

Each classroom should have its own attendance section.

---

# 38. Excel Formatting Requirements

The exported workbook should be professional and printable.

Use:

- merged title cells;
- bold headings;
- borders around seating cells;
- centered register numbers;
- readable font;
- appropriate row height;
- appropriate column widths;
- page orientation;
- print area where supported;
- landscape orientation for wide seating layouts;
- repeated headers where practical.

Avoid:

- excessive colors;
- tiny text;
- unnecessary decoration.

---

# 39. PDF Output

PDF should contain:

## Page 1+

Seating Arrangement Summary

## Subsequent Pages

One classroom per page where practical.

Each page should contain:

```text
Institution
Examination
Date
Session
Classroom
Seating grid
```

The classroom grid must remain readable when printed.

## Attendance

Attendance sheets may follow the seating pages.

---

# 40. Download Options

Provide:

```text
Download Excel
Download PDF
Print
```

Optional:

```text
Download ZIP
```

where the ZIP contains:

```text
Seating_Arrangement.xlsx
Seating_Arrangement.pdf
```

---

# 41. Manual Editing

The coordinator should be able to manually change a student's seat after generation.

Example:

```text
B301 / Row 2 / Column 3
D1CS05
```

can be swapped with:

```text
B301 / Row 3 / Column 4
D1ET05
```

After a manual edit, automatically re-run validation.

Display:

```text
Arrangement modified manually.
Current conflicts: 1
```

Do not silently assume the modified arrangement remains valid.

---

# 42. Student Search

Add search functionality:

```text
Search register number...
Search student name...
```

Result:

```text
D1CS15
HARIKRISHNA K MUKESH
Room: B301
Row: 1
Column: 2
Seat: 1
```

This is particularly useful for examination staff.

---

# 43. Classroom Search

Allow:

```text
Search classroom...
```

and quickly jump to a classroom's plan.

---

# 44. Swap Function

A useful UI feature:

1. Select Student A.
2. Select Student B.
3. Click `Swap`.
4. Revalidate.

Example:

```text
Swap D1CS05 ↔ D1ET05
```

Show the impact:

```text
Before: 2 conflicts
After: 0 conflicts
```

---

# 45. Regenerate Function

Button:

**Regenerate**

Optional setting:

```text
Randomization level
Low
Medium
High
```

The same input may generate different valid arrangements when multiple valid arrangements exist.

The seed should be stored for reproducibility.

```typescript
generationSeed: number;
```

---

# 46. Undo / Redo

Support:

- Undo last manual swap
- Redo

This can be implemented using a simple arrangement history stack.

---

# 47. Draft Persistence

Save the current state automatically in browser storage.

Save:

- exam details;
- classrooms;
- students;
- seating rules;
- generated arrangement;
- generation seed.

Display:

```text
Last saved: 07:15 AM
```

---

# 48. Import/Export Project File

Optional but recommended.

Allow:

```text
Save Project
Load Project
```

Use JSON.

Example:

```text
exam-seating-project.json
```

This is different from the final Excel export.

---

# 49. Error Handling

The application must provide human-readable errors.

Bad:

```text
TypeError: Cannot read properties of undefined
```

Good:

```text
Unable to generate the arrangement because classroom B301 has 0 available seats.
```

---

# 50. Important Validation Rules

The application must block generation if:

1. exam date is missing;
2. examination name is missing;
3. no classrooms exist;
4. all classrooms are disabled;
5. student list is empty;
6. student has missing register number;
7. student has missing name;
8. student has missing branch;
9. duplicate register numbers exist;
10. capacity is insufficient.

---

# 51. Non-Blocking Warnings

Warnings should not necessarily block generation.

Examples:

```text
Only one branch is present.
A perfect no-adjacent arrangement may be impossible.
```

```text
Classroom B301 has 20% unused capacity.
```

```text
3 same-branch conflicts remain after optimization.
```

---

# 52. Accessibility

The application should support:

- keyboard navigation;
- visible focus states;
- readable font sizes;
- sufficient contrast;
- screen-reader-friendly labels;
- accessible form errors.

---

# 53. Responsive Design

Desktop is the primary target.

The application should also work on tablets.

Mobile support is desirable but not the primary target because seating grids and Excel-like tables are naturally wide.

On small screens:

- allow horizontal scrolling for seating grids;
- keep action buttons accessible;
- use collapsible sections.

---

# 54. UI Design

Recommended visual style:

- clean academic/administrative interface;
- white/light background;
- restrained use of color;
- cards for each wizard step;
- progress indicator.

Example:

```text
1 Exam Details
   ↓
2 Classrooms
   ↓
3 Students
   ↓
4 Rules
   ↓
5 Generate
   ↓
6 Review
   ↓
7 Export
```

---

# 55. Wizard Navigation

Buttons:

```text
Back
Save & Continue
```

Final step:

```text
Generate Arrangement
```

Do not allow the user to accidentally lose entered data when navigating backward.

---

# 56. State Management

Recommended state:

```typescript
type AppState = {
  exam: ExamDetails;
  classrooms: Classroom[];
  students: Student[];
  rules: SeatingRules;
  arrangement?: SeatingArrangement;
  validation?: ValidationReport;
};
```

The state should be serializable so it can be saved to JSON/localStorage.

---

# 57. Suggested Project Structure

```text
exam-seating-generator/
│
├── src/
│   ├── components/
│   │   ├── wizard/
│   │   ├── exam/
│   │   ├── classrooms/
│   │   ├── students/
│   │   ├── seating/
│   │   ├── preview/
│   │   └── export/
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ExamDetails.tsx
│   │   ├── Classrooms.tsx
│   │   ├── Students.tsx
│   │   ├── Rules.tsx
│   │   ├── Generate.tsx
│   │   ├── Review.tsx
│   │   └── Export.tsx
│   │
│   ├── models/
│   │   ├── exam.ts
│   │   ├── classroom.ts
│   │   ├── student.ts
│   │   └── arrangement.ts
│   │
│   ├── algorithms/
│   │   ├── roomAllocation.ts
│   │   ├── seatGraph.ts
│   │   ├── seatingGenerator.ts
│   │   ├── optimizer.ts
│   │   └── validator.ts
│   │
│   ├── export/
│   │   ├── excelExporter.ts
│   │   ├── pdfExporter.ts
│   │   └── formatting.ts
│   │
│   ├── import/
│   │   ├── csvImporter.ts
│   │   └── excelImporter.ts
│   │
│   ├── storage/
│   │   └── draftStorage.ts
│   │
│   └── utils/
│
├── public/
│
├── tests/
│   ├── seatingGenerator.test.ts
│   ├── validator.test.ts
│   ├── roomAllocation.test.ts
│   └── export.test.ts
│
├── package.json
└── README.md
```

---

# 58. Phase-Based Development Plan

The AI coding tool must implement the project incrementally.

Do **not** attempt to build every feature in one pass.

---

# PHASE 0 — Project Setup

## Objective

Create a working React/TypeScript application.

## Tasks

1. Initialize Vite React TypeScript project.
2. Add Tailwind CSS.
3. Add routing if needed.
4. Create application shell.
5. Create header and navigation.
6. Create wizard progress indicator.
7. Create placeholder pages.

## Deliverable

The application runs locally with:

```bash
npm install
npm run dev
```

and displays the wizard.

## Acceptance Criteria

- Application loads without errors.
- Navigation works.
- No backend is required.
- TypeScript compiles successfully.

---

# PHASE 1 — Exam Details

## Objective

Implement examination information entry.

## Tasks

Build:

- exam name;
- date;
- session;
- time;
- academic year;
- semester;
- institution;
- document codes.

Implement:

- validation;
- next/back navigation;
- state persistence.

## Acceptance Criteria

The user can complete the Exam Details screen and continue.

---

# PHASE 2 — Classroom Management

## Objective

Implement classroom configuration.

## Tasks

Create:

- classroom list;
- add classroom;
- edit classroom;
- delete classroom;
- rows;
- columns;
- students per bench;
- capacity calculation.

Create visual seating grid.

Allow seats to be disabled.

## Acceptance Criteria

For:

```text
Rows = 7
Columns = 9
Students per bench = 1
```

the application displays:

```text
Capacity = 63
```

and renders 63 available seats unless some are disabled.

---

# PHASE 3 — Student Management

## Objective

Implement student input/import.

## Tasks

1. Manual table.
2. Add/edit/delete student.
3. CSV import.
4. Excel import.
5. Column mapping.
6. Validation.
7. Duplicate detection.
8. Branch statistics.

## Acceptance Criteria

A 180-student Excel file can be imported and validated.

---

# PHASE 4 — Capacity and Rule Validation

## Objective

Build the validation engine.

## Tasks

Implement:

- capacity calculation;
- missing-data checks;
- duplicate checks;
- seating-rule configuration;
- adjacency definition.

## Acceptance Criteria

The system correctly identifies:

```text
Students > Seats
```

and prevents generation.

---

# PHASE 5 — Basic Seating Algorithm

## Objective

Implement the first working seating generator.

## Tasks

1. Build seat graph.
2. Group students by branch.
3. Allocate students.
4. Calculate local penalties.
5. Assign seats.
6. Count conflicts.
7. Produce arrangement object.

## Acceptance Criteria

For a feasible test dataset, the generator should produce:

- all students assigned;
- no duplicate assignments;
- no seat assigned twice;
- branch conflicts minimized;
- repeatable result using a fixed seed.

---

# PHASE 6 — Optimization and Repair

## Objective

Improve arrangement quality.

## Tasks

Implement:

- swap-based repair;
- multiple iterations;
- random restarts;
- best-arrangement tracking.

Pseudo-process:

```text
Generate arrangement
        ↓
Calculate conflicts
        ↓
Find possible swaps
        ↓
Perform improving swap
        ↓
Recalculate
        ↓
Repeat
```

Stop when:

```text
conflicts == 0
```

or no improvement is possible.

## Acceptance Criteria

The optimizer must never increase the conflict count when accepting a repair move.

---

# PHASE 7 — Seating Plan UI

## Objective

Create the visual classroom plan.

## Tasks

1. Classroom tabs.
2. Seating grid.
3. Row/column labels.
4. Student cards.
5. Branch indicator.
6. Search student.
7. Classroom navigation.
8. Hover/detail panel.

## Acceptance Criteria

The browser preview clearly shows exactly where every student sits.

---

# PHASE 8 — Manual Editing

## Objective

Allow the coordinator to make corrections.

## Tasks

Implement:

- select seat;
- select student;
- swap students;
- move student;
- undo;
- redo;
- automatic validation.

## Acceptance Criteria

Any manual change immediately updates:

- assignment;
- conflict count;
- validation status.

---

# PHASE 9 — Seating Summary

## Objective

Build the equivalent of the reference workbook's `Seating Arrangement` sheet.

## Tasks

Generate:

- exam date/time;
- classroom;
- branch;
- register number ranges;
- student count;
- totals.

## Acceptance Criteria

The summary correctly reflects the generated arrangement.

---

# PHASE 10 — Excel Export

## Objective

Generate the reference-style workbook.

## Workbook

Create:

1. `Seating Arrangement`
2. `rooms`
3. `Attendance sheet`

## Tasks

### Seating Arrangement

Generate summary table.

### rooms

Generate visual classroom grids.

### Attendance sheet

Generate classroom-wise attendance records.

## Formatting

Implement:

- merged titles;
- borders;
- widths;
- row heights;
- alignment;
- print settings where supported.

## Acceptance Criteria

Opening the downloaded XLSX in Microsoft Excel shows all three sheets with correct data.

---

# PHASE 11 — PDF Export

## Objective

Create printable output.

## Tasks

Generate:

- summary;
- classroom seating plans;
- attendance sheets.

## Acceptance Criteria

PDF is readable on A4 paper.

---

# PHASE 12 — Draft Persistence

## Objective

Prevent accidental loss of work.

## Tasks

Implement:

- auto-save;
- restore draft;
- clear draft;
- JSON project export/import.

## Acceptance Criteria

Refreshing the browser does not lose an active draft unless the user explicitly clears it.

---

# PHASE 13 — Final QA

## Objective

Verify correctness.

## Test Dataset

Create a test dataset containing:

```text
Students: 60
Branches:
CS = 20
EC = 15
AI = 15
ME = 10
```

Classrooms:

```text
B301 = 5 × 6 = 30 seats
B306 = 5 × 6 = 30 seats
```

Total:

```text
60 seats
```

## Test Cases

### Test 1

All students assigned.

### Test 2

No duplicate assignments.

### Test 3

No duplicate register numbers.

### Test 4

Insufficient capacity.

### Test 5

One branch only.

### Test 6

Multiple students per bench.

### Test 7

Disabled seats.

### Test 8

Manual swap.

### Test 9

Excel export.

### Test 10

PDF export.

### Test 11

Reload browser.

### Test 12

Search student.

---

# 59. Important Algorithmic Edge Cases

## Case 1 — More students from one branch than alternating positions

The system may not be able to achieve zero conflicts.

It must report this rather than fail silently.

---

## Case 2 — Only one branch

Generate the best possible arrangement and report conflicts.

---

## Case 3 — Two branches with equal numbers

The algorithm should normally be able to produce strong separation if sufficient seats exist.

---

## Case 4 — Multiple classrooms

The algorithm should consider room boundaries.

A student at the last column of one room is not adjacent to the first column of another room.

---

## Case 5 — Disabled seats

Disabled seats must not participate in:

- assignment;
- adjacency;
- capacity.

---

## Case 6 — Multiple students per bench

Seats on the same bench should be considered adjacent according to the selected rule.

---

# 60. Data Integrity Rules

At all times:

```text
numberOfAssignedStudents
=
numberOfStudents
-
numberOfUnassignedStudents
```

Every student must have:

```text
exactly 0 or 1 assigned seats
```

Every available seat must have:

```text
at most 1 student
```

---

# 61. Security and Privacy

Since the application processes student personal information, the default architecture should keep data local to the user's browser.

The MVP should:

- not upload student data to a server;
- not transmit student data to third-party APIs;
- not use external AI services for seating generation;
- not log student names/register numbers to analytics.

If analytics are introduced later, they must not include personally identifiable student data.

---

# 62. Performance Requirements

The application should comfortably handle:

- 500 students;
- 50 classrooms;
- several thousand seats.

The seating algorithm should not freeze the UI.

If necessary:

- use Web Workers for large optimization jobs;
- display progress;
- allow cancellation.

---

# 63. Accessibility and Print Requirements

The final output is primarily an administrative/print document.

The export should be more important than screen decoration.

Ensure:

- high readability;
- large enough register numbers;
- clear row/column labels;
- clear classroom labels;
- page breaks between classrooms when appropriate.

---

# 64. Future Enhancements

Potential future features:

1. User authentication.
2. Cloud storage.
3. College/department profiles.
4. Saved classroom templates.
5. Saved branch templates.
6. Multiple examinations.
7. Exam timetable integration.
8. ERP integration.
9. QR code on seating plan.
10. QR-based student lookup.
11. Invigilator assignment.
12. Invigilator attendance.
13. Automatic room allocation based on building.
14. Accessibility-aware seating.
15. Special-needs seating.
16. Advanced constraint solver.
17. Historical seating arrangements.
18. Seat rotation across examinations.
19. Anti-copying optimization using subject/course information.
20. Department-wise analytics.

---

# 65. Important Design Decision — Subject/Branch Separation

The MVP should focus on **branch-based separation**.

However, the data model should be extensible.

Future rules may include:

```text
No same branch
No same subject
No same section
No same elective
No same batch
```

Therefore define a generic concept:

```typescript
type ConstraintRule = {
  id: string;
  name: string;
  enabled: boolean;
  weight: number;
};
```

Do not hard-code the entire algorithm around `branch === branch`.

---

# 66. Recommended MVP Scope

The first production-worthy version should contain:

### Must Have

- exam details;
- classroom management;
- student manual entry;
- Excel/CSV import;
- capacity validation;
- branch separation;
- seating generation;
- conflict detection;
- seating preview;
- student search;
- Excel export;
- PDF export;
- attendance sheet;
- seating summary;
- local draft persistence.

### Should Have

- manual swap;
- undo/redo;
- regeneration;
- quality score;
- disabled seats.

### Could Have

- JSON project export;
- advanced optimization;
- ZIP export;
- configurable diagonal rules.

---

# 67. AI Coding Tool Instructions

The AI coding tool should follow these rules.

## Rule 1 — Build Phase by Phase

Do not implement all phases at once.

Complete one phase, test it, then continue.

## Rule 2 — Keep Modules Independent

The following must be independently testable:

```text
Student validation
Room allocation
Seat graph construction
Seating generation
Conflict validation
Excel export
PDF export
```

## Rule 3 — Never Put Algorithm Logic in React Components

Bad:

```typescript
function SeatingPage() {
  // 500 lines of seating algorithm
}
```

Good:

```typescript
const result = generateSeatingArrangement(
  students,
  classrooms,
  rules,
  seed
);
```

## Rule 4 — Test the Algorithm Independently

Create unit tests for:

- adjacency;
- conflicts;
- capacity;
- assignment uniqueness;
- optimization.

## Rule 5 — Preserve the Data Model

UI changes must not require rewriting the seating algorithm.

---

# 68. Definition of Done

The project is considered complete when a user can perform this workflow without developer intervention:

```text
Open application
      ↓
Enter examination details
      ↓
Add classrooms
      ↓
Import student Excel file
      ↓
Validate students
      ↓
Generate seating arrangement
      ↓
Review branch conflicts
      ↓
View classroom seating plans
      ↓
Search students
      ↓
Optionally swap students
      ↓
Download Excel
      ↓
Download PDF
      ↓
Print and use the sheets
```

---

# 69. Final Acceptance Scenario

Use this exact end-to-end scenario during final testing.

## Examination

```text
Name:
B.Tech Internal Examination

Date:
09-08-2026

Session:
Forenoon
```

## Rooms

```text
B301
Rows: 7
Columns: 9
Students per bench: 1

B306
Rows: 7
Columns: 9
Students per bench: 1
```

Capacity:

```text
63 + 63 = 126
```

## Students

Import at least:

```text
120 students
```

from three or more branches.

## Expected Result

The system must:

1. assign all 120 students;
2. use no seat twice;
3. identify 126 available seats;
4. leave 6 seats unused;
5. minimize same-branch adjacency;
6. report the exact conflict count;
7. show B301 and B306 separately;
8. generate a seating summary;
9. generate attendance sheets;
10. generate an Excel workbook;
11. generate a printable PDF.

---

# 70. Final Product Principle

The most important principle is:

> **Correctness before aesthetics.**

The application must never produce a visually attractive seating plan that contains:

- missing students;
- duplicate students;
- duplicate seats;
- incorrect classroom capacity;
- incorrect register numbers;
- falsely reported zero conflicts.

Every generated arrangement must be validated before export.

The final output should make the examination coordinator confident that the arrangement is complete, auditable, printable, and consistent with the supplied student and classroom data.
