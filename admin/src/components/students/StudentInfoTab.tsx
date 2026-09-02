import { Fragment, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, CalendarClock, Check, FileText, FolderOpen, GraduationCap, IdCard, Pencil, Plus, Save, Trash2, UserCheck, X } from 'lucide-react';
import { Badge, Button, Input, Select, STUDENT_STATUS_TONE } from '../ui';
import { updateStudent } from '../../api/students';
import { formatIntakeBadge } from '../../utils/countryFlags';
import {
  buildDefaultAcademicQualifications,
  buildDefaultDocumentChecklist,
  DOCUMENT_CHECKLIST_TEMPLATE,
  EMPTY_INTEREST_FORM,
  EMPTY_INTERNSHIP_ROW,
  EMPTY_LOR_RECOMMENDER,
  EMPTY_PERSONAL_DETAILS,
  EMPTY_SOP,
  type AcademicQualification,
  type DocumentChecklistItem,
  type InterestForm,
  type InternshipRow,
  type LorRecommender,
  type PersonalDetails,
  type SopDetails,
  type Student,
} from '../../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type AcademicField =
  | 'specializationSubjects'
  | 'yearOfPassing'
  | 'percentage'
  | 'backlogs'
  | 'schoolCollegeName'
  | 'boardUniversity';

const fmtDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

const intakeLine = (student: Student) => {
  const badge = formatIntakeBadge(student);
  return badge ? `${MONTHS[(student.intakeMonth ?? 1) - 1]} ${student.intakeYear}` : 'Intake not set';
};

const Area = ({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {hint && <span className="mb-1.5 block whitespace-pre-line text-xs leading-relaxed text-slate-400">{hint}</span>}
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    />
  </label>
);

const asList = (values: string[]) => (values && values.length ? values.join(', ') : '');
const splitList = (raw: string) => [...new Set(raw.split(',').map((s) => s.trim()).filter(Boolean))];
const yesNo = (v: string) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '');

// Read-only "Field / Response" document card — the default view for every
// SIF block. Mirrors the CRM's own SIF view / PDF.
const DocCard = ({
  title,
  subtitle,
  rows,
}: {
  title?: string;
  subtitle?: string;
  rows: [string, string][];
}) => (
  <div className="overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-(--shadow-soft)">
    {(title || subtitle) && (
      <div className="border-b border-brand-100 bg-brand-50/60 px-4 py-2.5">
        {title && <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{title}</p>}
        {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
      </div>
    )}
    <dl className="divide-y divide-slate-100">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-1 gap-0.5 px-4 py-2.5 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="text-xs font-medium text-slate-500 sm:text-sm">{label}</dt>
          <dd className="min-w-0 whitespace-pre-line wrap-break-word text-sm text-slate-800">{value.trim() || '—'}</dd>
        </div>
      ))}
    </dl>
  </div>
);

const buildInterestFormRows = (form: InterestForm): [string, string][] => [
  ['Name of the Applicant', form.applicantName],
  ['Mobile Number', form.mobile],
  ['Alternate Mobile / Telephone', form.alternateContact],
  ['Email ID', form.email],
  ['Preferred Countries', asList(form.preferredCountries)],
  ['Preferred Stream', asList(form.preferredStreams)],
  ['Comfortable Budget: Fee / year', form.budget],
  ['Preferred Intake (month & year)', form.preferredIntake],
  ['Entrance Test support', asList(form.entranceTestSupport)],
  ['Admission support', asList(form.admissionSupport)],
  ['Gift choice', form.giftChoice],
  ['How did you get to know about WiZdom?', form.hearAboutUs],
];

const buildPersonalRows = (p: PersonalDetails): [string, string][] => {
  const rows: [string, string][] = [
    ['Date of Birth', p.dateOfBirth],
    ['Any previous visa rejection?', yesNo(p.previousVisaRejection)],
  ];
  if (p.previousVisaRejection === 'yes') rows.push(['Visa rejection details', p.previousVisaRejectionDetails]);
  rows.push(
    ['Address', p.address],
    ['Emergency Contact Name', p.emergencyContactName],
    ['Emergency Contact Relationship', p.emergencyContactRelationship],
    ['Marital Status', p.maritalStatus],
  );
  if (p.maritalStatus === 'Married') rows.push(['Spouse Details', p.spouseDetails]);
  rows.push(
    ['Passport Number', p.passportNumber],
    ['Passport Date of Issue', p.passportDateOfIssue],
    ['Passport Date of Expiry', p.passportDateOfExpiry],
  );
  return rows;
};

