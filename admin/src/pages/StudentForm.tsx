import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, CreditCard, Globe2, Lock, Mail, Phone, Sparkles, User, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { createStudent, fetchStudentById, updateStudent } from '../api/students';
import { Badge, Button, Card, Input, Select } from '../components/ui';
import { PAYMENT_STATUSES, STUDENT_STATUSES, type PaymentStatus, type StudentStatus } from '../types';
import { generateStrongPassword } from '../utils/generatePassword';

const COUNTRIES = [
  'USA', 'UK', 'Canada', 'Australia', 'Germany', 'Ireland', 'New Zealand',
  'Czech Republic', 'Dubai (UAE)', 'Finland', 'Cyprus', 'Denmark', 'France', 'Italy',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i);

interface FormState {
  name: string;
  email: string;
  phone: string;
  countryInterested: string[];
  intakeMonth: string;
  intakeYear: string;
  status: StudentStatus;
  groupName: string;
  paymentStatus: PaymentStatus | '';
  password: string;
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  countryInterested: [],
  intakeMonth: '',
  intakeYear: '',
  status: 'Active',
  groupName: '',
  paymentStatus: '',
  password: '',
};

const StudentForm = () => {
  const location = useLocation();
  // Id travels via router state, not a URL param, so it stays out of the
  // address bar — see StudentsWorkspace.tsx's navigate(..., { state: { id } }).
  const id = (location.state as { id?: string } | null)?.id;
  const isEdit = location.pathname !== '/students/new';
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() =>
    isEdit ? emptyForm : { ...emptyForm, password: generateStrongPassword() }
  );
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetPassword, setResetPassword] = useState(false);

  useEffect(() => {
    if (!id) {
      // Reached /students/edit directly (e.g. a refresh that lost router
      // state, or a typed/bookmarked URL) with no id to edit — bounce back
      // rather than getting stuck on an infinite loading spinner.
      if (isEdit) navigate('/students', { replace: true });
      return;
    }
    fetchStudentById(id)
      .then((s) => {
        setForm({
          name: s.name,
          email: s.email,
          phone: s.phone ?? '',
          countryInterested: s.countryInterested ?? [],
          intakeMonth: s.intakeMonth ? String(s.intakeMonth) : '',
          intakeYear: s.intakeYear ? String(s.intakeYear) : '',
          status: s.status ?? 'Active',
          groupName: s.groupName ?? '',
          paymentStatus: s.paymentStatus ?? '',
          password: '',
        });
      })
      .catch(() => setError('Could not load this student.'))
      .finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addCountry = (country: string) => {
    if (!country || form.countryInterested.includes(country)) return;
    set('countryInterested', [...form.countryInterested, country]);
  };
  const removeCountry = (country: string) => set('countryInterested', form.countryInterested.filter((c) => c !== country));

  const handleGeneratePassword = () => {
    set('password', generateStrongPassword());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email) {
      setError('Name and email are required.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('Generate a password for this student.');
      return;
    }
    if (isEdit && resetPassword && !form.password) {
      setError('Generate a new password, or cancel the password reset.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        countryInterested: form.countryInterested,
        intakeMonth: form.intakeMonth ? Number(form.intakeMonth) : null,
        intakeYear: form.intakeYear ? Number(form.intakeYear) : null,
        status: form.status,
        groupName: form.groupName,
        paymentStatus: form.paymentStatus || null,
      };

      if (isEdit && id) {
        if (resetPassword && form.password) {
          payload.password = form.password;
        }
        await updateStudent(id, payload);
        navigate('/students', {
          state: resetPassword ? { successMessage: 'Password reset — new login credentials were emailed to them.' } : undefined,
        });
      } else {
        payload.password = form.password;
        await createStudent(payload);
        navigate('/students', {
          state: { successMessage: 'Student created — login credentials were emailed to them.' },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not save this student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={isEdit ? 'Edit Student' : 'Add Student'}
      subtitle={isEdit ? 'Update this student’s record.' : 'Create a new student record and portal login.'}
    >
      <button
        onClick={() => navigate('/students')}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} />
        Back to Students
      </button>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-400">Loading…</div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="mx-auto max-w-3xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full Name" icon={<User size={16} />} value={form.name} onChange={(e) => set('name', e.target.value)} />
                <Input label="Email" type="email" icon={<Mail size={16} />} value={form.email} onChange={(e) => set('email', e.target.value)} />
                <Input label="Phone" type="tel" icon={<Phone size={16} />} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                <Input
                  label="Group Name"
                  icon={<Users size={16} />}
                  value={form.groupName}
                  onChange={(e) => set('groupName', e.target.value)}
                />
                <div>
                  <Select
                    label="Status"
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as StudentStatus)}
                    className={form.status === 'Closed' ? 'border-red-400 bg-red-50 font-semibold text-red-600' : ''}
                  >
                    {isEdit ? (
                      // A legacy record may still hold a retired status
                      // value ('Converted', 'Lead', 'Follow Up') — surface
                      // it as an option so the Select doesn't silently
                      // render the first entry ('Active') over the real,
                      // unsaved value.
                      (STUDENT_STATUSES as readonly string[]).includes(form.status)
                        ? STUDENT_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))
                        : [form.status, ...STUDENT_STATUSES].map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))
                    ) : (
                      <>
                        <option value="Active">Active</option>
                        <option value="Closed">Deactivate</option>
                      </>
                    )}
                  </Select>
                  {form.status === 'Closed' && (
                    <p className="mt-1.5 text-xs font-medium text-red-500">
                      Closed accounts are deactivated — this student will not be able to log in to the app.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Country Chosen</label>
                <Select icon={<Globe2 size={16} />} value="" onChange={(e) => addCountry(e.target.value)}>
                  <option value="">Add a country…</option>
                  {COUNTRIES.filter((c) => !form.countryInterested.includes(c)).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
                {form.countryInterested.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.countryInterested.map((c) => (
                      <span key={c} className="inline-flex">
                        <Badge tone="blue">
                          <span className="flex items-center gap-1">
                            {c}
                            <button type="button" onClick={() => removeCountry(c)} className="hover:text-blue-900">
                              <X size={12} />
                            </button>
                          </span>
                        </Badge>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <CalendarClock size={16} className="text-slate-400" />
                    Intake Month
                  </label>
                  <Select value={form.intakeMonth} onChange={(e) => set('intakeMonth', e.target.value)}>
                    <option value="">Not set</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <CalendarClock size={16} className="text-slate-400" />
                    Intake Year
                  </label>
                  <Select value={form.intakeYear} onChange={(e) => set('intakeYear', e.target.value)}>
                    <option value="">Not set</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <CreditCard size={16} className="text-slate-400" />
                    Payment Confirmation
                  </label>
                  <Select
                    value={form.paymentStatus}
                    onChange={(e) => set('paymentStatus', e.target.value as PaymentStatus | '')}
                  >
                    <option value="">Not set</option>
                    {PAYMENT_STATUSES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {!isEdit && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password (Auto Generated)</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      icon={<Lock size={16} />}
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" icon={<Sparkles size={16} />} onClick={handleGeneratePassword}>
                      Generate Password
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">This password will be emailed to the student.</p>
                </div>
              )}

              {isEdit && !resetPassword && (
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    icon={<Lock size={16} />}
                    onClick={() => setResetPassword(true)}
                  >
                    Reset Password
                  </Button>
                </div>
              )}

              {isEdit && resetPassword && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      icon={<Lock size={16} />}
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="secondary" icon={<Sparkles size={16} />} onClick={handleGeneratePassword}>
                      Generate Password
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setResetPassword(false);
                        set('password', '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">This new password will be emailed to the student.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => navigate('/students')}>
                  Cancel
                </Button>
                <Button type="submit" loading={submitting}>
                  Save Student
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default StudentForm;
