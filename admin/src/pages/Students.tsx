import { Users } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';

const Students = () => {
  return (
    <DashboardLayout title="Students" subtitle="Student management is coming soon.">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-brand-200 bg-white py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          <Users size={26} />
        </div>
        <h2 className="text-lg font-semibold text-slate-800">Student management coming soon</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          This section will let you add, edit, and manage student accounts.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Students;
