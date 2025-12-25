import React, { useState, useEffect } from 'react';
import {
  PersonAdd,
  Edit,
  Delete,
  CheckCircle,
  Block,
  Email,
  Phone,
  Person,
  AdminPanelSettings,
  Search,
  Refresh,
} from '@mui/icons-material';
import { adminAPI } from '../lib/api';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>(''); // '', 'admin', or 'user'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    is_active: true,
    role: 'user',
  });

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = roleFilter ? { role: roleFilter } : {};
      const response = await adminAPI.listAdmins(params);
      setUsers(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!createForm.name || !createForm.email || !createForm.password) {
      setError('Name, email, and password are required');
      return;
    }

    if (createForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await adminAPI.createAdmin({
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone || undefined,
      });

      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', password: '', phone: '' });
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create admin user');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');

    try {
      await adminAPI.updateUser(selectedUser.id, {
        name: editForm.name || undefined,
        phone: editForm.phone || undefined,
        is_active: editForm.is_active,
        role: editForm.role,
      });

      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDeactivate = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${userName}?`)) {
      return;
    }

    try {
      await adminAPI.deactivateUser(userId);
      loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      phone: user.phone || '',
      is_active: user.is_active,
      role: user.role,
    });
    setShowEditModal(true);
    setError('');
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone && user.phone.includes(searchTerm))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AdminPanelSettings className="h-7 w-7 text-blue-600" />
              User Management
            </h2>
            <p className="text-gray-600 mt-1">Manage admin users and permissions</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadUsers}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <Refresh className="h-5 w-5" />
              Refresh
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setCreateForm({ name: '', email: '', password: '', phone: '' });
                setError('');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PersonAdd className="h-5 w-5" />
              Add Admin
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Person className="h-16 w-16 mb-4 text-gray-400" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm">Try adjusting your search or add a new admin user</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Person className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Email className="h-4 w-4 text-gray-400" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {user.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.is_active ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 items-center gap-1">
                          <Block className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? formatDate(user.last_login) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit user"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      {user.is_active && (
                        <button
                          onClick={() => handleDeactivate(user.id, user.name)}
                          className="text-red-600 hover:text-red-900"
                          title="Deactivate user"
                        >
                          <Delete className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Users:</span>
            <span className="font-semibold text-gray-900">{users.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="font-semibold text-gray-900">
              {users.filter((u) => u.is_active).length} active •{' '}
              {users.filter((u) => !u.is_active).length} inactive
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Roles:</span>
            <span className="font-semibold text-gray-900">
              {users.filter((u) => u.role === 'admin').length} admins •{' '}
              {users.filter((u) => u.role === 'user').length} users
            </span>
          </div>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError('');
        }}
        title="Create Admin User"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={createForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, name: e.target.value })}
            required
            placeholder="Enter admin name"
          />

          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, email: e.target.value })}
            required
            placeholder="admin@example.com"
          />

          <Input
            label="Password"
            type="password"
            value={createForm.password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, password: e.target.value })}
            required
            placeholder="Min. 8 characters"
          />

          <Input
            label="Phone (Optional)"
            type="tel"
            value={createForm.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreateForm({ ...createForm, phone: e.target.value })}
            placeholder="+84 123 456 789"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setError('');
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <PersonAdd className="h-5 w-5" />
              Create Admin
            </button>
          </div>
        </form>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
          setError('');
        }}
        title="Edit User"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Name"
            type="text"
            value={editForm.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Enter name"
          />

          <Input
            label="Phone"
            type="tel"
            value={editForm.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, phone: e.target.value })}
            placeholder="+84 123 456 789"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
                setError('');
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit className="h-5 w-5" />
              Update User
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
