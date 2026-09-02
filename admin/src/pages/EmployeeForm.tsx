import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { addEmployee, fetchEmployeeById, updateEmployee } from '../api/employees';
import { Button, Card, FileDropzone, Input, Select } from '../components/ui';
import { generateStrongPassword } from '../utils/generatePassword';

// Add/Edit Employee form only — display labels are trimmed/renamed per the
// requested UI, but each `value` is still one of the existing backend enum
// members (Employee.js's DEPARTMENTS / role enum), so validation, storage,
// and every other screen that reads EMPLOYEE_DEPARTMENTS (Employees list
// filter, ChatComposer's department tag picker) are unaffected.
const DEPARTMENT_OPTIONS = [
  { label: 'Editing', value: 'Editing' },
  { label: 'Application', value: 'Application' },
  { label: 'Counselling', value: 'Counselling' },
  { label: 'Admin', value: 'Admin' },
  { label: 'Visa', value: 'Visa' },
  { label: 'Finance', value: 'Finance' },
] as const;

const ROLE_OPTIONS = [
  { label: 'Head', value: 'manager' },
  { label: 'Staff', value: 'staff' },
  { label: 'Admin', value: 'admin' },
  { label: 'Co Admin', value: 'co_admin' },
] as const;

interface FormState {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  password: string;
  isActive: boolean;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  department: '',
  role: 'staff',
  password: '',
  isActive: true,
};

const EmployeeForm = () => {
  const location = useLocation();
  // The employee id travels via router state instead of a URL param, so it
  // never shows up in the address bar — see EmployeeDetails.tsx/Employees.tsx
  // for the matching navigate(..., { state: { id } }) calls.
  const id = (location.state as { id?: string } | null)?.id;
  const isEdit = location.pathname !== '/employees/new';
  const navigate = useNavigate();
  const { user } = useAuth();

  // Editing someone ELSE requires super_admin or the 'admin' role; editing
  // your own record is always allowed but (below) can't touch
  // department/role/status — mirrors the backend's requireRoleOrSelf +
  // updateEmployee's isPrivileged field gate.
  const isPrivileged = user?.role === 'super_admin' || user?.role === 'admin';
  const isSelf = isEdit && id === user?.id;
  const canEditAdminFields = !isEdit || isPrivileged;

  const [form, setForm] = useState<FormState>(() =>
    isEdit ? emptyForm : { ...emptyForm, password: generateStrongPassword() }
  );
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [existingPicture, setExistingPicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!id) {
      // Reached /employees/edit directly (e.g. a refresh that lost router
      // state, or a typed/bookmarked URL) with no id to edit — bounce back
      // rather than getting stuck on an infinite loading spinner.
      if (isEdit) navigate('/employees', { replace: true });
      return;
    }
    if (!isPrivileged && !isSelf) {
      navigate('/unauthorized', { replace: true });
      return;
    }
    fetchEmployeeById(id)
      .then((emp) => {
        setForm({
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          role: emp.role ?? 'staff',
          password: '',
          isActive: emp.isActive ?? true,
        });
        setExistingPicture(emp.profilePicture ?? null);
      })
      .catch(() => setError('Could not load this employee.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (field: keyof FormState, value: string | boolean) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleGeneratePassword = () => {
    set('password', generateStrongPassword());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.phone || !form.department) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('Generate a password for this employee.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        role: form.role,
        isActive: form.isActive,
      };
      if (form.password) {
        payload.password = form.password;
      }
      if (profilePicture) payload.profilePicture = profilePicture;

      if (isEdit && id) {
        await updateEmployee(id, payload);
        navigate('/employees', {
          state: form.password ? { successMessage: 'Password reset — new login credentials were emailed to them.' } : undefined,
        });
      } else {
        await addEmployee(payload);
        navigate('/employees', { state: { successMessage: 'Employee created — login credentials were emailed to them.' } });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save this employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      subtitle={isEdit ? 'Update this team member’s details.' : 'Create a new team member account.'}
    >
      <button
        onClick={() => navigate('/employees')}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} />
        Back to Employees
      </button>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-400">Loading…</div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="mx-auto max-w-3xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <FileDropzone previewUrl={existingPicture} onFileSelect={setProfilePicture} />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Employee Name" icon={<User size={16} />} value={form.name} onChange={(e) => set('name', e.target.value)} />
                <Input label="Email" type="email" icon={<Mail size={16} />} value={form.email} onChange={(e) => set('email', e.target.value)} />
                <Input label="Phone Number" type="tel" icon={<Phone size={16} />} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                <Select
                  label="Department"
                  icon={<Building2 size={16} />}
                  value={form.department}
                  onChange={(e) => set('department', e.target.value)}
                  disabled={!canEditAdminFields}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {DEPARTMENT_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Role"
                  icon={<ShieldCheck size={16} />}
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  disabled={!canEditAdminFields}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Status"
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(e) => set('isActive', e.target.value === 'active')}
                  disabled={!canEditAdminFields}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  {isEdit ? 'New Password (optional)' : 'Password'}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    icon={<Lock size={16} />}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder={isEdit ? 'Leave blank to keep current password' : 'Generate a password'}
                    className="flex-1"
                    rightSlot={
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword((p) => !p)} className="text-slate-400 hover:text-slate-600">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />
                  <Button type="button" variant="secondary" icon={<Sparkles size={16} />} onClick={handleGeneratePassword}>
                    Generate Password
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => navigate('/employees')}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Save Employee
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default EmployeeForm;
