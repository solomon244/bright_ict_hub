import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { fetchUsers } from '../../services/adminService';
import type { User } from '../../types';

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
        console.error('Failed to load users:', err);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) {
    return <div className="text-center">Loading users...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">User directory</p>
          <h3 className="text-xl font-display">Manage community</h3>
        </div>
        <Button variant="secondary">Invite user</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-stone-400">
              <th className="pb-3">Name</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((user) => (
              <tr key={user._id || user.id}>
                <td className="py-3 font-semibold text-stone-800">
                  {user.firstName} {user.lastName}
                </td>
                <td className="py-3 capitalize text-stone-500">{user.role}</td>
                <td className="py-3 text-stone-500">{user.email}</td>
                <td className="py-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {user.isEmailVerified ? 'Verified' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default AdminUsersPage;


