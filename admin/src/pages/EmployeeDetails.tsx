import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Trash2, Pencil, ClipboardList } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchEmployeeById, deleteEmployee } from '../api/employees';
import { Avatar, Badge, Button, Card, EMPLOYEE_ROLE_TONE } from '../components/ui';
import type { Employee } from '../types';

const EmployeeDetails = () => {
  const location = useLocation();
  // Id travels via router state, not a URL param, so it stays out of the
  // address bar — see Employees.tsx's navigate(..., { state: { id } }).
  const id = (location.state as { id?: string } | null)?.id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManageOthers = user?.role === 'super_admin' || user?.role === 'admin';
  const canEditThis = canManageOthers || id === user?.id;
  const canDelete = canManageOthers;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      // Reached directly with no id to show (e.g. a refresh that lost
      // router state, or a typed/bookmarked URL) — bounce back rather than
      // getting stuck on an infinite loading spinner.
      navigate('/employees', { replace: true });
      return;
    }
    setLoading(true);
    fetchEmployeeById(id)
      .then(setEmployee)
      .catch(() => setError('Could not load this employee.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    setDeleting(true);
    try {
      await deleteEmployee(id);
      navigate('/employees');
    } catch {
      setError('Could not delete this employee.');
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Employee Details" subtitle="View employee profile and activity.">
      <button
        onClick={() => navigate('/employees')}
        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft size={16} />
        Back to Employees
      </button>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-20 text-center text-slate-400">
          Loading employee…
        </div>
      ) : error || !employee ? (
        <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 py-20 text-center text-red-500">
          {error || 'Employee not found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Profile card */}
          <Card glass className="p-6 lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <Avatar name={employee.name} src={employee.profilePicture} size={80} className="mb-4 text-2xl" />
              <h2 className="text-lg font-semibold text-slate-800">{employee.name}</h2>
              <p className="mt-0.5 text-sm text-slate-400">{employee.designation || '—'}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge tone="slate">{employee.department}</Badge>
                <Badge tone={EMPLOYEE_ROLE_TONE[employee.role ?? 'staff']}>{employee.role ?? 'staff'}</Badge>
                <Badge tone={employee.isActive ? 'green' : 'slate'}>{employee.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <DetailRow icon={Mail} label="Email" value={employee.email} />
              <DetailRow icon={Phone} label="Phone" value={employee.phone} />
              <DetailRow icon={Building2} label="Department" value={employee.department} />
              <DetailRow icon={Briefcase} label="Designation" value={employee.designation || '—'} />
            </div>

            {(canEditThis || canDelete) && (
              <div className="mt-6 flex gap-3">
                {canEditThis && (
                  <Button variant="secondary" icon={<Pencil size={16} />} className="flex-1" onClick={() => navigate('/employees/edit', { state: { id: employee.id } })}>
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button variant="danger" icon={<Trash2 size={16} />} className="flex-1" onClick={handleDelete} loading={deleting}>
                    Delete
                  </Button>
                )}
              </div>
            )}
          </Card>

          {/* Activity / assigned tasks */}
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList size={18} className="text-brand-600" />
              <h3 className="text-base font-semibold text-slate-800">Assigned Tasks</h3>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-brand-200 bg-brand-50/40 py-14 text-center">
              <p className="text-sm font-medium text-slate-600">Task tracking coming soon</p>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Once task assignment is set up, {employee.name.split(' ')[0]}'s assigned tasks and
                activity history will appear here.
              </p>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
    <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" />
    <div className="min-w-0">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="truncate text-sm font-medium text-slate-700">{value}</p>
    </div>
  </div>
);

export default EmployeeDetails;
