export type UserRole = 'admin' | 'coordinator' | 'invigilator';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
};

export type AppPermission =
  | 'exam:create'
  | 'exam:edit'
  | 'exam:delete'
  | 'students:import'
  | 'students:edit'
  | 'classrooms:edit'
  | 'seating:generate'
  | 'seating:swap'
  | 'seating:finalize'
  | 'export:download'
  | 'admin:users'
  | 'admin:privacy_wipe';

export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  admin: [
    'exam:create',
    'exam:edit',
    'exam:delete',
    'students:import',
    'students:edit',
    'classrooms:edit',
    'seating:generate',
    'seating:swap',
    'seating:finalize',
    'export:download',
    'admin:users',
    'admin:privacy_wipe',
  ],
  coordinator: [
    'exam:create',
    'exam:edit',
    'students:import',
    'students:edit',
    'classrooms:edit',
    'seating:generate',
    'seating:swap',
    'seating:finalize',
    'export:download',
  ],
  invigilator: [
    'export:download', // Read-only access to view and print official attendance and seating notice sheets
  ],
};

export function canUserPerform(role: UserRole, permission: AppPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const PRESET_USERS: User[] = [
  {
    id: 'user-admin-1',
    name: 'Dr. Evelyn Reed (Chief Controller)',
    email: 'controller@institution.edu',
    role: 'admin',
    department: 'Examination Cell',
  },
  {
    id: 'user-coord-1',
    name: 'Prof. Marcus Vance (Exam Coordinator)',
    email: 'coordinator@institution.edu',
    role: 'coordinator',
    department: 'Computer Science',
  },
  {
    id: 'user-invig-1',
    name: 'Dr. Sarah Jenkins (Hall Invigilator)',
    email: 'invigilator@institution.edu',
    role: 'invigilator',
    department: 'Electronics & Communication',
  },
];
