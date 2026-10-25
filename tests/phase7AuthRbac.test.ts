import { describe, expect, it, beforeEach } from 'vitest';
import { canUserPerform, ROLE_PERMISSIONS, type User } from '../src/models/user';
import { useAuthStore } from '../src/store/authStore';

const TEST_USERS: User[] = [
  {
    id: 'test-admin-1',
    name: 'Administrator Profile',
    email: 'admin@institution.edu',
    role: 'admin',
    post: 'Chief Controller',
    department: 'Examination Cell',
  },
  {
    id: 'test-coord-1',
    name: 'Coordinator Profile',
    email: 'coordinator@institution.edu',
    role: 'coordinator',
    post: 'Exam Coordinator',
    department: 'Academic Affairs',
  },
  {
    id: 'test-invig-1',
    name: 'Invigilator Profile',
    email: 'invigilator@institution.edu',
    role: 'invigilator',
    post: 'Hall Invigilator',
    department: 'Science & Humanities',
  },
];

describe('TASK-7.2: Multi-User Authentication & Role-Based Access Control (RBAC)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      currentUser: TEST_USERS[0],
      users: [...TEST_USERS],
      isAuthenticated: true,
    });
  });

  it('enforces strict role permission boundaries according to institutional RBAC policies', () => {
    // Admin permissions
    expect(canUserPerform('admin', 'exam:create')).toBe(true);
    expect(canUserPerform('admin', 'seating:generate')).toBe(true);
    expect(canUserPerform('admin', 'admin:privacy_wipe')).toBe(true);
    expect(canUserPerform('admin', 'export:download')).toBe(true);

    // Coordinator permissions
    expect(canUserPerform('coordinator', 'exam:create')).toBe(true);
    expect(canUserPerform('coordinator', 'seating:generate')).toBe(true);
    expect(canUserPerform('coordinator', 'seating:swap')).toBe(true);
    expect(canUserPerform('coordinator', 'export:download')).toBe(true);
    // Coordinators cannot access system privacy wipe or user administration
    expect(canUserPerform('coordinator', 'admin:privacy_wipe')).toBe(false);
    expect(canUserPerform('coordinator', 'admin:users')).toBe(false);

    // Invigilator permissions (Read-only for examination halls)
    expect(canUserPerform('invigilator', 'export:download')).toBe(true);
    expect(canUserPerform('invigilator', 'exam:create')).toBe(false);
    expect(canUserPerform('invigilator', 'seating:generate')).toBe(false);
    expect(canUserPerform('invigilator', 'seating:swap')).toBe(false);
    expect(canUserPerform('invigilator', 'students:import')).toBe(false);
  });

  it('allows switching user accounts and updates store permissions reactively', () => {
    const store = useAuthStore.getState();

    // Default admin
    expect(store.currentUser?.role).toBe('admin');
    expect(store.can('admin:privacy_wipe')).toBe(true);

    // Switch to coordinator
    store.switchRole('coordinator');
    expect(useAuthStore.getState().currentUser?.role).toBe('coordinator');
    expect(useAuthStore.getState().can('seating:generate')).toBe(true);
    expect(useAuthStore.getState().can('admin:privacy_wipe')).toBe(false);

    // Switch to invigilator
    store.switchRole('invigilator');
    expect(useAuthStore.getState().currentUser?.role).toBe('invigilator');
    expect(useAuthStore.getState().can('seating:generate')).toBe(false);
    expect(useAuthStore.getState().can('seating:swap')).toBe(false);
    expect(useAuthStore.getState().can('export:download')).toBe(true);
  });

  it('supports direct user login by ID with institutional profiles', () => {
    const store = useAuthStore.getState();
    const invigilatorProfile = TEST_USERS.find((u) => u.role === 'invigilator')!;

    store.loginAs(invigilatorProfile.id);

    const current = useAuthStore.getState().currentUser!;
    expect(current.id).toBe(invigilatorProfile.id);
    expect(current.name).toBe(invigilatorProfile.name);
    expect(current.department).toBe(invigilatorProfile.department);
    expect(current.role).toBe('invigilator');
  });
});
