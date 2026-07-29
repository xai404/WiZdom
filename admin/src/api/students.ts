import api from './client';
import type { Student } from '../types';

const normalize = (s: any): Student => ({
  id: s.id ?? s._id,
  name: s.name,
  email: s.email,
  phone: s.phone,
  gender: s.gender,
  countryInterested: s.countryInterested,
  course: s.course,
  intakeMonth: s.intakeMonth,
  intakeYear: s.intakeYear,
  isActive: s.isActive,
  lastLoginAt: s.lastLoginAt,
  createdAt: s.createdAt,
});

export const fetchStudents = async (): Promise<Student[]> => {
  const res = await api.get('/students');
  return res.data.map(normalize);
};

export const fetchStudentById = async (id: string): Promise<Student> => {
  const res = await api.get(`/students/${id}`);
  return normalize(res.data);
};

export const deleteStudent = async (id: string): Promise<void> => {
  await api.delete(`/students/${id}`);
};