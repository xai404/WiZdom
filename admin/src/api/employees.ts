import api from './client';
import type { Employee, EmployeeDepartment, EmployeeRole } from '../types';
import type { PaginationMeta } from '../components/ui';

const normalize = (emp: any): Employee => ({
  id: emp._id ?? emp.id,
  name: emp.name,
  email: emp.email,
  phone: emp.phone,
  department: emp.department,
  designation: emp.designation,
  role: emp.role,
  profilePicture: emp.profilePicture,
  isActive: emp.isActive,
  createdAt: emp.createdAt,
});

export interface FetchEmployeesParams {
  search?: string;
  department?: EmployeeDepartment | '';
  role?: EmployeeRole | '';
  status?: 'active' | 'inactive' | '';
  page?: number;
  limit?: number;
}

export interface FetchEmployeesResult {
  data: Employee[];
  pagination: PaginationMeta;
}

export const fetchEmployees = async (params: FetchEmployeesParams = {}): Promise<FetchEmployeesResult> => {
  const res = await api.get('/employees', { params });
  return { data: res.data.data.map(normalize), pagination: res.data.pagination };
};

export const fetchEmployeeById = async (id: string): Promise<Employee> => {
  const res = await api.get(`/employees/${id}`);
  return normalize(res.data);
};

const toFormData = (payload: Record<string, unknown>): FormData => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
};

export const addEmployee = async (payload: Record<string, unknown>): Promise<Employee> => {
  const res = await api.post('/employees', toFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return normalize(res.data);
};

export const updateEmployee = async (id: string, payload: Record<string, unknown>): Promise<Employee> => {
  const res = await api.patch(`/employees/${id}`, toFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return normalize(res.data);
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await api.delete(`/employees/${id}`);
};

// Departments with at least one active employee — used to filter the chat
// "tag a team" picker down to teams that can actually pick the tag up.
// Tagging an unstaffed department (e.g. zero active employees) would set
// the student's awaitingReply/responsibleDepartment and then never
// auto-resolve, since that only happens when an employee FROM that
// department replies.
export const fetchActiveDepartments = async (): Promise<string[]> => {
  const res = await api.get('/employees/departments/active');
  return res.data.departments;
};
