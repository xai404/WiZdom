import { useState } from 'react';
import { Mail, Phone, Save, ShieldCheck, User } from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { updateMyProfile } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Avatar, Badge, Button, Card, EMPLOYEE_ROLE_TONE, FileDropzone, Input } from '../components/ui';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  staff: 'Staff',
  co_admin: 'Co Admin',
};

const MyProfile = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await updateMyProfile({ name: name.trim(), phone: phone.trim(), profilePicture });
      setUser(updated);
      setProfilePicture(null);
      setSaved(true);
    } catch {
      setError('Could not update your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="My Profile" subtitle="Manage your account details.">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card glass className="mx-auto max-w-2xl p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <Avatar name={user.name} src={user.profilePicture} size={88} className="mb-3 text-3xl" />
            <h2 className="text-lg font-semibold text-slate-800">{user.name}</h2>
            <Badge tone={EMPLOYEE_ROLE_TONE[user.role] ?? 'slate'}>{ROLE_LABEL[user.role] ?? user.role}</Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Profile updated.</p>}

            <FileDropzone previewUrl={user.profilePicture} onFileSelect={setProfilePicture} label="Profile Picture" />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Full Name" icon={<User size={16} />} value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Phone" type="tel" icon={<Phone size={16} />} value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Email" icon={<Mail size={16} />} value={user.email} disabled className="opacity-70" />
              <Input label="Role" icon={<ShieldCheck size={16} />} value={ROLE_LABEL[user.role] ?? user.role} disabled className="opacity-70" />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" icon={<Save size={16} />} loading={submitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default MyProfile;
