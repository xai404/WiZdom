import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import { ROLE_HOME_PATH, STAFF_ROLES } from './config/roles';
import Employees from './pages/Employees';
import EmployeeForm from './pages/EmployeeForm';
import EmployeeDetails from './pages/EmployeeDetails';
import Students from './pages/Students';
import StudentForm from './pages/StudentForm';
import MyProfile from './pages/MyProfile';

const RootRedirect = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME_PATH[user.role]} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute allowedRoles={STAFF_ROLES}>
                <Employees />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/new"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees/edit"
            element={
              // Any staff role may reach the edit page — EmployeeForm itself
              // further restricts to "editing self" or an admin/super_admin
              // role, matching the backend's requireRoleOrSelf check.
              <ProtectedRoute allowedRoles={STAFF_ROLES}>
                <EmployeeForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={STAFF_ROLES}>
                <Students />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/new"
            element={
              <ProtectedRoute allowedRoles={STAFF_ROLES}>
                <StudentForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/students/edit"
            element={
              <ProtectedRoute allowedRoles={STAFF_ROLES}>
                <StudentForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/employees/view"
            element={
              <ProtectedRoute allowedRoles={STAFF_ROLES}>
                <EmployeeDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/my-profile"
            element={
              <ProtectedRoute>
                <MyProfile />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;