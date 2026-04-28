'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/lib/translations';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { User, UserFormData, UserCreateData, UserListFilters, DeletionImpact } from '@/domain/users/types';
import { withAdmin } from '@/lib/withAdmin';
import Navigation from '@/components/Navigation';
import {
  Shield, User as UserIcon, Plus, Edit2, Trash2, X, Check, Search, Mail,
  UserCheck, UserX, KeyRound, AlertCircle, Filter, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FieldErrors } from '@/domain/users/passwordApi';

type RoleFilter = 'all' | 'admin' | 'user';
type StatusFilter = 'all' | 'active' | 'inactive';
type LastLoginFilter = 'any' | '7d' | '30d' | '90d' | 'never';

/** Confirm-action modal props. One shared modal drives the simple
 *  per-row state actions (activate / deactivate / promote / demote)
 *  so we don't duplicate four near-identical modal blocks. */
interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'primary' | 'danger';
  onConfirm: () => Promise<void>;
}

function UsersAdminPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Filters ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [lastLoginFilter, setLastLoginFilter] = useState<LastLoginFilter>('any');

  // ── Bulk selection ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Modals ─────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<DeletionImpact | null>(null);

  // Reset-password modal state. Kept local to the modal (cleared on
  // every close) so the new password is never cached on the page.
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetErrors, setResetErrors] = useState<FieldErrors>({});
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccessAt, setResetSuccessAt] = useState<number | null>(null);

  // ── Form state for create / edit ──────────────────────────────────
  const [formData, setFormData] = useState<UserCreateData>({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    role: 'user',
  });
  const [editFormData, setEditFormData] = useState<Partial<UserFormData>>({
    first_name: '',
    last_name: '',
    role: 'user',
    is_active: true,
  });

  // ── Build the backend filters object from the UI state. ───────────
  // Memoised so `useEffect`'s dep-array doesn't churn on unrelated
  // re-renders (it's structurally compared by reference).
  const apiFilters = useMemo<UserListFilters | undefined>(() => {
    const f: UserListFilters = {};
    if (roleFilter !== 'all') f.role = roleFilter;
    if (statusFilter !== 'all') f.is_active = statusFilter === 'active';
    if (lastLoginFilter === 'never') f.last_login_never = true;
    else if (lastLoginFilter !== 'any') {
      f.last_login_within_days = lastLoginFilter === '7d' ? 7 : lastLoginFilter === '30d' ? 30 : 90;
    }
    return Object.keys(f).length === 0 ? undefined : f;
  }, [roleFilter, statusFilter, lastLoginFilter]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.users.list(apiFilters);
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [apiFilters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Selection drops users that are no longer in the filtered view.
  // Without this, "select all" + "filter inactive only" would keep
  // active selections that the user can't see.
  useEffect(() => {
    setSelectedIds(prev => {
      const visibleIds = new Set(users.map(u => u.id));
      const next = new Set<number>();
      for (const id of prev) {
        if (visibleIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [users]);

  // ── Create / edit / delete / reset-password (existing flows) ─────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.users.create(formData);
      setIsCreateModalOpen(false);
      setFormData({
        email: '', first_name: '', last_name: '',
        password: '', password_confirm: '', role: 'user',
      });
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.users.update(selectedUser.id, editFormData);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await api.users.delete(selectedUser.id);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      setDeletionImpact(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_active: user.is_active,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = async (user: User) => {
    setSelectedUser(user);
    setDeletionImpact(null);
    setIsDeleteModalOpen(true);
    // Lazy-fetch the impact counts. Failing here doesn't block the
    // modal — the operator can still proceed; they just don't see the
    // breakdown.
    try {
      const impact = await api.users.deletionImpact(user.id);
      setDeletionImpact(impact);
    } catch {
      // Silent: the modal already shows the user name; counts are extra.
    }
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetErrors({});
    setIsResetPasswordModalOpen(true);
  };

  const closeResetPasswordModal = () => {
    setIsResetPasswordModalOpen(false);
    setSelectedUser(null);
    setResetPassword('');
    setResetPasswordConfirm('');
    setResetErrors({});
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const local: FieldErrors = {};
    if (!resetPassword) local.new_password = [t('profile.errors.newRequired') || 'New password is required.'];
    else if (resetPassword.length < 8) {
      local.new_password = [t('profile.errors.minLength') || 'Password must be at least 8 characters.'];
    }
    if (resetPassword && resetPassword !== resetPasswordConfirm) {
      local.new_password_confirm = [t('profile.errors.mismatch') || 'Passwords do not match.'];
    }
    if (Object.keys(local).length > 0) {
      setResetErrors(local);
      return;
    }
    setResetSubmitting(true);
    setResetErrors({});
    const result = await api.users.setPassword(selectedUser.id, resetPassword, resetPasswordConfirm);
    setResetSubmitting(false);
    if (result.ok) {
      setResetSuccessAt(Date.now());
      closeResetPasswordModal();
      setTimeout(() => setResetSuccessAt(null), 3000);
    } else {
      setResetErrors(result.fieldErrors);
    }
  };

  // ── Per-row state actions: open the shared confirm modal ─────────
  // Each helper builds a `ConfirmConfig` and lets the shared modal
  // drive the API call. On success the list is refetched; on failure
  // the API error surfaces via the page-level error banner.

  const runApiAction = async (fn: () => Promise<unknown>) => {
    setConfirmSubmitting(true);
    try {
      await fn();
      setConfirmConfig(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const askDeactivate = (u: User) => setConfirmConfig({
    title: t('admin.deactivate') || 'Deactivate',
    message: (t('admin.deactivateConfirm') || 'Deactivate {name}?').replace('{name}', u.full_name),
    confirmLabel: t('admin.deactivate') || 'Deactivate',
    variant: 'primary',
    onConfirm: () => runApiAction(() => api.users.deactivate(u.id)),
  });

  const askActivate = (u: User) => setConfirmConfig({
    title: t('admin.activate') || 'Activate',
    message: (t('admin.activateConfirm') || 'Activate {name}?').replace('{name}', u.full_name),
    confirmLabel: t('admin.activate') || 'Activate',
    variant: 'primary',
    onConfirm: () => runApiAction(() => api.users.activate(u.id)),
  });

  const askPromote = (u: User) => setConfirmConfig({
    title: t('admin.promote') || 'Promote',
    message: (t('admin.promoteConfirm') || 'Promote {name}?').replace('{name}', u.full_name),
    confirmLabel: t('admin.promote') || 'Promote',
    variant: 'primary',
    onConfirm: () => runApiAction(() => api.users.promote(u.id)),
  });

  const askDemote = (u: User) => setConfirmConfig({
    title: t('admin.demote') || 'Demote',
    message: (t('admin.demoteConfirm') || 'Demote {name}?').replace('{name}', u.full_name),
    confirmLabel: t('admin.demote') || 'Demote',
    variant: 'primary',
    onConfirm: () => runApiAction(() => api.users.demote(u.id)),
  });

  // ── Bulk selection / actions ─────────────────────────────────────

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  const selectableUsers = useMemo(
    () => filteredUsers.filter(u => u.id !== currentUser?.id),
    [filteredUsers, currentUser],
  );

  const allSelected = selectableUsers.length > 0
    && selectableUsers.every(u => selectedIds.has(u.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUsers.map(u => u.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedUsers = useMemo(
    () => users.filter(u => selectedIds.has(u.id)),
    [users, selectedIds],
  );

  const allSelectedAreInactive = selectedUsers.length > 0
    && selectedUsers.every(u => !u.is_active);

  const runBulk = (fn: () => Promise<unknown>) => async () => {
    if (selectedIds.size === 0) return;
    try {
      await fn();
      setSelectedIds(new Set());
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk action failed');
    }
  };

  const handleBulkActivate = runBulk(() => api.users.bulkActivate(Array.from(selectedIds)));
  const handleBulkDeactivate = runBulk(() => api.users.bulkDeactivate(Array.from(selectedIds)));
  const handleBulkPromote = runBulk(() => api.users.bulkSetRole(Array.from(selectedIds), 'admin'));
  const handleBulkDemote = runBulk(() => api.users.bulkSetRole(Array.from(selectedIds), 'user'));
  const handleBulkDelete = runBulk(() => api.users.bulkDelete(Array.from(selectedIds)));

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-inner">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-foreground">
                {t('admin.title')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t('admin.description')}
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl flex items-center justify-between">
            <span className="font-medium text-sm">{error}</span>
            <Button onClick={() => setError(null)} variant="ghost" size="icon" className="p-1">
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('admin.stats.total')}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{users.length}</p>
              </div>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner">
                <UserIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('admin.stats.admins')}</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <div className="p-4 bg-secondary/30 border border-secondary/50 rounded-2xl shadow-inner">
                <Shield className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('admin.stats.active')}</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-inner text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar (search + filters + Add) */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4 shadow-sm flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative w-full sm:flex-1 max-w-md">
              <Input
                type="text"
                placeholder={t('admin.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)} variant="primary" className="sm:ml-auto">
              <Plus className="w-5 h-5" />
              {t('admin.addUser')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-border/50">
            <span className="text-sm font-semibold text-muted-foreground inline-flex items-center gap-1.5">
              <Filter className="w-4 h-4" />
              {t('admin.filters.title')}
            </span>
            <FilterSelect
              label={t('admin.filters.role')}
              value={roleFilter}
              onChange={(v) => setRoleFilter(v as RoleFilter)}
              options={[
                { value: 'all', label: t('admin.filters.all') },
                { value: 'admin', label: t('admin.roleOptions.admin') },
                { value: 'user', label: t('admin.roleOptions.user') },
              ]}
              testId="filter-role"
            />
            <FilterSelect
              label={t('admin.filters.status')}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { value: 'all', label: t('admin.filters.all') },
                { value: 'active', label: t('admin.statusOptions.active') },
                { value: 'inactive', label: t('admin.statusOptions.inactive') },
              ]}
              testId="filter-status"
            />
            <FilterSelect
              label={t('admin.filters.lastLogin')}
              value={lastLoginFilter}
              onChange={(v) => setLastLoginFilter(v as LastLoginFilter)}
              options={[
                { value: 'any', label: t('admin.filters.any') },
                { value: '7d', label: t('admin.filters.within7d') },
                { value: '30d', label: t('admin.filters.within30d') },
                { value: '90d', label: t('admin.filters.within90d') },
                { value: 'never', label: t('admin.filters.never') },
              ]}
              testId="filter-last-login"
            />
          </div>
        </div>

        {/* Bulk action bar — sticky-ish above the table when selection > 0 */}
        {selectedIds.size > 0 && (
          <div
            data-testid="bulk-action-bar"
            className="bg-primary/5 border border-primary/30 rounded-2xl p-3 mb-4 shadow-sm flex flex-wrap items-center gap-3"
          >
            <span className="text-sm font-bold text-primary">
              {(t('admin.bulk.selected') || '{count} selected').replace('{count}', String(selectedIds.size))}
            </span>
            <div className="h-5 w-px bg-border" />
            <Button onClick={handleBulkActivate} variant="ghost" size="sm">
              <UserCheck className="w-4 h-4" />
              {t('admin.bulk.activate')}
            </Button>
            <Button onClick={handleBulkDeactivate} variant="ghost" size="sm">
              <UserX className="w-4 h-4" />
              {t('admin.bulk.deactivate')}
            </Button>
            <Button onClick={handleBulkPromote} variant="ghost" size="sm">
              <ArrowUp className="w-4 h-4" />
              {t('admin.bulk.promote')}
            </Button>
            <Button onClick={handleBulkDemote} variant="ghost" size="sm">
              <ArrowDown className="w-4 h-4" />
              {t('admin.bulk.demote')}
            </Button>
            <Button
              onClick={handleBulkDelete}
              variant="ghost"
              size="sm"
              disabled={!allSelectedAreInactive}
              title={!allSelectedAreInactive ? (t('admin.bulk.deleteRequiresAllInactive') || '') : undefined}
              className="text-destructive disabled:text-muted-foreground"
            >
              <Trash2 className="w-4 h-4" />
              {t('admin.bulk.delete')}
            </Button>
            <Button onClick={() => setSelectedIds(new Set())} variant="ghost" size="sm" className="ml-auto">
              {t('admin.bulk.clear')}
            </Button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/10 border-b border-border/50">
                <tr>
                  <th className="px-4 py-4 w-12">
                    <input
                      type="checkbox"
                      data-testid="select-all"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                      className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t('admin.table.user')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t('admin.table.role')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t('admin.table.status')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t('admin.table.created')}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {t('admin.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          data-testid={`select-user-${user.id}`}
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelectOne(user.id)}
                          disabled={isSelf}
                          aria-label={`Select ${user.full_name}`}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-ring disabled:opacity-40"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-foreground">{user.full_name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3.5 h-3.5" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          user.role === 'admin'
                            ? 'bg-secondary/20 border-secondary/30 text-secondary-foreground'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}>
                          {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                          {user.role === 'admin' ? t('admin.roleOptions.admin') : t('admin.roleOptions.user')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          user.is_active
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-destructive/10 border-destructive/20 text-destructive'
                        }`}>
                          {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {user.is_active ? t('admin.statusOptions.active') : t('admin.statusOptions.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            onClick={() => openEditModal(user)}
                            variant="ghost"
                            size="icon"
                            title={t('admin.editUser') || 'Edit user'}
                          >
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button
                            onClick={() => openResetPasswordModal(user)}
                            variant="ghost"
                            size="icon"
                            title={t('admin.resetPassword') || 'Reset password'}
                          >
                            <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                          </Button>
                          {user.is_active ? (
                            <Button
                              onClick={() => askDeactivate(user)}
                              variant="ghost"
                              size="icon"
                              disabled={isSelf}
                              title={t('admin.deactivate') || 'Deactivate'}
                              data-testid={`row-deactivate-${user.id}`}
                            >
                              <UserX className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => askActivate(user)}
                              variant="ghost"
                              size="icon"
                              title={t('admin.activate') || 'Activate'}
                              data-testid={`row-activate-${user.id}`}
                            >
                              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                            </Button>
                          )}
                          {user.role === 'admin' ? (
                            <Button
                              onClick={() => askDemote(user)}
                              variant="ghost"
                              size="icon"
                              disabled={isSelf}
                              title={t('admin.demote') || 'Demote'}
                              data-testid={`row-demote-${user.id}`}
                            >
                              <ArrowDown className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                            </Button>
                          ) : (
                            <Button
                              onClick={() => askPromote(user)}
                              variant="ghost"
                              size="icon"
                              title={t('admin.promote') || 'Promote'}
                              data-testid={`row-promote-${user.id}`}
                            >
                              <ArrowUp className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                            </Button>
                          )}
                          <Button
                            onClick={() => openDeleteModal(user)}
                            variant="ghost"
                            size="icon"
                            disabled={user.is_active || isSelf}
                            title={
                              user.is_active
                                ? (t('admin.deleteRequiresInactive') || 'Deactivate first')
                                : (t('admin.deleteUser') || 'Delete user')
                            }
                            data-testid={`row-delete-${user.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UserIcon className="w-12 h-12 text-gray-300 dark:text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('admin.noUsers')}</p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto styled-scroll">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{t('admin.createModalTitle')}</h2>
                <Button onClick={() => setIsCreateModalOpen(false)} variant="ghost" size="icon" className="text-muted-foreground">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('admin.fields.email')}
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('admin.fields.firstName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('admin.fields.lastName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('admin.fields.role')}
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                  >
                    <option value="user">{t('admin.roleOptions.user')}</option>
                    <option value="admin">{t('admin.roleOptions.admin')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('admin.fields.password')}
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('admin.fields.passwordConfirm')}
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password_confirm}
                    onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" onClick={() => setIsCreateModalOpen(false)} variant="outline" className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    {t('admin.createButton')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto styled-scroll">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">{t('admin.editModalTitle')}</h2>
                <Button onClick={() => setIsEditModalOpen(false)} variant="ghost" size="icon" className="text-muted-foreground">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('admin.fields.firstName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('admin.fields.lastName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('admin.fields.role')}
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as 'admin' | 'user' })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-card text-card-foreground dark:bg-gray-700 text-foreground focus:ring-2 focus:ring-ring"
                  >
                    <option value="user">{t('admin.roleOptions.user')}</option>
                    <option value="admin">{t('admin.roleOptions.admin')}</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-gray-700/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-ring"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('admin.fields.isActive')}
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" onClick={() => setIsEditModalOpen(false)} variant="outline" className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    {t('admin.saveChanges')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {isResetPasswordModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {(t('admin.resetPasswordTitle') || 'Reset password for {name}').replace(
                      '{name}', selectedUser.full_name || selectedUser.email,
                    )}
                  </h2>
                </div>
                <button
                  onClick={closeResetPasswordModal}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t('common.cancel') || 'Cancel'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {resetErrors._global_ && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{resetErrors._global_.join(' ')}</span>
                </div>
              )}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  label={t('profile.newPassword') || 'New password'}
                  type="password"
                  autoComplete="new-password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  error={resetErrors.new_password?.[0]}
                  disabled={resetSubmitting}
                />
                <Input
                  label={t('profile.confirmNewPassword') || 'Confirm new password'}
                  type="password"
                  autoComplete="new-password"
                  value={resetPasswordConfirm}
                  onChange={e => setResetPasswordConfirm(e.target.value)}
                  error={resetErrors.new_password_confirm?.[0]}
                  disabled={resetSubmitting}
                />
                <div className="flex gap-3 pt-2">
                  <Button type="button" onClick={closeResetPasswordModal} variant="outline" className="flex-1" disabled={resetSubmitting}>
                    {t('common.cancel') || 'Cancel'}
                  </Button>
                  <Button type="submit" className="flex-1" disabled={resetSubmitting}>
                    {resetSubmitting
                      ? (t('profile.saving') || 'Saving…')
                      : (t('admin.resetPassword') || 'Reset password')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {resetSuccessAt !== null && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 shadow-lg"
          >
            <Check className="w-4 h-4" />
            {t('admin.resetPasswordSuccess') || 'Password reset.'}
          </div>
        )}

        {/* Delete Modal — now with deletion-impact summary */}
        {isDeleteModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {t('admin.deleteModalTitle')}
                </h2>
                <p className="text-muted-foreground mb-4">
                  {t('admin.deleteConfirmation', { name: selectedUser.full_name })}
                </p>
                {deletionImpact !== null && (
                  <div className="mb-6 text-left rounded-xl border border-border/50 bg-muted/30 p-4 text-sm">
                    <p className="font-semibold text-foreground mb-2">
                      {t('admin.deletionImpact.title')}
                    </p>
                    {deletionImpact.notifications === 0 && deletionImpact.audit_log_entries === 0 ? (
                      <p className="text-muted-foreground">
                        {t('admin.deletionImpact.noImpact')}
                      </p>
                    ) : (
                      <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                        {deletionImpact.notifications > 0 && (
                          <li>
                            {(t('admin.deletionImpact.notifications') || '{count} notifications…')
                              .replace('{count}', String(deletionImpact.notifications))}
                          </li>
                        )}
                        {deletionImpact.audit_log_entries > 0 && (
                          <li>
                            {(t('admin.deletionImpact.auditLog') || '{count} audit-log entries…')
                              .replace('{count}', String(deletionImpact.audit_log_entries))}
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { setIsDeleteModalOpen(false); setDeletionImpact(null); }}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleDelete} variant="danger" className="flex-1">
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shared confirm modal — drives the simple per-row state actions
            (activate / deactivate / promote / demote). */}
        {confirmConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card text-card-foreground rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {confirmConfig.title}
              </h2>
              <p className="text-muted-foreground mb-6">{confirmConfig.message}</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setConfirmConfig(null)}
                  variant="outline"
                  className="flex-1"
                  disabled={confirmSubmitting}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => confirmConfig.onConfirm()}
                  variant={confirmConfig.variant}
                  className="flex-1"
                  disabled={confirmSubmitting}
                  data-testid="confirm-action"
                >
                  {confirmConfig.confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        )}

        </div>
      </main>
    </div>
  );
}

/** Filter dropdown rendered as `<label> + <select>`. Pulled out so the
 *  toolbar reads as three lines instead of three repeated <div> blocks. */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  testId?: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 border border-border rounded-md bg-card text-card-foreground text-sm focus:ring-2 focus:ring-ring"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </label>
  );
}

export default withAdmin(UsersAdminPage);
