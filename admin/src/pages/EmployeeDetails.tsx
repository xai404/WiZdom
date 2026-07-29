import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Building2, User, Trash2, ClipboardList } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { fetchEmployeeById, deleteEmployee } from '../api/employees';
import type { Employee } from '../types';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
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
      navigate('/admin/employees');
    } catch {
      setError('Could not delete this employee.');
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout title="Employee Details" subtitle="View employee profile and activity.">
      <button
        onClick={() => navigate('/admin/employees')}
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-1">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-2xl font-semibold text-brand-600">
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-semibold text-slate-800">{employee.name}</h2>
              <span className="mt-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {employee.department}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              <DetailRow icon={Mail} label="Email" value={employee.email} />
              <DetailRow icon={Phone} label="Phone" value={employee.phone} />
              <DetailRow icon={Building2} label="Department" value={employee.department} />
              <DetailRow icon={User} label="Employee ID" value={employee.id} />
            </div>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleting ? 'Deleting…' : 'Delete Employee'}
            </button>
          </div>

          {/* Activity / assigned tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
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
          </div>
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