const buildLorRows = (r: LorRecommender): [string, string][] => [
  ['Name of the Professor / Professional', r.professorName],
  ['Official Phone Number', r.contactPhone],
  ['Official Email ID', r.contactEmail],
  ['Degree Studied', r.degreeStudied],
  ['CGPA', r.cgpa],
  ['Subjects / Topics', r.subjectsTopics],
  ['Projects', r.projects],
  ['Internships / Extracurricular Activities', r.internshipsActivities],
];

const buildSopRows = (s: SopDetails): [string, string][] => [
  ['Course Name', s.courseName],
  ['Motivation to Pursue the Course', s.motivation],
  ['Additional Information', s.additionalInfo],
  ['What You Expect to Learn', s.expectationsToLearn],
  ['Future Plans After Graduation (focused on India)', s.futurePlans],
];

const buildInternshipRows = (r: InternshipRow): [string, string][] => [
  ['Name of Employer', r.nameOfEmployer],
  ['Address of Employer', r.addressOfEmployer],
  ['Your Designation', r.designation],
  ['Salary (Monthly)', r.salaryMonthly],
  ['Date From', r.dateFrom],
  ['Date To', r.dateTo],
];


const SectionTitle = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex items-center gap-2">
    {icon}
    <h3 className="text-sm font-semibold text-slate-800">{children}</h3>
  </div>
);

const ACADEMIC_COLUMNS: [AcademicField, string][] = [
  ['specializationSubjects', 'Specialization / Subjects'],
  ['yearOfPassing', 'Year of Passing'],
  ['percentage', 'Percentage (%)'],
  ['backlogs', 'Backlogs (if any)'],
  ['schoolCollegeName', 'School / College Name'],
  ['boardUniversity', 'Board / University'],
];

const cellInput =
  'w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

