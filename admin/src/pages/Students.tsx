import { useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import StudentsWorkspace from '../components/students/StudentsWorkspace';

const Students = () => {
  // Selection travels via router state, not a URL param, so the record id
  // never shows up in the address bar — see StudentsWorkspace.tsx and
  // NotificationBell.tsx's navigate(..., { state: { id } }) calls.
  const location = useLocation();
  const id = (location.state as { id?: string } | null)?.id;

  return (
    <DashboardLayout>
      <StudentsWorkspace selectedId={id ?? null} />
    </DashboardLayout>
  );
};

export default Students;
