import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import {
  type UserRole,
  type User,
  COMMON_EXAM_POSTS,
  getUserDisplayName,
  getUserPost,
} from '../../models/user';
import {
  Shield,
  UserCircle2,
  ChevronDown,
  Check,
  UserPlus,
  Trash2,
  X,
  Briefcase,
  Building,
  Mail,
  UserCheck,
} from 'lucide-react';

export const UserRoleSwitcher: React.FC = () => {
  const { currentUser, users, loginAs, addUser, removeUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for adding a new person to a post
  const [name, setName] = useState('');
  const [selectedPostOption, setSelectedPostOption] = useState<string>('Exam Coordinator');
  const [customPost, setCustomPost] = useState('');
  const [role, setRole] = useState<UserRole>('coordinator');
  const [department, setDepartment] = useState('Academic Affairs');
  const [email, setEmail] = useState('');
  const [switchImmediately, setSwitchImmediately] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const getRoleBadgeColor = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'coordinator':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'invigilator':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const handlePostChange = (postVal: string) => {
    setSelectedPostOption(postVal);
    // Automatically match sensible default system role based on selected post
    if (postVal === 'Hall Invigilator') {
      setRole('invigilator');
    } else if (postVal === 'Chief Controller') {
      setRole('admin');
    } else {
      setRole('coordinator');
    }
  };

  const resetForm = () => {
    setName('');
    setSelectedPostOption('Exam Coordinator');
    setCustomPost('');
    setRole('coordinator');
    setDepartment('Academic Affairs');
    setEmail('');
    setSwitchImmediately(true);
    setFormError(null);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
    setIsOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleAddPersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter the person\'s full name');
      return;
    }

    const effectivePost =
      selectedPostOption === 'Other / Custom Post...'
        ? customPost.trim()
        : selectedPostOption.trim();

    if (!effectivePost) {
      setFormError('Please select or specify an examination post/designation');
      return;
    }

    const newUser = addUser({
      name: name.trim(),
      post: effectivePost,
      role,
      department: department.trim() || 'Academic Affairs',
      email: email.trim(),
    });

    if (switchImmediately) {
      loginAs(newUser.id);
    }

    handleCloseModal();
  };

  const handleDeleteUser = (e: React.MouseEvent, userToDelete: User) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to remove ${getUserDisplayName(userToDelete)} (${getUserPost(
        userToDelete
      )}) from the officials list?`
    );
    if (confirmed) {
      removeUser(userToDelete.id);
    }
  };

  const currentDisplayName = getUserDisplayName(currentUser);
  const currentPost = getUserPost(currentUser);

  return (
    <>
      <div className="relative inline-block text-left" data-testid="user-role-switcher-container">
        {/* Main Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white shadow-xs hover:bg-slate-50 transition-all text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-haspopup="true"
          aria-expanded={isOpen}
          title={
            currentUser
              ? `Active Official: ${currentDisplayName} (${currentPost})`
              : 'Select or add an examination official'
          }
        >
          <UserCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="flex items-center gap-1.5 text-left truncate max-w-[200px] sm:max-w-[280px]">
            <span className="font-semibold text-slate-800 truncate">
              {currentUser ? currentDisplayName : 'Select / Add Official'}
            </span>
            {currentUser && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate">
                {currentPost}
              </span>
            )}
          </div>
          {currentUser ? (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${getRoleBadgeColor(
                currentUser.role
              )}`}
            >
              {currentUser.role}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 bg-slate-100 text-slate-600 border-slate-200">
              Not Set
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100"
              role="menu"
            >
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Exam Officials & Posts
                  </p>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                    {users.length} configured
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select active personnel or add staff to examination posts
                </p>
              </div>

              {/* Personnel List */}
              <div className="py-1 max-h-72 overflow-y-auto" role="none">
                {users.length === 0 ? (
                  <div className="px-4 py-6 text-center text-slate-500 text-xs">
                    <UserCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Officials Configured Yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Add personnel to examination posts below.
                    </p>
                  </div>
                ) : (
                  users.map((user) => {
                    const isSelected = currentUser?.id === user.id;
                    const displayName = getUserDisplayName(user);
                    const post = getUserPost(user);

                    return (
                      <div
                        key={user.id}
                        onClick={() => {
                          loginAs(user.id);
                          setIsOpen(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                          isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                        }`}
                        role="menuitem"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-900 truncate">
                              {displayName}
                            </span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                              <Briefcase className="w-2.5 h-2.5" />
                              {post}
                            </span>
                            {user.department && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                • {user.department}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => handleDeleteUser(e, user)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-70 group-hover:opacity-100"
                            title={`Remove ${displayName}`}
                            aria-label={`Remove ${displayName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Button: Add Person to Post */}
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50/60 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  + Add Person to Examination Post
                </button>
              </div>

              {/* Policy Footer */}
              <div className="px-4 py-2 bg-slate-50/50 text-[10px] text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>RBAC: Roles determine permissions across the exam wizard</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Person to Post Modal Dialog */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-official-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="add-official-title" className="text-base font-bold text-slate-900">
                    Add Person to Examination Post
                  </h2>
                  <p className="text-xs text-slate-500">
                    Register academic personnel to an official examination duty post
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddPersonSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Robert Chen or Prof. Anita Desai"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              {/* Examination Post */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Examination Post / Designation *
                  </label>
                  <span className="text-[10px] text-slate-400">Select standard or custom post</span>
                </div>

                <select
                  value={selectedPostOption}
                  onChange={(e) => handlePostChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                >
                  {COMMON_EXAM_POSTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="Other / Custom Post...">Other / Custom Post...</option>
                </select>

                {/* Quick Select Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {['Exam Coordinator', 'Chief Superintendent', 'Senior Superintendent', 'Hall Invigilator'].map(
                    (quickPost) => (
                      <button
                        key={quickPost}
                        type="button"
                        onClick={() => handlePostChange(quickPost)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                          selectedPostOption === quickPost
                            ? 'bg-indigo-600 text-white border-indigo-600 font-medium shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {quickPost}
                      </button>
                    )
                  )}
                </div>

                {/* Custom Post Input */}
                {selectedPostOption === 'Other / Custom Post...' && (
                  <div className="mt-2 animate-in fade-in duration-100">
                    <input
                      type="text"
                      required
                      value={customPost}
                      onChange={(e) => setCustomPost(e.target.value)}
                      placeholder="e.g. Deputy Controller, External Observer, Chief Invigilator"
                      className="w-full px-3 py-2 text-sm border border-indigo-300 bg-indigo-50/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* System Role / RBAC Permissions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  System Role (Access Permissions) *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('coordinator')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === 'coordinator'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900">Coordinator</span>
                      {role === 'coordinator' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Full exam setup, rooms & seating generation
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('invigilator')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === 'invigilator'
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Invigilator</span>
                      {role === 'invigilator' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Read-only hall seating plans & attendance sheets
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      role === 'admin'
                        ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-900">Admin</span>
                      {role === 'admin' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Full system master admin & policy wipe
                    </p>
                  </button>
                </div>
              </div>

              {/* Department & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-400" />
                    Department / Unit
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rchen@institution.edu"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Switch immediately option */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={switchImmediately}
                    onChange={(e) => setSwitchImmediately(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Select and switch to this official immediately</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <UserCheck className="w-4 h-4" />
                  Add Official to Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
