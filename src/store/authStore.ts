import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppPermission, User, UserRole } from '../models/user';
import { canUserPerform } from '../models/user';

export type AuthState = {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  loginAs: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  addUser: (person: {
    name: string;
    post: string;
    role: UserRole;
    department?: string;
    email?: string;
  }) => User;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  can: (permission: AppPermission) => boolean;
  logout: () => void;
};

// Purge any legacy pre-populated dummy users (Evelyn Reed, Marcus Vance, Sarah Jenkins)
function filterLegacyPresets(usersList: User[]): User[] {
  if (!Array.isArray(usersList)) return [];
  return usersList.filter(
    (u) =>
      u &&
      u.id !== 'user-admin-1' &&
      u.id !== 'user-coord-1' &&
      u.id !== 'user-invig-1' &&
      !u.name?.includes('Evelyn Reed') &&
      !u.name?.includes('Marcus Vance') &&
      !u.name?.includes('Sarah Jenkins')
  );
}

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
      currentUser: null,
      users: [],
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
          set((state) => ({
            currentUser: state.currentUser ? { ...state.currentUser, role } : null,
            isAuthenticated: true,
          }));
        }
      },

      addUser: (person: {
        name: string;
        post: string;
        role: UserRole;
        department?: string;
        email?: string;
      }) => {
        const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const trimmedName = person.name.trim();
        const trimmedPost = person.post.trim();
        const cleanEmail =
          person.email && person.email.trim().length > 0
            ? person.email.trim()
            : `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'staff'}@institution.edu`;

        const newUser: User = {
          id,
          name: trimmedName,
          post: trimmedPost,
          role: person.role,
          department: person.department?.trim() || 'Academic Affairs',
          email: cleanEmail,
        };

        set((state) => ({
          users: [...state.users, newUser],
          currentUser: newUser,
          isAuthenticated: true,
        }));

        return newUser;
      },

      removeUser: (userId: string) => {
        const state = get();
        const filtered = state.users.filter((u) => u.id !== userId);
        const newCurrent = state.currentUser?.id === userId ? filtered[0] || null : state.currentUser;

        set({
          users: filtered,
          currentUser: newCurrent,
        });
      },

      updateUser: (userId: string, updates: Partial<User>) => {
        set((state) => {
          const updatedUsers = state.users.map((u) => (u.id === userId ? { ...u, ...updates } : u));
          const updatedCurrent =
            state.currentUser?.id === userId ? { ...state.currentUser, ...updates } : state.currentUser;
          return {
            users: updatedUsers,
            currentUser: updatedCurrent,
          };
        });
      },

      can: (permission: AppPermission) => {
        const current = get().currentUser;
        if (!current) return true; // Default open access before configuring specific RBAC users
        return canUserPerform(current.role, permission);
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
          if (!str) return null;
          try {
            const parsed = JSON.parse(str);
            if (parsed?.state?.users) {
              parsed.state.users = filterLegacyPresets(parsed.state.users);
              if (
                parsed.state.currentUser &&
                !parsed.state.users.some((u: User) => u.id === parsed.state.currentUser?.id)
              ) {
                parsed.state.currentUser = parsed.state.users[0] || null;
              }
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => safeStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => safeStorage.removeItem(name),
      },
    }
  )
);
