import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppPermission, User, UserRole } from '../models/user';
import { canUserPerform, PRESET_USERS } from '../models/user';

export type AuthState = {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  loginAs: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  can: (permission: AppPermission) => boolean;
  logout: () => void;
};

const safeStorage = {
  getItem: (name: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(name);
    }
    return null;
  },
  setItem: (name: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(name, value);
    }
  },
  removeItem: (name: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(name);
    }
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: PRESET_USERS[0], // Defaults to Admin
      users: PRESET_USERS,
      isAuthenticated: true,

      loginAs: (userId: string) => {
        const found = get().users.find((u) => u.id === userId);
        if (found) {
          set({ currentUser: found, isAuthenticated: true });
        }
      },

      switchRole: (role: UserRole) => {
        const matching = get().users.find((u) => u.role === role);
        if (matching) {
          set({ currentUser: matching, isAuthenticated: true });
        } else {
          // If no preset user with role exists, update current user role
          set((state) => ({
            currentUser: { ...state.currentUser, role },
            isAuthenticated: true,
          }));
        }
      },

      can: (permission: AppPermission) => {
        const role = get().currentUser.role;
        return canUserPerform(role, permission);
      },

      logout: () => {
        set({ isAuthenticated: false });
      },
    }),
    {
      name: 'exam-auth-storage',
      storage: {
        getItem: (name) => {
          const str = safeStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => safeStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => safeStorage.removeItem(name),
      },
    }
  )
);
