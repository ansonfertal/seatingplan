import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  getUserDisplayName,
  getUserPost,
  PRESET_USERS,
  COMMON_EXAM_POSTS,
  type User,
} from '../src/models/user';
import { useAuthStore } from '../src/store/authStore';
import { UserRoleSwitcher } from '../src/components/auth/UserRoleSwitcher';

describe('Examination Officials: Adding People to Different Posts & Dropdown Selection', () => {
  beforeEach(() => {
    // Reset store to default state with preset users
    useAuthStore.setState({
      currentUser: PRESET_USERS[0],
      users: [...PRESET_USERS],
      isAuthenticated: true,
    });
  });

  describe('User Display & Post Extraction Helpers', () => {
    it('correctly formats display names and extracts posts for preset users', () => {
      const admin = PRESET_USERS[0]; // Dr. Evelyn Reed (Chief Controller)
      const coord = PRESET_USERS[1]; // Prof. Marcus Vance (Exam Coordinator)
      const invig = PRESET_USERS[2]; // Dr. Sarah Jenkins (Hall Invigilator)

      expect(getUserDisplayName(admin)).toBe('Dr. Evelyn Reed');
      expect(getUserPost(admin)).toBe('Chief Controller');

      expect(getUserDisplayName(coord)).toBe('Prof. Marcus Vance');
      expect(getUserPost(coord)).toBe('Exam Coordinator');

      expect(getUserDisplayName(invig)).toBe('Dr. Sarah Jenkins');
      expect(getUserPost(invig)).toBe('Hall Invigilator');
    });

    it('handles custom users with clean names and designated posts', () => {
      const customUser: User = {
        id: 'u-custom-1',
        name: 'Dr. Alan Turing',
        post: 'Chief Superintendent',
        role: 'coordinator',
        email: 'aturing@institution.edu',
        department: 'Computer Science',
      };

      expect(getUserDisplayName(customUser)).toBe('Dr. Alan Turing');
      expect(getUserPost(customUser)).toBe('Chief Superintendent');
    });

    it('falls back to default post based on role if post is unspecified', () => {
      const bareUser: User = {
        id: 'u-bare-1',
        name: 'Prof. John von Neumann',
        role: 'coordinator',
        email: 'jvn@institution.edu',
      };

      expect(getUserDisplayName(bareUser)).toBe('Prof. John von Neumann');
      expect(getUserPost(bareUser)).toBe('Exam Coordinator');
    });
  });

  describe('Adding People to Different Posts', () => {
    it('supports adding a new person to Exam Coordinator post and selects them', () => {
      const store = useAuthStore.getState();

      const newUser = store.addUser({
        name: 'Dr. Jane Goodall',
        post: 'Exam Coordinator',
        role: 'coordinator',
        department: 'Biological Sciences',
        email: 'jgoodall@institution.edu',
      });

      expect(newUser).toBeDefined();
      expect(newUser.name).toBe('Dr. Jane Goodall');
      expect(newUser.post).toBe('Exam Coordinator');
      expect(newUser.role).toBe('coordinator');
      expect(newUser.department).toBe('Biological Sciences');

      // Check store state
      const state = useAuthStore.getState();
      expect(state.users.some((u) => u.id === newUser.id)).toBe(true);
      expect(state.currentUser.id).toBe(newUser.id);
      expect(state.currentUser.name).toBe('Dr. Jane Goodall');
      expect(state.currentUser.post).toBe('Exam Coordinator');
    });

    it('supports adding people to Chief Superintendent and Senior Superintendent posts', () => {
      const store = useAuthStore.getState();

      const chief = store.addUser({
        name: 'Prof. Alistair MacIntyre',
        post: 'Chief Superintendent',
        role: 'coordinator',
        department: 'Mechanical Engineering',
      });

      const senior = store.addUser({
        name: 'Dr. Rebecca Foster',
        post: 'Senior Superintendent',
        role: 'coordinator',
        department: 'Electrical Engineering',
      });

      const state = useAuthStore.getState();
      expect(state.users).toHaveLength(5); // 3 presets + 2 new
      expect(state.users.find((u) => u.id === chief.id)?.post).toBe('Chief Superintendent');
      expect(state.users.find((u) => u.id === senior.id)?.post).toBe('Senior Superintendent');
    });

    it('supports adding people to custom/extensible posts', () => {
      const store = useAuthStore.getState();

      const customOfficial = store.addUser({
        name: 'Dr. Leonard McCoy',
        post: 'External University Squad Observer',
        role: 'invigilator',
        department: 'Medical Sciences',
      });

      expect(customOfficial.post).toBe('External University Squad Observer');
      expect(getUserPost(customOfficial)).toBe('External University Squad Observer');

      const current = useAuthStore.getState().currentUser;
      expect(current.id).toBe(customOfficial.id);
      expect(current.role).toBe('invigilator');
      // Invigilator role permissions
      expect(useAuthStore.getState().can('export:download')).toBe(true);
      expect(useAuthStore.getState().can('seating:generate')).toBe(false);
    });
  });

  describe('Selecting from Dropdown (loginAs)', () => {
    it('allows seamless switching between added officials and presets', () => {
      const store = useAuthStore.getState();

      const person1 = store.addUser({
        name: 'Prof. Katherine Johnson',
        post: 'Chief Superintendent',
        role: 'coordinator',
      });

      const person2 = store.addUser({
        name: 'Dr. Dorothy Vaughan',
        post: 'Exam Cell In-Charge',
        role: 'coordinator',
      });

      // Switch back to original Marcus Vance
      const marcus = store.users.find((u) => u.id === 'user-coord-1')!;
      store.loginAs(marcus.id);
      expect(useAuthStore.getState().currentUser.id).toBe('user-coord-1');
      expect(getUserDisplayName(useAuthStore.getState().currentUser)).toBe('Prof. Marcus Vance');

      // Switch to Katherine Johnson
      store.loginAs(person1.id);
      expect(useAuthStore.getState().currentUser.id).toBe(person1.id);
      expect(getUserDisplayName(useAuthStore.getState().currentUser)).toBe('Prof. Katherine Johnson');
      expect(getUserPost(useAuthStore.getState().currentUser)).toBe('Chief Superintendent');

      // Switch to Dorothy Vaughan
      store.loginAs(person2.id);
      expect(useAuthStore.getState().currentUser.id).toBe(person2.id);
      expect(getUserDisplayName(useAuthStore.getState().currentUser)).toBe('Dr. Dorothy Vaughan');
      expect(getUserPost(useAuthStore.getState().currentUser)).toBe('Exam Cell In-Charge');
    });

    it('allows removing custom added officials without affecting presets or dropping below 1 user', () => {
      const store = useAuthStore.getState();

      const tempUser = store.addUser({
        name: 'Temporary Staff',
        post: 'Hall Invigilator',
        role: 'invigilator',
      });

      expect(useAuthStore.getState().users.some((u) => u.id === tempUser.id)).toBe(true);
      expect(useAuthStore.getState().currentUser.id).toBe(tempUser.id);

      // Remove the temporary user
      store.removeUser(tempUser.id);

      const stateAfter = useAuthStore.getState();
      expect(stateAfter.users.some((u) => u.id === tempUser.id)).toBe(false);
      // Current user should fallback to a valid remaining user
      expect(stateAfter.currentUser).toBeDefined();
      expect(stateAfter.currentUser.id).not.toBe(tempUser.id);
    });
  });

  describe('Standard Common Posts Integrity', () => {
    it('contains all standard institutional posts in COMMON_EXAM_POSTS', () => {
      expect(COMMON_EXAM_POSTS).toContain('Exam Coordinator');
      expect(COMMON_EXAM_POSTS).toContain('Chief Superintendent');
      expect(COMMON_EXAM_POSTS).toContain('Senior Superintendent');
      expect(COMMON_EXAM_POSTS).toContain('Hall Invigilator');
      expect(COMMON_EXAM_POSTS).toContain('Exam Cell In-Charge');
    });
  });

  describe('Component Rendering', () => {
    it('renders the switcher trigger button with active official and post badge', () => {
      const html = renderToStaticMarkup(React.createElement(UserRoleSwitcher));
      expect(html).toContain('Dr. Evelyn Reed');
      expect(html).toContain('Chief Controller');
      expect(html).toContain('admin');
      expect(html).toContain('data-testid="user-role-switcher-container"');
    });
  });
});
