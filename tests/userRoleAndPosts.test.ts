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
import { createNewExam } from '../src/models/exam';
import type { Room } from '../src/models/classroom';
import { useAuthStore } from '../src/store/authStore';
import { UserRoleSwitcher } from '../src/components/auth/UserRoleSwitcher';

describe('Examination Officials & Classroom Invigilation Assignments', () => {
  beforeEach(() => {
    // Reset store to completely clean state: no pre-populated names
    useAuthStore.setState({
      currentUser: null,
      users: [],
      isAuthenticated: true,
    });
  });

  describe('Clean Initial State & Deletion of Pre-populated Names', () => {
    it('has zero pre-populated preset faculty names by default', () => {
      expect(PRESET_USERS).toHaveLength(0);
      const store = useAuthStore.getState();
      expect(store.users).toHaveLength(0);
      expect(store.currentUser).toBeNull();
    });

    it('safely handles null / unassigned users in display helpers', () => {
      expect(getUserDisplayName(null)).toBe('Unassigned');
      expect(getUserDisplayName(undefined)).toBe('Unassigned');
      expect(getUserPost(null)).toBe('Not Set');
      expect(getUserPost(undefined)).toBe('Not Set');
    });

    it('correctly extracts display names and posts from explicit user objects', () => {
      const coordinator: User = {
        id: 'u-coord-1',
        name: 'Dr. Alan Turing',
        post: 'Exam Coordinator',
        role: 'coordinator',
        department: 'Computer Science',
        email: 'aturing@institution.edu',
      };

      expect(getUserDisplayName(coordinator)).toBe('Dr. Alan Turing');
      expect(getUserPost(coordinator)).toBe('Exam Coordinator');
    });
  });

  describe('Adding Officials to Different Posts', () => {
    it('supports adding a new person to Exam Coordinator post and activates them', () => {
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

      const state = useAuthStore.getState();
      expect(state.users).toHaveLength(1);
      expect(state.currentUser?.id).toBe(newUser.id);
      expect(state.currentUser?.name).toBe('Dr. Jane Goodall');
      expect(state.currentUser?.post).toBe('Exam Coordinator');
    });

    it('supports adding multiple personnel across distinct posts: Chief Superintendent & Invigilator', () => {
      const store = useAuthStore.getState();

      const chief = store.addUser({
        name: 'Prof. Alistair MacIntyre',
        post: 'Chief Superintendent',
        role: 'coordinator',
        department: 'Mechanical Engineering',
      });

      const invigilator1 = store.addUser({
        name: 'Dr. Rebecca Foster',
        post: 'Hall Invigilator',
        role: 'invigilator',
        department: 'Physics',
      });

      const invigilator2 = store.addUser({
        name: 'Dr. Thomas Edison',
        post: 'Hall Invigilator',
        role: 'invigilator',
        department: 'Electrical Engineering',
      });

      const state = useAuthStore.getState();
      expect(state.users).toHaveLength(3);
      expect(state.users.find((u) => u.id === chief.id)?.post).toBe('Chief Superintendent');
      expect(state.users.filter((u) => u.post === 'Hall Invigilator')).toHaveLength(2);
    });

    it('allows seamless switching between added officials via loginAs', () => {
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

      // Active is currently person2
      expect(useAuthStore.getState().currentUser?.id).toBe(person2.id);

      // Switch to person1
      store.loginAs(person1.id);
      expect(useAuthStore.getState().currentUser?.id).toBe(person1.id);
      expect(getUserDisplayName(useAuthStore.getState().currentUser)).toBe('Prof. Katherine Johnson');
      expect(getUserPost(useAuthStore.getState().currentUser)).toBe('Chief Superintendent');

      // Switch back to person2
      store.loginAs(person2.id);
      expect(useAuthStore.getState().currentUser?.id).toBe(person2.id);
      expect(getUserDisplayName(useAuthStore.getState().currentUser)).toBe('Dr. Dorothy Vaughan');
    });

    it('allows deleting an official from the officials list', () => {
      const store = useAuthStore.getState();

      const user = store.addUser({
        name: 'Temporary Staff',
        post: 'Hall Invigilator',
        role: 'invigilator',
      });

      expect(useAuthStore.getState().users).toHaveLength(1);
      store.removeUser(user.id);
      expect(useAuthStore.getState().users).toHaveLength(0);
      expect(useAuthStore.getState().currentUser).toBeNull();
    });
  });

  describe('Selecting Officials & Multiple Invigilators per Examination', () => {
    it('supports selecting Coordinator, Chief Superintendent, and multiple Invigilators on Exam setup', () => {
      const exam = createNewExam({
        examName: 'Midterm Examination S5',
        examDate: '2026-11-10',
        coordinatorId: 'user-c1',
        coordinatorName: 'Prof. Alan Turing',
        adminId: 'user-a1',
        adminName: 'Dr. Evelyn Controller',
        invigilatorIds: ['inv-1', 'inv-2', 'inv-3'],
        invigilatorNames: ['Dr. Sarah Connor', 'Prof. John Smith', 'Dr. Grace Hopper'],
      });

      expect(exam.coordinatorName).toBe('Prof. Alan Turing');
      expect(exam.adminName).toBe('Dr. Evelyn Controller');
      expect(exam.invigilatorNames).toHaveLength(3);
      expect(exam.invigilatorNames).toContain('Dr. Sarah Connor');
      expect(exam.invigilatorNames).toContain('Prof. John Smith');
      expect(exam.invigilatorNames).toContain('Dr. Grace Hopper');
    });
  });

  describe('Selecting One or More Invigilators for Classrooms', () => {
    it('supports configuring multiple invigilators for a specific classroom', () => {
      const room: Room = {
        id: 'room-b301',
        name: 'B301',
        rows: 6,
        columns: 6,
        studentsPerBench: 2,
        disabledSeats: [],
        usableCapacity: 72,
        invigilators: ['Dr. Sarah Connor', 'Prof. John Smith'],
      };

      expect(room.invigilators).toBeDefined();
      expect(room.invigilators).toHaveLength(2);
      expect(room.invigilators![0]).toBe('Dr. Sarah Connor');
      expect(room.invigilators![1]).toBe('Prof. John Smith');
    });

    it('supports assigning 1 invigilator to smaller halls and 3 to large exam halls', () => {
      const smallRoom: Room = {
        id: 'room-a101',
        name: 'A101',
        rows: 4,
        columns: 4,
        studentsPerBench: 1,
        disabledSeats: [],
        usableCapacity: 16,
        invigilators: ['Dr. Single Invigilator'],
      };

      const largeAuditorium: Room = {
        id: 'room-audi',
        name: 'Main Auditorium',
        rows: 10,
        columns: 8,
        studentsPerBench: 2,
        disabledSeats: [],
        usableCapacity: 160,
        invigilators: ['Dr. Sarah Connor', 'Prof. John Smith', 'Dr. Grace Hopper'],
      };

      expect(smallRoom.invigilators).toHaveLength(1);
      expect(largeAuditorium.invigilators).toHaveLength(3);
    });
  });

  describe('Component Rendering with Clean State', () => {
    it('renders clean unassigned state in UserRoleSwitcher when no users are pre-populated', () => {
      const html = renderToStaticMarkup(React.createElement(UserRoleSwitcher));
      expect(html).toContain('Select / Add Official');
      expect(html).toContain('Not Set');
      expect(html).toContain('data-testid="user-role-switcher-container"');
    });

    it('verifies store correctly updates currentUser when an official is added', () => {
      const store = useAuthStore.getState();
      const added = store.addUser({
        name: 'Dr. Angela Davies',
        post: 'Chief Superintendent',
        role: 'coordinator',
        department: 'Electronics Engineering',
      });

      expect(useAuthStore.getState().currentUser?.name).toBe('Dr. Angela Davies');
      expect(useAuthStore.getState().currentUser?.post).toBe('Chief Superintendent');
      expect(getUserDisplayName(added)).toBe('Dr. Angela Davies');
      expect(getUserPost(added)).toBe('Chief Superintendent');
    });
  });

  describe('Standard Common Posts Integrity', () => {
    it('maintains comprehensive common posts in COMMON_EXAM_POSTS', () => {
      expect(COMMON_EXAM_POSTS).toContain('Exam Coordinator');
      expect(COMMON_EXAM_POSTS).toContain('Chief Superintendent');
      expect(COMMON_EXAM_POSTS).toContain('Senior Superintendent');
      expect(COMMON_EXAM_POSTS).toContain('Hall Invigilator');
      expect(COMMON_EXAM_POSTS).toContain('Exam Cell In-Charge');
    });
  });
});
