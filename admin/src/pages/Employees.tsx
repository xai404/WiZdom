import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Plus, Users, UserX, UserCheck, X } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchEmployees, deleteEmployee, updateEmployee } from '../api/employees';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EMPLOYEE_ROLE_TONE,
  Pagination,
  SearchInput,
  Select,
} from '../components/ui';
import type { Column, PaginationMeta } from '../components/ui';
import { EMPLOYEE_DEPARTMENTS, type Employee } from '../types';

const Employees = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  // Everyone can view the directory (route-level check already covers
  // that). super_admin and the 'admin' role can perform every action on
  // any employee; every other role may only edit their own row (handled
  // per-row below), matching the backend's requireRoleOrSelf.
  const canManageOthers = user?.role === 'super_admin' || user?.role === 'admin';
  const canCreate = canManageOthers;
  const canDelete = canManageOthers;
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as { successMessage?: string } | null)?.successMessage ?? null
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [pendingAction, setPendingAction] = useState<{
    type: 'deactivate' | 'reactivate' | 'delete';
    employee: Employee;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchEmployees({ search, department: department as any, role: role as any, status: status as any, page, limit: 10 })
      .then((res) => {
        setEmployees(res.data);
        setPagination(res.pagination);
      })
      .catch(() => setError('Could not load employees.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, department, role, status, page]);

  useEffect(() => setPage(1), [search, department, role, status]);

  const hasActiveFilters = Boolean(search || department || role || status);
  const clearFilters = () => {
    setSearch('');
    setDepartment('');
    setRole('');
    setStatus('');
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      if (pendingAction.type === 'delete') {
        await deleteEmployee(pendingAction.employee.id);
      } else {
        await updateEmployee(pendingAction.employee.id, { isActive: pendingAction.type === 'reactivate' });
      }
      setPendingAction(null);
      load();
    } catch {
      setError(`Could not ${pendingAction.type} this employee.`);
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<Employee>[] = [
    {
      key: 'name',
      label: 'Employee',
      render: (emp) => (
        <div className="flex items-center gap-3">
          <Avatar name={emp.name} src={emp.profilePicture} size={36} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-800">{emp.name}</p>
            <p className="truncate text-xs text-slate-400">{emp.designation || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (emp) => <Badge tone="slate">{emp.department}</Badge>,
    },
    {
      key: 'role',
      label: 'Role',
      render: (emp) => <Badge tone={EMPLOYEE_ROLE_TONE[emp.role ?? 'staff']}>{emp.role ?? 'staff'}</Badge>,
    },
    { key: 'email', label: 'Email', render: (emp) => <span className="text-slate-600">{emp.email}</span> },
    { key: 'phone', label: 'Phone', render: (emp) => <span className="text-slate-600">{emp.phone}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (emp) => <Badge tone={emp.isActive ? 'green' : 'slate'}>{emp.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'createdAt',
      label: 'Date Joined',
      render: (emp) => (
        <span className="text-slate-500">{emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : '—'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (emp) => {
        const canEditThis = canManageOthers || emp.id === user?.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {canEditThis && (
              <button
                title="Edit"
                onClick={() => navigate('/employees/edit', { state: { id: emp.id } })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              title="View"
              onClick={() => navigate('/admin/employees/view', { state: { id: emp.id } })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
            >
              <Eye size={16} />
            </button>
            {canManageOthers &&
              (emp.isActive ? (
                <button
                  title="Deactivate"
                  onClick={() => setPendingAction({ type: 'deactivate', employee: emp })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-amber-50 hover:text-amber-600"
                >
                  <UserX size={16} />
                </button>
              ) : (
                <button
                  title="Reactivate"
                  onClick={() => setPendingAction({ type: 'reactivate', employee: emp })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <UserCheck size={16} />
                </button>
              ))}
            {canDelete && (
              <button
                title="Delete"
                onClick={() => setPendingAction({ type: 'delete', employee: emp })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout title="Employees" subtitle="Manage your team's accounts and access.">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone…" className="flex-1 sm:max-w-xs" />
            <div className="w-full shrink-0 sm:w-45">
              <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All departments</option>
                {EMPLOYEE_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-full shrink-0 sm:w-37.5">
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">All roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="co_admin">Co Admin</option>
              </Select>
            </div>
            <div className="w-full shrink-0 sm:w-37.5">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={clearFilters} className="shrink-0">
                Clear filters
              </Button>
            )}
          </div>
          {canCreate && (
            <Button icon={<Plus size={18} />} onClick={() => navigate('/employees/new')}>
              Add Employee
            </Button>
          )}
        </div>

        {successMessage && (
          <p className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}{' '}
            <button type="button" onClick={() => setSuccessMessage(null)} className="font-medium underline">
              Dismiss
            </button>
          </p>
        )}
        {error && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <DataTable
          columns={columns}
          rows={employees}
          rowKey={(emp) => emp.id}
          loading={loading}
          emptyIcon={<Users size={28} />}
          emptyLabel="No employees found."
          footer={<Pagination meta={pagination} onPageChange={setPage} />}
        />
      </motion.div>

      <ConfirmDialog
        open={!!pendingAction}
        title={
          pendingAction?.type === 'delete'
            ? 'Delete this employee?'
            : pendingAction?.type === 'reactivate'
              ? 'Reactivate this employee?'
              : 'Deactivate this employee?'
        }
        description={
          pendingAction?.type === 'delete'
            ? `${pendingAction.employee.name} will be permanently removed. This cannot be undone.`
            : pendingAction?.type === 'reactivate'
              ? `${pendingAction?.employee.name} will be able to log in again.`
              : `${pendingAction?.employee.name} will no longer be able to log in.`
        }
        confirmLabel={
          pendingAction?.type === 'delete' ? 'Delete' : pendingAction?.type === 'reactivate' ? 'Reactivate' : 'Deactivate'
        }
        loading={actionLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </DashboardLayout>
  );
};

export default Employees;