const AcademicTable = ({
  rows,
  editing,
  onCell,
}: {
  rows: AcademicQualification[];
  editing: boolean;
  onCell: (i: number, patch: Partial<AcademicQualification>) => void;
}) => (
  <div className="rounded-2xl border border-brand-100 bg-white shadow-(--shadow-soft)">
    {/* Wide screens: the full table, mirroring the paper form */}
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-brand-50/60 text-left text-[11px] uppercase tracking-wide text-brand-700">
            <th className="px-3 py-2 font-semibold">Level</th>
            {ACADEMIC_COLUMNS.map(([f, label]) => (
              <th key={f} className="px-3 py-2 font-semibold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.level || i} className="border-t border-slate-100">
              <td className="px-3 py-2 align-top text-[11px] font-medium text-slate-600">{row.level}</td>
              {ACADEMIC_COLUMNS.map(([field]) => (
                <td key={field} className="px-2 py-1.5 align-top">
                  {editing ? (
                    <input value={row[field]} onChange={(e) => onCell(i, { [field]: e.target.value })} className={cellInput} />
                  ) : (
                    <span className="block wrap-break-word text-xs text-slate-800">{row[field] || '—'}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Narrow screens: one stacked card per level */}
    <div className="divide-y divide-slate-100 lg:hidden">
      {rows.map((row, i) => (
        <div key={row.level || i} className="p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-700">{row.level}</p>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            {ACADEMIC_COLUMNS.map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-0.5 block text-[11px] font-medium text-slate-500">{label}</span>
                {editing ? (
                  <input value={row[field]} onChange={(e) => onCell(i, { [field]: e.target.value })} className={cellInput} />
                ) : (
                  <span className="block wrap-break-word text-xs text-slate-800">{row[field] || '—'}</span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

interface StudentInfoTabProps {
  student: Student;
  onStudentUpdated: (student: Student) => void;
}

const StudentInfoTab = ({ student, onStudentUpdated }: StudentInfoTabProps) => {
  const navigate = useNavigate();

  const readInitial = () => ({
    lor: student.sif?.lor?.length ? student.sif.lor : [{ ...EMPTY_LOR_RECOMMENDER }],
    sop: student.sif?.sop ?? { ...EMPTY_SOP },
    interestForm: { ...EMPTY_INTEREST_FORM, ...(student.sif?.interestForm ?? {}) },
    personal: { ...EMPTY_PERSONAL_DETAILS, ...(student.sif?.personalDetails ?? {}) },
    academics: student.sif?.academicQualifications?.length
      ? student.sif.academicQualifications
      : buildDefaultAcademicQualifications(),
    internships: student.sif?.internshipExperience?.length
      ? student.sif.internshipExperience
      : [{ ...EMPTY_INTERNSHIP_ROW }],
    documents: student.sif?.documentChecklist?.length
      ? student.sif.documentChecklist
      : buildDefaultDocumentChecklist(),
  });

  const init = readInitial();
  const [lor, setLor] = useState<LorRecommender[]>(init.lor);
  const [sop, setSop] = useState<SopDetails>(init.sop);
  const [personal, setPersonal] = useState<PersonalDetails>(init.personal);
  const [academics, setAcademics] = useState<AcademicQualification[]>(init.academics);
  const [internships, setInternships] = useState<InternshipRow[]>(init.internships);
  const [documents, setDocuments] = useState<DocumentChecklistItem[]>(init.documents);
  const [interestForm, setInterestForm] = useState<InterestForm>(init.interestForm);

  // The whole SIF is read-only until staff click "Edit SIF".
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [savedAt, setSavedAt] = useState(student.sif?.updatedAt ?? null);
  const [savedBy, setSavedBy] = useState(student.sif?.updatedByName ?? null);

  const snapshot = () =>
    JSON.stringify({ lor, interestForm, personal, academics, internships, documents, sop });
  const baselineRef = useRef(snapshot());
  const dirty = snapshot() !== baselineRef.current;

  const setInterest = (patch: Partial<InterestForm>) => setInterestForm((prev) => ({ ...prev, ...patch }));
  const setPersonalField = (patch: Partial<PersonalDetails>) => setPersonal((prev) => ({ ...prev, ...patch }));
  const setAcademicRow = (i: number, patch: Partial<AcademicQualification>) =>
    setAcademics((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const setInternshipRow = (i: number, patch: Partial<InternshipRow>) =>
    setInternships((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addInternship = () => setInternships((prev) => [...prev, { ...EMPTY_INTERNSHIP_ROW }]);
  const removeInternship = (i: number) =>
    setInternships((prev) => (prev.length === 1 ? [{ ...EMPTY_INTERNSHIP_ROW }] : prev.filter((_, idx) => idx !== i)));
  const setDocReady = (key: string, ready: DocumentChecklistItem['ready']) =>
    setDocuments((prev) => prev.map((d) => (d.key === key ? { ...d, ready } : d)));
  const setRecommender = (i: number, patch: Partial<LorRecommender>) =>
    setLor((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRecommender = () => setLor((prev) => [...prev, { ...EMPTY_LOR_RECOMMENDER }]);
  const removeRecommender = (i: number) =>
    setLor((prev) => (prev.length === 1 ? [{ ...EMPTY_LOR_RECOMMENDER }] : prev.filter((_, idx) => idx !== i)));
  const setSopField = (patch: Partial<SopDetails>) => setSop((prev) => ({ ...prev, ...patch }));

  const cancelEdit = () => {
    const next = readInitial();
    setLor(next.lor);
    setSop(next.sop);
    setInterestForm(next.interestForm);
    setPersonal(next.personal);
    setAcademics(next.academics);
    setInternships(next.internships);
    setDocuments(next.documents);
    setError('');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const cleanedLor = lor.filter((r) => Object.values(r).some((v) => v.trim()));
      const cleanedInternships = internships.filter((r) => Object.values(r).some((v) => v.trim()));
      const updated = await updateStudent(student.id, {
        sif: {
          lor: cleanedLor,
          interestForm,
          personalDetails: personal,
          academicQualifications: academics,
          internshipExperience: cleanedInternships,
          documentChecklist: documents,
          sop,
        },
      });
      onStudentUpdated(updated);
      const nextLor = updated.sif?.lor?.length ? updated.sif.lor : [{ ...EMPTY_LOR_RECOMMENDER }];
      const nextSop = updated.sif?.sop ?? { ...EMPTY_SOP };
      const nextInterest = { ...EMPTY_INTEREST_FORM, ...(updated.sif?.interestForm ?? {}) };
      const nextPersonal = { ...EMPTY_PERSONAL_DETAILS, ...(updated.sif?.personalDetails ?? {}) };
      const nextAcademics = updated.sif?.academicQualifications?.length
        ? updated.sif.academicQualifications
        : buildDefaultAcademicQualifications();
      const nextInternships = updated.sif?.internshipExperience?.length
        ? updated.sif.internshipExperience
        : [{ ...EMPTY_INTERNSHIP_ROW }];
      const nextDocuments = updated.sif?.documentChecklist?.length
        ? updated.sif.documentChecklist
        : buildDefaultDocumentChecklist();
      setLor(nextLor);
      setSop(nextSop);
      setInterestForm(nextInterest);
      setPersonal(nextPersonal);
      setAcademics(nextAcademics);
      setInternships(nextInternships);
      setDocuments(nextDocuments);
      setEditing(false);
      baselineRef.current = JSON.stringify({
        lor: nextLor,
        interestForm: nextInterest,
        personal: nextPersonal,
        academics: nextAcademics,
        internships: nextInternships,
        documents: nextDocuments,
        sop: nextSop,
      });
      setSavedAt(updated.sif?.updatedAt ?? new Date().toISOString());
      setSavedBy(updated.sif?.updatedByName ?? null);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save the SIF.');
    } finally {
      setSaving(false);
    }
  };

  const savedLine = fmtDateTime(savedAt);
  const interestRows = buildInterestFormRows(interestForm);
  const hasInterestForm = interestRows.some(([, value]) => value.trim());
  const filledLor = lor.filter((r) => Object.values(r).some((v) => v.trim()));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pb-2">
        {/* Slim record summary + link to the full editable record */}
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-100 bg-white p-4 shadow-(--shadow-soft)">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-slate-800">{student.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {student.groupName?.trim() && <span>{student.groupName}</span>}
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={12} className="text-slate-400" />
                {intakeLine(student)}
              </span>
              {student.assignedCounsellor && (
                <span className="inline-flex items-center gap-1">
                  <UserCheck size={12} className="text-slate-400" />
                  {student.assignedCounsellor}
                </span>
              )}
              <Badge tone={STUDENT_STATUS_TONE[student.status ?? 'Active'] ?? 'slate'}>{student.status ?? 'Active'}</Badge>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Pencil size={14} />}
            onClick={() => navigate('/students/edit', { state: { id: student.id } })}
          >
            Edit record
          </Button>
        </div>

        {/* SIF header — one Edit gate for the whole form */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-(--shadow-soft)">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Student Information Form</p>
            <p className="text-xs text-slate-400">
              {editing
                ? 'Editing — remember to Save SIF below.'
                : savedLine
                  ? `Last saved ${savedLine}${savedBy ? ` · ${savedBy}` : ''}`
                  : 'Read-only view'}
            </p>
          </div>
          {editing ? (
            <Button size="sm" variant="secondary" icon={<X size={14} />} onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
          ) : (
            <Button size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(true)}>
              Edit SIF
            </Button>
          )}
        </div>

        {/* ---- Student Interest Form (auto-filled from the CRM) ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<IdCard size={16} className="text-brand-600" />}>Student Interest Form</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-500">
            Auto-filled from the enquiry form the applicant submitted, matched on phone number. The student can also
            update it from the app.
          </p>

          {editing ? (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-(--shadow-soft) sm:grid-cols-2">
              <Input label="Name of the Applicant" value={interestForm.applicantName} onChange={(e) => setInterest({ applicantName: e.target.value })} />
              <Input label="Mobile Number" value={interestForm.mobile} onChange={(e) => setInterest({ mobile: e.target.value })} />
              <Input label="Email ID" value={interestForm.email} onChange={(e) => setInterest({ email: e.target.value })} />
              <Input label="Alternate Mobile / Telephone" value={interestForm.alternateContact} onChange={(e) => setInterest({ alternateContact: e.target.value })} />
              <Input label="Preferred Countries" placeholder="Separate with commas" value={asList(interestForm.preferredCountries)} onChange={(e) => setInterest({ preferredCountries: splitList(e.target.value) })} />
              <Input label="Preferred Stream" placeholder="Separate with commas" value={asList(interestForm.preferredStreams)} onChange={(e) => setInterest({ preferredStreams: splitList(e.target.value) })} />
              <Input label="Comfortable Budget: Fee / year" value={interestForm.budget} onChange={(e) => setInterest({ budget: e.target.value })} />
              <Input label="Preferred Intake (month & year)" value={interestForm.preferredIntake} onChange={(e) => setInterest({ preferredIntake: e.target.value })} />
              <Input label="Entrance Test support" placeholder="Separate with commas" value={asList(interestForm.entranceTestSupport)} onChange={(e) => setInterest({ entranceTestSupport: splitList(e.target.value) })} />
              <Input label="Admission support" placeholder="Separate with commas" value={asList(interestForm.admissionSupport)} onChange={(e) => setInterest({ admissionSupport: splitList(e.target.value) })} />
              <Input label="Gift choice" value={interestForm.giftChoice} onChange={(e) => setInterest({ giftChoice: e.target.value })} />
              <div className="sm:col-span-2">
                <Area label="How did you get to know about WiZdom?" value={interestForm.hearAboutUs} onChange={(v) => setInterest({ hearAboutUs: v })} />
              </div>
            </div>
          ) : hasInterestForm ? (
            <DocCard
              title="Student Interest Form"
              subtitle={interestForm.sourcedFromCrmAt ? `Received from CRM · ${fmtDateTime(interestForm.sourcedFromCrmAt)}` : undefined}
              rows={interestRows}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-(--shadow-soft)">
              No interest form on file for this student yet.
            </div>
          )}
        </div>

        {/* ---- Personal & Passport Details ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<IdCard size={16} className="text-brand-600" />}>Personal &amp; Passport Details</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-500">Filled by the student in the app.</p>

          {editing ? (
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-(--shadow-soft) sm:grid-cols-2">
              <Input label="Date of Birth" type="date" value={personal.dateOfBirth} onChange={(e) => setPersonalField({ dateOfBirth: e.target.value })} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Any previous visa rejection?</label>
                <Select
                  value={personal.previousVisaRejection}
                  onChange={(e) => setPersonalField({ previousVisaRejection: e.target.value as PersonalDetails['previousVisaRejection'] })}
                >
                  <option value="">Not answered</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </div>
              {personal.previousVisaRejection === 'yes' && (
                <div className="sm:col-span-2">
                  <Area label="Visa rejection details" hint="Which country, when, and the reason given if known." value={personal.previousVisaRejectionDetails} onChange={(v) => setPersonalField({ previousVisaRejectionDetails: v })} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Area label="Address" value={personal.address} onChange={(v) => setPersonalField({ address: v })} />
              </div>
              <Input label="Emergency Contact Name" value={personal.emergencyContactName} onChange={(e) => setPersonalField({ emergencyContactName: e.target.value })} />
              <Input label="Emergency Contact Relationship" placeholder="e.g. Father, Mother, Sibling" value={personal.emergencyContactRelationship} onChange={(e) => setPersonalField({ emergencyContactRelationship: e.target.value })} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Marital Status</label>
                <Select
                  value={personal.maritalStatus}
                  onChange={(e) => setPersonalField({ maritalStatus: e.target.value as PersonalDetails['maritalStatus'] })}
                >
                  <option value="">Not answered</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                </Select>
              </div>
              {personal.maritalStatus === 'Married' && (
                <div className="sm:col-span-2">
                  <Area label="Spouse Details" hint="Spouse's name, occupation, and whether they will accompany the student." value={personal.spouseDetails} onChange={(v) => setPersonalField({ spouseDetails: v })} />
                </div>
              )}
              <Input label="Passport Number" value={personal.passportNumber} onChange={(e) => setPersonalField({ passportNumber: e.target.value })} />
              <div className="hidden sm:block" />
              <Input label="Passport Date of Issue" type="date" value={personal.passportDateOfIssue} onChange={(e) => setPersonalField({ passportDateOfIssue: e.target.value })} />
              <Input label="Passport Date of Expiry" type="date" value={personal.passportDateOfExpiry} onChange={(e) => setPersonalField({ passportDateOfExpiry: e.target.value })} />
            </div>
          ) : (
            <DocCard rows={buildPersonalRows(personal)} />
          )}
        </div>

        {/* ---- Academic Qualifications ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<GraduationCap size={16} className="text-brand-600" />}>Academic Qualifications</SectionTitle>
          <AcademicTable rows={academics} editing={editing} onCell={setAcademicRow} />
        </div>

        {/* ---- Internship / Industry Experience ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<Briefcase size={16} className="text-brand-600" />}>
            Internship / Industry Experience
          </SectionTitle>
          {editing ? (
            <>
              {internships.map((row, i) => (
                <div key={i} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-(--shadow-soft)">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">Experience {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeInternship(i)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="Name of Employer" value={row.nameOfEmployer} onChange={(e) => setInternshipRow(i, { nameOfEmployer: e.target.value })} />
                    <Input label="Your Designation" value={row.designation} onChange={(e) => setInternshipRow(i, { designation: e.target.value })} />
                    <Input label="Salary (Monthly)" value={row.salaryMonthly} onChange={(e) => setInternshipRow(i, { salaryMonthly: e.target.value })} />
                    <div className="hidden sm:block" />
                    <Input label="Date From" type="date" value={row.dateFrom} onChange={(e) => setInternshipRow(i, { dateFrom: e.target.value })} />
                    <Input label="Date To" type="date" value={row.dateTo} onChange={(e) => setInternshipRow(i, { dateTo: e.target.value })} />
                    <div className="sm:col-span-2">
                      <Area label="Address of Employer" value={row.addressOfEmployer} onChange={(v) => setInternshipRow(i, { addressOfEmployer: v })} />
                    </div>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={addInternship}>
                Add another experience
              </Button>
            </>
          ) : internships.some((r) => Object.values(r).some((v) => v.trim())) ? (
            internships
              .filter((r) => Object.values(r).some((v) => v.trim()))
              .map((r, i) => <DocCard key={i} title={`Experience ${i + 1}`} rows={buildInternshipRows(r)} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-(--shadow-soft)">
              No work experience recorded.
            </div>
          )}
        </div>

        {/* ---- LOR ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<GraduationCap size={16} className="text-brand-600" />}>
            Details Required for Letter of Recommendation (LOR)
          </SectionTitle>
          <p className="text-xs leading-relaxed text-slate-500">
            Information about the professor or professional who will be recommending the student. These details help
            prepare the LOR based on their actual academic or professional interaction. Add one block per recommender.
          </p>

          {editing ? (
            <>
              {lor.map((r, i) => (
                <div key={i} className="rounded-2xl border border-brand-100 bg-white p-4 shadow-(--shadow-soft)">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">Recommender {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeRecommender(i)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="Name of the Professor / Professional" value={r.professorName} onChange={(e) => setRecommender(i, { professorName: e.target.value })} />
                    <Input label="Official Phone Number" value={r.contactPhone} onChange={(e) => setRecommender(i, { contactPhone: e.target.value })} />
                    <Input label="Official Email ID" value={r.contactEmail} onChange={(e) => setRecommender(i, { contactEmail: e.target.value })} />
                    <Input label="Degree Studied" placeholder="e.g. BA in English" value={r.degreeStudied} onChange={(e) => setRecommender(i, { degreeStudied: e.target.value })} />
                    <Input label="CGPA" value={r.cgpa} onChange={(e) => setRecommender(i, { cgpa: e.target.value })} />
                  </div>

                  <div className="mt-3 space-y-3">
                    <Area label="Subjects / Topics" hint="Subjects or papers they taught the student, or the topics they worked with the student on." value={r.subjectsTopics} onChange={(v) => setRecommender(i, { subjectsTopics: v })} />
                    <Area label="Projects" hint="Any academic, research, or professional projects the student completed under their guidance." value={r.projects} onChange={(v) => setRecommender(i, { projects: v })} />
                    <Area label="Internships / Extracurricular Activities" hint="Any internship, leadership role, competition, event, or other notable activity the student was involved in." value={r.internshipsActivities} onChange={(v) => setRecommender(i, { internshipsActivities: v })} />
                  </div>
                </div>
              ))}

              <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={addRecommender}>
                Add another recommender
              </Button>
            </>
          ) : filledLor.length ? (
            filledLor.map((r, i) => <DocCard key={i} title={`Recommender ${i + 1}`} rows={buildLorRows(r)} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400 shadow-(--shadow-soft)">
              No recommender details yet.
            </div>
          )}
        </div>

        {/* ---- SOP ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<FileText size={16} className="text-brand-600" />}>
            Details Required for Statement of Purpose (SOP)
          </SectionTitle>
          <p className="text-xs leading-relaxed text-slate-500">
            The student&apos;s academic background, interests, motivation, and future plans. Simple points are fine —
            they need not be in paragraph form. The SOP is modified and customised per the university&apos;s requirement.
          </p>

          {editing ? (
            <div className="rounded-2xl border border-brand-100 bg-white p-4 shadow-(--shadow-soft)">
              <div className="space-y-3">
                <Input label="Course Name" placeholder="Exact name of the course the student plans to pursue" value={sop.courseName} onChange={(e) => setSopField({ courseName: e.target.value })} />
                <Area label="Motivation to Pursue the Course" hint="Why the student wants to study this particular course — a personal experience, academic interest, professional experience, career-related interest, or something observed in the industry or personal life." value={sop.motivation} onChange={(v) => setSopField({ motivation: v })} rows={4} />
                <Area label="Additional Information" hint="Any other personal, academic, professional, or relevant information the student would like to include in the SOP." value={sop.additionalInfo} onChange={(v) => setSopField({ additionalInfo: v })} />
                <Area label="What You Expect to Learn" hint="Knowledge, skills, or areas of expertise the student hopes to gain from the course. May also mention specific modules of interest and why." value={sop.expectationsToLearn} onChange={(v) => setSopField({ expectationsToLearn: v })} rows={4} />
                <Area
                  label="Future Plans After Graduation (focused on India)"
                  hint={
                    'What the student plans to do after the course, focused on India. May mention:\n' +
                    '• Companies or industries they would like to work in\n' +
                    '• A family business they plan to join or expand\n' +
                    '• A business idea or startup they would like to pursue\n' +
                    '• A specific area or sector where they would like to build their career\n' +
                    '• How they would like to apply the knowledge and skills gained from the course in India'
                  }
                  value={sop.futurePlans}
                  onChange={(v) => setSopField({ futurePlans: v })}
                  rows={5}
                />
              </div>
            </div>
          ) : (
            <DocCard rows={buildSopRows(sop)} />
          )}
        </div>

        {/* ---- Documents Ready With You ---- */}
        <div className="space-y-3">
          <SectionTitle icon={<FolderOpen size={16} className="text-brand-600" />}>Documents Ready With You</SectionTitle>
          <p className="text-xs leading-relaxed text-slate-500">
            Which documents the student already has. Items marked <span className="font-medium">*</span> are not
            mandatory.
          </p>

          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-(--shadow-soft)">
            {DOCUMENT_CHECKLIST_TEMPLATE.map((tpl, idx) => {
              const ready = documents.find((d) => d.key === tpl.key)?.ready ?? '';
              const showDevHeader =
                tpl.section === 'developed' && DOCUMENT_CHECKLIST_TEMPLATE[idx - 1]?.section !== 'developed';
              return (
                <Fragment key={tpl.key}>
                  {showDevHeader && (
                    <p className="bg-slate-50 px-3.5 py-2 text-[11px] font-medium text-slate-400">
                      Developed based on the student&apos;s country / university choices
                    </p>
                  )}
                  <div className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700">
                        {tpl.name}
                        {tpl.optional ? ' *' : ''}
                      </p>
                      <p className="truncate text-[11px] text-slate-400">{tpl.format}</p>
                    </div>
                    {editing ? (
                      <div className="w-24 shrink-0">
                        <Select
                          value={ready}
                          onChange={(e) => setDocReady(tpl.key, e.target.value as DocumentChecklistItem['ready'])}
                        >
                          <option value="">—</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </Select>
                      </div>
                    ) : (
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          ready === 'yes' ? 'text-emerald-600' : ready === 'no' ? 'text-slate-400' : 'text-slate-300'
                        }`}
                      >
                        {ready === 'yes' ? 'Yes' : ready === 'no' ? 'No' : '—'}
                      </span>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save bar — only while editing */}
      {editing && (
        <div className="shrink-0 border-t border-slate-100 pt-3">
          {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          {justSaved && (
            <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <Check size={13} />
              SIF saved successfully
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">{dirty ? 'Unsaved changes' : 'No changes yet'}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" icon={<Save size={14} />} loading={saving} disabled={!dirty} onClick={handleSave}>
                Save SIF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved-state footer when not editing */}
      {!editing && justSaved && (
        <div className="shrink-0 border-t border-slate-100 pt-3">
          <p className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <Check size={13} />
            SIF saved successfully
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentInfoTab;
