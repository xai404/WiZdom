import api from './client';
import type { Employee, NewEmployee } from '../types';

const normalize = (emp: any): Employee => ({
  id: emp._id,
  name: emp.name,
  email: emp.email,
  phone: emp.phone,
  department: emp.department,
});

export const fetchEmployees = async (): Promise<Employee[]> => {
  const res = await api.get('/employees');
  return res.data.map(normalize);
};

export const fetchEmployeeById = async (id: string): Promise<Employee> => {
  const res = await api.get(`/employees/${id}`);
  return normalize(res.data);
};

export const addEmployee = async (payload: NewEmployee): Promise<Employee> => {
  try {
    const res = await api.post('/employees', payload);
    return normalize(res.data);
  } catch (err: any) {
    console.error('Backend said:', err.response?.data);
    throw err;
  }
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await api.delete(`/employees/${id}`);
};