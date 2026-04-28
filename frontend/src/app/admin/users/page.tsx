'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translations';
import { api } from '@/lib/api';
import { User, UserFormData, UserCreateData } from '@/domain/users/types';
import { withAdmin } from '@/lib/withAdmin';
import Navigation from '@/components/Navigation';
import { Shield, User as UserIcon, Plus, Edit2, Trash2, X, Check, Search, Mail, UserCheck, UserX, KeyRound, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FieldErrors } from '@/domain/users/passwordApi';

function UsersAdminPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Reset-password modal state. Kept local to the modal (cleared on
  // every close) so the new password is never cached on the page.
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetErrors, setResetErrors] = useState<FieldErrors>({});
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccessAt, setResetSuccessAt] = useState<number | null>(null);

  // Form states
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

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.users.list();
      setUsers(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.users.create(formData);
      setIsCreateModalOpen(false);
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        password_confirm: '',
        role: 'user',
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

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
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
    // Mirror /profile's client-side validation rules (8 char min,
    // matching values) so the same shape of error surfaces here.
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
      // Auto-close the modal so the new password isn't sitting in
      // the form cache. Toast persists for 3 s after close.
      closeResetPasswordModal();
      setTimeout(() => setResetSuccessAt(null), 3000);
    } else {
      setResetErrors(result.fieldErrors);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="icon"
              className="p-1"
            >
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-3xl shadow-sm border border-border/50 p-6 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Users</p>
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
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Admins</p>
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
              <div className="p-4 bg-primary hover:bg-primary/90/10 border border-emerald-500/20 rounded-2xl shadow-inner text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-card border border-border/50 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            variant="primary"
            className="sm:ml-auto"
          >
            <Plus className="w-5 h-5" />
            Add User
          </Button>
        </div>

        {/* Users Table */}
        <div className="bg-card rounded-3xl shadow-sm border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/10 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-foreground">
                            {user.full_name}
                          </div>
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
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        user.is_active
                          ? 'bg-primary hover:bg-primary/90/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-destructive/10 border-destructive/20 text-destructive'
                      }`}>
                        {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
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
                          aria-label={t('admin.resetPassword') || 'Reset password'}
                        >
                          <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
                        </Button>
                        <Button
                          onClick={() => openDeleteModal(user)}
                          variant="ghost"
                          size="icon"
                          title={t('admin.deleteUser') || 'Delete user'}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                <Button
                  onClick={() => setIsCreateModalOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
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
                  <Button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                  >
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
                <Button
                  onClick={() => setIsEditModalOpen(false)}
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                >
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
                  <Button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                  >
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
                  <Button
                    type="button"
                    onClick={closeResetPasswordModal}
                    variant="outline"
                    className="flex-1"
                    disabled={resetSubmitting}
                  >
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

        {/* Reset-password success toast. Lives at the page level so it
            persists for ~3 s after the modal closes. The text never
            includes the new password — re-displaying it would create
            a screen-recording risk. */}
        {resetSuccessAt !== null && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 shadow-lg"
          >
            <Check className="w-4 h-4" />
            {t('admin.resetPasswordSuccess') || 'Password reset.'}
          </div>
        )}

        {/* Delete Modal */}
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
                <p className="text-muted-foreground mb-6">
                  {t('admin.deleteConfirmation', { name: selectedUser.full_name })}
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setIsDeleteModalOpen(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="danger"
                    className="flex-1"
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}

export default withAdmin(UsersAdminPage);
 withAdmin(UsersAdminPage);
