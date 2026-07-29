import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Eye, EyeOff, Trash2, Plus, X, Mail, Phone, Building2, Lock, User } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { fetchEmployees, addEmployee, deleteEmployee } from '../api/employees';
import type { Employee, NewEmployee } from '../types';

const DEPARTMENTS = ['Editing', 'Application', 'Counsoller', 'Other'] as const;

const emptyForm: NewEmployee = {
  name: '',
  email: '',
  phone: '',
  department: '',
  password: '',
};

const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<NewEmployee>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEmployees = () => {
    setLoading(true);
    fetchEmployees()
      .then(setEmployees)
      .catch(() => setError('Could not load employees.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleFormChange = (field: keyof NewEmployee, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.name || !form.email || !form.phone || !form.department || !form.password) {
      setFormError('All fields are required.');
      return;
    }

    setSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticEmployee: Employee = {
      id: tempId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      department: form.department,
    };

    setEmployees((prev) => [optimisticEmployee, ...prev]);
    setForm(emptyForm);
    setShowAddModal(false);
    setShowPassword(false);

    try {
      const created = await addEmployee(form);
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === tempId ? created : emp))
      );
    } catch (err) {
      console.error('Add employee request failed:', err);
      setEmployees((prev) => prev.filter((emp) => emp.id !== tempId));
      setError('Could not save the employee to the server. Check the console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    setDeletingId(id);
    try {
      await deleteEmployee(id);
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
    } catch {
      setError('Could not delete employee.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout title="Employees" subtitle="Manage your employee accounts.">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${employees.length} employee${employees.length === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={() => {
            setForm(emptyForm);
            setFormError('');
            setShowPassword(false);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {error && (
        <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Phone Number</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Loading employees…
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Users size={28} />
                      <p className="text-sm">No employees yet. Add your first one.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{emp.name}</td>
                    <td className="px-5 py-3.5 text-slate-600">{emp.email}</td>
                    <td className="px-5 py-3.5 text-slate-600">{emp.phone}</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
                        {emp.department}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/employees/${emp.id}`)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand-600"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          disabled={deletingId === emp.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Add Employee</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
              )}

              <FormField
                icon={User}
                label="Name"
                type="text"
                value={form.name}
                onChange={(v) => handleFormChange('name', v)}
              />
              <FormField
                icon={Mail}
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => handleFormChange('email', v)}
              />
              <FormField
                icon={Phone}
                label="Phone Number"
                type="tel"
                value={form.phone}
                onChange={(v) => handleFormChange('phone', v)}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Department</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.department}
                    onChange={(e) => handleFormChange('department', e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password field with show/hide toggle */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-10 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {submitting ? 'Adding…' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const FormField = ({
  icon: Icon,
  label,
  type,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  </div>
);

export default Employees;