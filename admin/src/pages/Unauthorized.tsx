import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
    <h1 className="text-2xl font-semibold text-slate-900">Access denied</h1>
    <p className="text-slate-500">You don't have permission to view this page.</p>
    <Link to="/dashboard" className="mt-2 font-medium text-brand-600 hover:underline">
      Back to dashboard
    </Link>
  </div>
);

export default Unauthorized;