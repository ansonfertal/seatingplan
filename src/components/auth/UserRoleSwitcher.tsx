import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../models/user';
import { Shield, UserCircle2, ChevronDown, Check } from 'lucide-react';

export const UserRoleSwitcher: React.FC = () => {
  const { currentUser, users, loginAs } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'coordinator':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'invigilator':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:bg-slate-50 transition-all text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <UserCircle2 className="w-4 h-4 text-slate-500" />
        <span className="font-semibold text-slate-800 truncate max-w-[160px] sm:max-w-[200px]">
          {currentUser.name.split(' (')[0]}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(
            currentUser.role
          )}`}
        >
          {currentUser.role}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Switch Role / User Account
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulate role permissions in local prototype
              </p>
            </div>

            <div className="py-1">
              {users.map((user) => {
                const isSelected = user.id === currentUser.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      loginAs(user.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{user.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </div>
                      <p className="text-[10px] text-slate-500">{user.department}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
              <span>RBAC Policy: Admin, Coordinator, Invigilator</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
