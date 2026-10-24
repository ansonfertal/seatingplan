export type UserRole = 'admin' | 'coordinator' | 'invigilator';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  post?: string;
  department?: string;
  avatarUrl?: string;
};

export const COMMON_EXAM_POSTS = [
  'Exam Coordinator',
  'Chief Superintendent',
  'Senior Superintendent',
  'Assistant Exam Coordinator',
  'Hall Invigilator',
  'Exam Cell In-Charge',
  'Observer / Squad Member',
  'Chief Controller',
] as const;

export function getUserDisplayName(user: { name: string }): string {
  if (!user || !user.name) return 'Unknown User';
  // Strip trailing (Post) if present in the legacy preset name format
  return user.name.replace(/\s*\([^)]*\)$/, '').trim();
}

export function getUserPost(user: { name: string; post?: string; role: UserRole }): string {
  if (!user) return 'Staff';
  if (user.post && user.post.trim().length > 0) {
    return user.post.trim();
  }
  // Try extracting from name format "Name (Post)"
  const match = user.name.match(/\(([^)]+)\)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Fallback based on system role
  switch (user.role) {
    case 'admin':
      return 'Chief Controller';
    case 'coordinator':
      return 'Exam Coordinator';
    case 'invigilator':
      return 'Hall Invigilator';
    default:
      return 'Exam Official';
  }
}

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
    post: 'Chief Controller',
    department: 'Examination Cell',
  },
  {
    id: 'user-coord-1',
    name: 'Prof. Marcus Vance (Exam Coordinator)',
    email: 'coordinator@institution.edu',
    role: 'coordinator',
    post: 'Exam Coordinator',
    department: 'Computer Science',
  },
  {
    id: 'user-invig-1',
    name: 'Dr. Sarah Jenkins (Hall Invigilator)',
    email: 'invigilator@institution.edu',
    role: 'invigilator',
    post: 'Hall Invigilator',
    department: 'Electronics & Communication',
  },
];
