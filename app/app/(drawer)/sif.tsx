import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import {
  AddRowButton,
  ErrorNote,
  Field,
  IntroNote,
  LoadErrorBanner,
  RowCard,
  SaveBar,
  savedTimeNote,
} from '@/components/sif-form';
import { Toast } from '@/components/toast';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/context/auth-context';
import { SCHOLARSHIP_INTRO, SCHOLARSHIP_TERMS, STUDENT_UNDERTAKING } from '@/constants/sif-terms';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  buildDefaultAcademicQualifications,
  buildDefaultDocumentChecklist,
  DOCUMENT_CHECKLIST_TEMPLATE,
  EMPTY_INTEREST_FORM,
  EMPTY_INTERNSHIP_ROW,
  EMPTY_PERSONAL_DETAILS,
  EMPTY_PROFESSIONAL_DETAILS,
  fetchMySif,
  updateMySif,
  type AcademicQualification,
  type DocumentChecklistItem,
  type InterestForm,
  type InternshipRow,
  type PersonalDetails,
  type ProfessionalDetails,
  type SifUpdate,
} from '@/lib/sif-api';

const PRIMARY = '#1d4ed8';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animateNext = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));

const asList = (values: string[]) => (values && values.length ? values.join(', ') : '');

// The Student Interest Form as a fixed Field / Response list — pre-filled
// from the CRM enquiry. Shown as a summary until the student taps Edit.
// Mirrors the admin panel's SIF document.
const buildInterestRows = (f: InterestForm): [string, string][] => [
  ['Name of the Applicant', f.applicantName],
  ['Mobile Number', f.mobile],
  ['Alternate Mobile / Telephone', f.alternateContact],
  ['Email ID', f.email],
  ['Preferred Countries', asList(f.preferredCountries)],
  ['Preferred Stream', asList(f.preferredStreams)],
  ['Comfortable Budget: Fee / year', f.budget],
  ['Preferred Intake (month & year)', f.preferredIntake],
  ['Entrance Test support', asList(f.entranceTestSupport)],
  ['Admission support', asList(f.admissionSupport)],
  ['Gift choice', f.giftChoice],
  ['How did you get to know about WiZdom?', f.hearAboutUs],
];

type InterestTextKey = {
  [K in keyof InterestForm]-?: InterestForm[K] extends string ? K : never;
}[keyof InterestForm];
type InterestListKey = {
  [K in keyof InterestForm]-?: InterestForm[K] extends string[] ? K : never;
}[keyof InterestForm];

// Edit-mode field list, same order as buildInterestRows. List fields are
// typed as comma-separated text.
const INTEREST_FIELDS: (
  | { kind: 'text'; key: InterestTextKey; label: string; keyboardType?: 'email-address' | 'phone-pad' }
  | { kind: 'list'; key: InterestListKey; label: string }
)[] = [
  { kind: 'text', key: 'applicantName', label: 'Name of the Applicant' },
  { kind: 'text', key: 'mobile', label: 'Mobile Number', keyboardType: 'phone-pad' },
  { kind: 'text', key: 'alternateContact', label: 'Alternate Mobile / Telephone', keyboardType: 'phone-pad' },
  { kind: 'text', key: 'email', label: 'Email ID', keyboardType: 'email-address' },
  { kind: 'list', key: 'preferredCountries', label: 'Preferred Countries' },
  { kind: 'list', key: 'preferredStreams', label: 'Preferred Stream' },
  { kind: 'text', key: 'budget', label: 'Comfortable Budget: Fee / year' },
  { kind: 'text', key: 'preferredIntake', label: 'Preferred Intake (month & year)' },
  { kind: 'list', key: 'entranceTestSupport', label: 'Entrance Test support' },
  { kind: 'list', key: 'admissionSupport', label: 'Admission support' },
  { kind: 'text', key: 'giftChoice', label: 'Gift choice' },
  { kind: 'text', key: 'hearAboutUs', label: 'How did you get to know about WiZdom?' },
];

// split/join round-trip the student's typing exactly ("USA, " stays "USA, ")
// — trimming and blank-removal happen once, on save.
const splitList = (text: string) => (text ? text.split(/, ?/) : []);
const cleanList = (values: string[]) => values.map((v) => v.trim()).filter(Boolean);

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`px-4 py-2.5 ${last ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}>
      <Text className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </Text>
      <Text className="text-[13.5px] leading-5 text-slate-800 dark:text-slate-100">{value.trim() || '—'}</Text>
    </View>
  );
}

// Internship and Industry Experience rows share the same editor:
// company, designation, working from / to.
function ExperienceList({
  rows,
  onChange,
  itemLabel,
  addLabel,
}: {
  rows: InternshipRow[];
  onChange: (rows: InternshipRow[]) => void;
  itemLabel: string;
  addLabel: string;
}) {
  const today = new Date();
  const setRow = (i: number, patch: Partial<InternshipRow>) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRow = (i: number) =>
    onChange(rows.length === 1 ? [{ ...EMPTY_INTERNSHIP_ROW }] : rows.filter((_, idx) => idx !== i));
  return (
    <>
      {rows.map((row, i) => (
        <RowCard key={i} title={`${itemLabel} ${i + 1}`} onRemove={() => removeRow(i)}>
          <Field label="Name of the Company" value={row.nameOfEmployer} onChangeText={(v) => setRow(i, { nameOfEmployer: v })} />
          <Field label="Designation" value={row.designation} onChangeText={(v) => setRow(i, { designation: v })} />
          <DateField label="Working From" value={row.dateFrom} onChange={(v) => setRow(i, { dateFrom: v })} maxYear={today.getFullYear()} />
          <DateField label="Working To" value={row.dateTo} onChange={(v) => setRow(i, { dateTo: v })} maxYear={today.getFullYear()} />
        </RowCard>
      ))}
      <AddRowButton label={addLabel} onPress={() => onChange([...rows, { ...EMPTY_INTERNSHIP_ROW }])} />
    </>
  );
}

// Single-select pill row (Yes/No, Single/Married).
function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="mb-3.5">
      <Text className="mb-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</Text>
      <View className="flex-row flex-wrap">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(selected ? '' : opt)}
              className={`mb-2 mr-2 rounded-full border px-4 py-1.5 active:opacity-80 ${
                selected
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}>
              <Text
                className={`text-[12.5px] ${
                  selected
                    ? 'font-semibold text-brand-700 dark:text-brand-200'
                    : 'text-slate-600 dark:text-slate-300'
                }`}>
                {opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const countFilled = (obj: Record<string, unknown>) =>
  Object.values(obj).filter((v) =>
    Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : Boolean(v),
  ).length;

// Top-level collapsible section card.
function Collapsible({
  icon,
  title,
  status,
  tone = 'accent',
  open,
  onToggle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  status?: string;
  tone?: 'accent' | 'done' | 'muted';
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { isDark } = useAppTheme();
  const statusColor =
    tone === 'done'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'muted'
        ? 'text-slate-400 dark:text-slate-500'
        : 'text-brand-600 dark:text-brand-300';
  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-card-dark">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center gap-3 px-3.5 py-3 active:bg-slate-50 dark:active:bg-slate-800/40">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
          <Ionicons name={icon} size={17} color={isDark ? '#93c5fd' : PRIMARY} />
        </View>
        <View className="flex-1">
          <Text className="text-[14px] font-bold text-slate-900 dark:text-white">{title}</Text>
          {status ? <Text className={`mt-0.5 text-[11.5px] ${statusColor}`}>{status}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={isDark ? '#64748b' : '#94a3b8'} />
      </Pressable>
      {open ? (
        <View className="border-t border-slate-100 px-3.5 pb-4 pt-3.5 dark:border-slate-800">{children}</View>
      ) : null}
    </View>
  );
}

// Lighter nested collapsible (used for the academic-qualification rows).
function SubCard({
  title,
  summary,
  filled,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary?: string;
  filled: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { isDark } = useAppTheme();
  return (
    <View className="mb-2.5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <Pressable
        onPress={onToggle}
        className="flex-row items-center gap-2 bg-slate-50 px-3 py-2.5 active:opacity-80 dark:bg-slate-800/50">
        <View
          className={`h-1.5 w-1.5 rounded-full ${filled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
        />
        <View className="flex-1">
          <Text className="text-[12.5px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
            {title}
          </Text>
          {summary ? (
            <Text className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500" numberOfLines={1}>
              {summary}
            </Text>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={isDark ? '#64748b' : '#94a3b8'} />
      </Pressable>
      {open ? <View className="px-3 pb-3 pt-3">{children}</View> : null}
    </View>
  );
}

export default function SifScreen() {
  const { token } = useAuth();
  const { isDark } = useAppTheme();

  // The form (the questions) is static content and always renders. Only the
  // *saved answers* come from the network — while that's in flight or if it
  // fails, the fields just stay at their defaults.
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [personal, setPersonal] = useState<PersonalDetails>({ ...EMPTY_PERSONAL_DETAILS });
  const [academics, setAcademics] = useState<AcademicQualification[]>(buildDefaultAcademicQualifications());
  const [internships, setInternships] = useState<InternshipRow[]>([{ ...EMPTY_INTERNSHIP_ROW }]);
  const [industry, setIndustry] = useState<InternshipRow[]>([{ ...EMPTY_INTERNSHIP_ROW }]);
  const [professional, setProfessional] = useState<ProfessionalDetails>({ ...EMPTY_PROFESSIONAL_DETAILS });
  // Terms & Conditions: `termsAcceptedAt` is the server's record; `agreeTicked`
  // is the checkbox before it has been saved. Once accepted it can't be undone.
  const [termsAcceptedAt, setTermsAcceptedAt] = useState<string | null>(null);
  const [agreeTicked, setAgreeTicked] = useState(false);
  const [documents, setDocuments] = useState<DocumentChecklistItem[]>(buildDefaultDocumentChecklist());
  // Pre-filled from the CRM enquiry; editable via the section's Edit button.
  // Always sent back in full — the server's sanitizeSif rebuilds the whole
  // object, so dropping it from the payload would wipe it.
  const [interestForm, setInterestForm] = useState<InterestForm>({ ...EMPTY_INTEREST_FORM });
  const [editingInterest, setEditingInterest] = useState(false);

  // Which accordion sections are expanded — everything starts collapsed so
  // the screen opens as a short, scannable list of sections.
  const [openKey, setOpenKey] = useState<string | null>('personal');
  const [openAcademic, setOpenAcademic] = useState<number | null>(null);
  const toggleSection = (key: string) => {
    animateNext();
    setOpenKey((prev) => (prev === key ? null : key));
  };
  const toggleAcademic = (i: number) => {
    animateNext();
    setOpenAcademic((prev) => (prev === i ? null : i));
  };

  // Matches the pristine initial state so an untouched form never reads as
  // "Unsaved changes".
  const baselineRef = useRef(
    JSON.stringify({
      interestForm: EMPTY_INTEREST_FORM,
      personal: EMPTY_PERSONAL_DETAILS,
      academics: buildDefaultAcademicQualifications(),
      internships: [EMPTY_INTERNSHIP_ROW],
      industry: [EMPTY_INTERNSHIP_ROW],
      professional: EMPTY_PROFESSIONAL_DETAILS,
      documents: buildDefaultDocumentChecklist(),
    }),
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadError(false);
    fetchMySif(token)
      .then((data) => {
        if (cancelled) return;
        // Only overwrite the fields if the server actually has answers —
        // never clobber something the student has already started typing.
        const hasInterest = Object.entries(data.interestForm).some(
          ([k, v]) => k !== 'sourcedFromCrmAt' && (Array.isArray(v) ? v.length : v),
        );
        if (hasInterest) setInterestForm(data.interestForm);
        const hasPersonal = Object.values(data.personalDetails).some((v) => v);
        if (hasPersonal) setPersonal(data.personalDetails);
        const hasAcademics = data.academicQualifications.some((r) =>
          Object.entries(r).some(([k, v]) => k !== 'level' && v),
        );
        if (hasAcademics) setAcademics(data.academicQualifications);
        const hasInternships = data.internshipExperience.some((r) => Object.values(r).some((v) => v));
        if (hasInternships) setInternships(data.internshipExperience);
        const hasIndustry = data.industryExperience.some((r) => Object.values(r).some((v) => v));
        if (hasIndustry) setIndustry(data.industryExperience);
        // Older records have rows but no Yes/No answer yet — treat as "Yes".
        const nextProfessional: ProfessionalDetails = {
          ...data.professionalDetails,
          hasInternship: data.professionalDetails.hasInternship || (hasInternships ? 'yes' : ''),
          hasIndustryExperience: data.professionalDetails.hasIndustryExperience || (hasIndustry ? 'yes' : ''),
        };
        setProfessional(nextProfessional);
        setTermsAcceptedAt(data.termsAcceptedAt ?? null);
        const hasDocuments = data.documentChecklist.some((d) => d.ready);
        if (hasDocuments) setDocuments(data.documentChecklist);
        baselineRef.current = JSON.stringify({
          interestForm: hasInterest ? data.interestForm : EMPTY_INTEREST_FORM,
          personal: hasPersonal ? data.personalDetails : EMPTY_PERSONAL_DETAILS,
          academics: hasAcademics ? data.academicQualifications : buildDefaultAcademicQualifications(),
          internships: hasInternships ? data.internshipExperience : [EMPTY_INTERNSHIP_ROW],
          industry: hasIndustry ? data.industryExperience : [EMPTY_INTERNSHIP_ROW],
          professional: nextProfessional,
          documents: hasDocuments ? data.documentChecklist : buildDefaultDocumentChecklist(),
        });
        if (data.updatedAt) {
          setSavedNote(`Last saved ${new Date(data.updatedAt).toLocaleDateString()}`);
        }
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const termsPending = agreeTicked && !termsAcceptedAt;
  const dirty =
    termsPending ||
    JSON.stringify({ interestForm, personal, academics, internships, industry, professional, documents }) !==
      baselineRef.current;

  const interestRows = buildInterestRows(interestForm);
  const hasInterestForm = interestRows.some(([, value]) => value.trim());
  // Dates that logically can't be in the future.
  const today = new Date();

  // Per-section completion hints for the collapsed accordion headers.
  const rowIsFilled = (r: AcademicQualification | InternshipRow) =>
    countFilled({ ...r, level: undefined } as Record<string, unknown>) > 0;
  const personalFilled = countFilled(personal as unknown as Record<string, unknown>);
  const academicCount = academics.filter(rowIsFilled).length;
  const internshipCount = internships.filter(rowIsFilled).length;
  const industryCount = industry.filter(rowIsFilled).length;
  const professionalStatus =
    !professional.hasInternship && !professional.hasIndustryExperience
      ? 'Not started'
      : [
          professional.hasInternship === 'yes'
            ? `${internshipCount} internship${internshipCount === 1 ? '' : 's'}`
            : professional.hasInternship === 'no'
              ? 'No internship'
              : null,
          professional.hasIndustryExperience === 'yes'
            ? professional.industryYears
              ? `${professional.industryYears} yr industry exp.`
              : `${industryCount} job${industryCount === 1 ? '' : 's'}`
            : professional.hasIndustryExperience === 'no'
              ? 'No industry exp.'
              : null,
        ]
          .filter(Boolean)
          .join(' · ');
  const setProfessionalField = (patch: Partial<ProfessionalDetails>) =>
    setProfessional((prev) => ({ ...prev, ...patch }));
  const docAnswered = documents.filter((d) => d.ready).length;

  const setPersonalField = (patch: Partial<PersonalDetails>) => setPersonal((prev) => ({ ...prev, ...patch }));
  const setAcademicRow = (i: number, patch: Partial<AcademicQualification>) =>
    setAcademics((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const setDocReady = (key: string, ready: DocumentChecklistItem['ready']) =>
    setDocuments((prev) => prev.map((d) => (d.key === key ? { ...d, ready } : d)));

  const setInterestField = (patch: Partial<InterestForm>) => setInterestForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const hasText = (r: InternshipRow) => Object.values(r).some((v) => v.trim());
      // LOR and SOP are saved from their own tabs — not sent from here, so the
      // server keeps them as they are.
      const payload: SifUpdate = {
        interestForm: {
          ...interestForm,
          preferredCountries: cleanList(interestForm.preferredCountries),
          preferredStreams: cleanList(interestForm.preferredStreams),
          entranceTestSupport: cleanList(interestForm.entranceTestSupport),
          admissionSupport: cleanList(interestForm.admissionSupport),
        },
        personalDetails: personal,
        academicQualifications: academics,
        internshipExperience: professional.hasInternship === 'yes' ? internships.filter(hasText) : [],
        industryExperience: professional.hasIndustryExperience === 'yes' ? industry.filter(hasText) : [],
        professionalDetails: {
          ...professional,
          industryYears: professional.hasIndustryExperience === 'yes' ? professional.industryYears.trim() : '',
        },
        documentChecklist: documents,
        ...(termsPending ? { termsAccepted: true } : {}),
      };
      const saved = await updateMySif(token, payload);
      const nextInternships = saved.internshipExperience.length
        ? saved.internshipExperience
        : [{ ...EMPTY_INTERNSHIP_ROW }];
      const nextIndustry = saved.industryExperience.length ? saved.industryExperience : [{ ...EMPTY_INTERNSHIP_ROW }];
      setInterestForm(saved.interestForm);
      setPersonal(saved.personalDetails);
      setAcademics(saved.academicQualifications);
      setInternships(nextInternships);
      setIndustry(nextIndustry);
      setProfessional(saved.professionalDetails);
      setDocuments(saved.documentChecklist);
      setTermsAcceptedAt(saved.termsAcceptedAt ?? null);
      setAgreeTicked(false);
      baselineRef.current = JSON.stringify({
        interestForm: saved.interestForm,
        personal: saved.personalDetails,
        academics: saved.academicQualifications,
        internships: nextInternships,
        industry: nextIndustry,
        professional: saved.professionalDetails,
        documents: saved.documentChecklist,
      });
      setEditingInterest(false);
      setSavedNote(savedTimeNote());
      setToast('Saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-surface dark:bg-surface-dark">
      <TopBar title="Student Information Form" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <LoadErrorBanner show={loadError} onRetry={() => setReloadKey((k) => k + 1)} />

            <IntroNote>
              Tap a section to fill it in, then Save. Your LOR and SOP details have their own tabs at the bottom.
            </IntroNote>

            {/* ---------- Student Interest Form (pre-filled from the CRM enquiry) ---------- */}
            <Collapsible
              icon="clipboard-outline"
              title="Student Interest Form"
              status={
                editingInterest ? 'Editing' : hasInterestForm ? 'From your enquiry · tap Edit to update' : 'Not started'
              }
              tone={editingInterest || hasInterestForm ? 'accent' : 'muted'}
              open={openKey === 'interest'}
              onToggle={() => toggleSection('interest')}>
              <View className="mb-2.5 flex-row items-center gap-2">
                <Text className="flex-1 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                  {editingInterest
                    ? 'Update your details, then tap Save at the bottom. Separate multiple values with commas.'
                    : hasInterestForm
                      ? 'Taken from the enquiry form you submitted.'
                      : 'Tap Edit to fill in your study preferences.'}
                </Text>
                {!editingInterest ? (
                  <Pressable
                    onPress={() => {
                      animateNext();
                      setEditingInterest(true);
                    }}
                    className="flex-row items-center gap-1 rounded-full border border-brand-500 bg-brand-50 px-3 py-1 active:opacity-80 dark:border-brand-400 dark:bg-brand-950">
                    <Ionicons name="create-outline" size={13} color={isDark ? '#93c5fd' : PRIMARY} />
                    <Text className="text-[12px] font-semibold text-brand-700 dark:text-brand-200">Edit</Text>
                  </Pressable>
                ) : null}
              </View>
              {editingInterest ? (
                <View>
                  {INTEREST_FIELDS.map((f) =>
                    f.kind === 'text' ? (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={interestForm[f.key]}
                        onChangeText={(v) => setInterestField({ [f.key]: v })}
                        keyboardType={f.keyboardType}
                      />
                    ) : (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={interestForm[f.key].join(', ')}
                        onChangeText={(v) => setInterestField({ [f.key]: splitList(v) })}
                        placeholder="e.g. USA, Canada"
                      />
                    ),
                  )}
                </View>
              ) : hasInterestForm ? (
                <View className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                  {interestRows.map(([label, value], i) => (
                    <InfoRow key={label} label={label} value={value} last={i === interestRows.length - 1} />
                  ))}
                </View>
              ) : (
                <View className="rounded-xl border border-dashed border-slate-200 px-4 py-6 dark:border-slate-700">
                  <Text className="text-center text-[12.5px] text-slate-400 dark:text-slate-500">
                    No interest form on file yet.
                  </Text>
                </View>
              )}
            </Collapsible>

            {/* ---------- Personal & Passport Details ---------- */}
            <Collapsible
              icon="person-outline"
              title="Personal & Passport Details"
              status={personalFilled === 0 ? 'Not started' : `${personalFilled} field${personalFilled === 1 ? '' : 's'} filled`}
              tone={personalFilled === 0 ? 'muted' : 'accent'}
              open={openKey === 'personal'}
              onToggle={() => toggleSection('personal')}>
              <View>
              <DateField
                label="Date of Birth"
                value={personal.dateOfBirth}
                onChange={(v) => setPersonalField({ dateOfBirth: v })}
                maxYear={today.getFullYear()}
              />

              <Choice
                label="Any previous visa rejection?"
                options={['Yes', 'No']}
                value={
                  personal.previousVisaRejection === 'yes'
                    ? 'Yes'
                    : personal.previousVisaRejection === 'no'
                      ? 'No'
                      : ''
                }
                onChange={(v) =>
                  setPersonalField({
                    previousVisaRejection: v === 'Yes' ? 'yes' : v === 'No' ? 'no' : '',
                  })
                }
              />
              {personal.previousVisaRejection === 'yes' ? (
                <Field
                  label="Visa rejection details"
                  hint="Which country, when, and the reason given if known."
                  multiline
                  value={personal.previousVisaRejectionDetails}
                  onChangeText={(v) => setPersonalField({ previousVisaRejectionDetails: v })}
                />
              ) : null}

              <Field
                label="Address"
                multiline
                value={personal.address}
                onChangeText={(v) => setPersonalField({ address: v })}
              />

              <Field
                label="Emergency Contact Name"
                value={personal.emergencyContactName}
                onChangeText={(v) => setPersonalField({ emergencyContactName: v })}
              />
              <Field
                label="Emergency Contact Relationship"
                placeholder="e.g. Father, Mother, Sibling"
                value={personal.emergencyContactRelationship}
                onChangeText={(v) => setPersonalField({ emergencyContactRelationship: v })}
              />

              <Choice
                label="Marital Status"
                options={['Single', 'Married']}
                value={personal.maritalStatus}
                onChange={(v) => setPersonalField({ maritalStatus: v as PersonalDetails['maritalStatus'] })}
              />
              {personal.maritalStatus === 'Married' ? (
                <Field
                  label="Spouse Details"
                  hint="Spouse's name, occupation, and whether they will accompany you."
                  multiline
                  value={personal.spouseDetails}
                  onChangeText={(v) => setPersonalField({ spouseDetails: v })}
                />
              ) : null}

              <Field
                label="Passport Number"
                value={personal.passportNumber}
                onChangeText={(v) => setPersonalField({ passportNumber: v })}
              />
              <DateField
                label="Passport Date of Issue"
                value={personal.passportDateOfIssue}
                onChange={(v) => setPersonalField({ passportDateOfIssue: v })}
                maxYear={today.getFullYear()}
              />
              <DateField
                label="Passport Date of Expiry"
                value={personal.passportDateOfExpiry}
                onChange={(v) => setPersonalField({ passportDateOfExpiry: v })}
              />
              </View>
            </Collapsible>

            {/* ---------- Academic Qualifications ---------- */}
            <Collapsible
              icon="school-outline"
              title="Academic Qualifications"
              status={academicCount === 0 ? 'Not started' : `${academicCount} qualification${academicCount === 1 ? '' : 's'} added`}
              tone={academicCount === 0 ? 'muted' : 'accent'}
              open={openKey === 'academic'}
              onToggle={() => toggleSection('academic')}>
              <Text className="mb-2.5 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                Open only the rows that apply to you. Leave the rest blank.
              </Text>
              {academics.map((row, i) => {
                const filled = countFilled({ ...row, level: undefined } as Record<string, unknown>) > 0;
                const summary =
                  [row.percentage && `${row.percentage}%`, row.schoolCollegeName]
                    .filter(Boolean)
                    .join(' · ') || 'Not filled';
                return (
                  <SubCard
                    key={row.level || i}
                    title={row.level || `Qualification ${i + 1}`}
                    summary={summary}
                    filled={filled}
                    open={openAcademic === i}
                    onToggle={() => toggleAcademic(i)}>
                    <Field
                      label="Specialization / Subjects"
                      value={row.specializationSubjects}
                      onChangeText={(v) => setAcademicRow(i, { specializationSubjects: v })}
                    />
                    <Field
                      label="Year of Passing"
                      keyboardType="phone-pad"
                      value={row.yearOfPassing}
                      onChangeText={(v) => setAcademicRow(i, { yearOfPassing: v })}
                    />
                    <Field
                      label="Percentage (%)"
                      value={row.percentage}
                      onChangeText={(v) => setAcademicRow(i, { percentage: v })}
                    />
                    <Field
                      label="Number of Backlogs (if any)"
                      value={row.backlogs}
                      onChangeText={(v) => setAcademicRow(i, { backlogs: v })}
                    />
                    <Field
                      label="School / College Name"
                      value={row.schoolCollegeName}
                      onChangeText={(v) => setAcademicRow(i, { schoolCollegeName: v })}
                    />
                  </SubCard>
                );
              })}
            </Collapsible>

            {/* ---------- Professional Details ---------- */}
            <Collapsible
              icon="briefcase-outline"
              title="Professional Details"
              status={professionalStatus}
              tone={!professional.hasInternship && !professional.hasIndustryExperience ? 'muted' : 'accent'}
              open={openKey === 'professional'}
              onToggle={() => toggleSection('professional')}>
              <Choice
                label="Have you done any internship?"
                options={['Yes', 'No']}
                value={professional.hasInternship === 'yes' ? 'Yes' : professional.hasInternship === 'no' ? 'No' : ''}
                onChange={(v) => {
                  animateNext();
                  setProfessionalField({ hasInternship: v === 'Yes' ? 'yes' : v === 'No' ? 'no' : '' });
                }}
              />
              {professional.hasInternship === 'yes' ? (
                <View className="mb-4">
                  <ExperienceList
                    rows={internships}
                    onChange={setInternships}
                    itemLabel="Internship"
                    addLabel="Add another internship"
                  />
                </View>
              ) : null}

              <Choice
                label="Do you have any industry experience?"
                options={['Yes', 'No']}
                value={professional.hasIndustryExperience === 'yes' ? 'Yes' : professional.hasIndustryExperience === 'no' ? 'No' : ''}
                onChange={(v) => {
                  animateNext();
                  setProfessionalField({ hasIndustryExperience: v === 'Yes' ? 'yes' : v === 'No' ? 'no' : '' });
                }}
              />
              {professional.hasIndustryExperience === 'yes' ? (
                <View>
                  <ExperienceList rows={industry} onChange={setIndustry} itemLabel="Company" addLabel="Add another company" />
                  <View className="mt-3.5">
                    <Field
                      label="Years of Experience"
                      hint="Your total industry experience, e.g. 2 or 1.5"
                      keyboardType="phone-pad"
                      value={professional.industryYears}
                      onChangeText={(v) => setProfessionalField({ industryYears: v })}
                    />
                  </View>
                </View>
              ) : null}
            </Collapsible>

            {/* ---------- Documents Ready With You ---------- */}
            <Collapsible
              icon="folder-open-outline"
              title="Documents Ready With You"
              status={`${docAnswered} of ${documents.length} marked`}
              tone={docAnswered === 0 ? 'muted' : docAnswered === documents.length ? 'done' : 'accent'}
              open={openKey === 'documents'}
              onToggle={() => toggleSection('documents')}>
              <Text className="mb-2.5 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                Mark which you already have — we&apos;ll guide you on the rest. Items marked * are optional.
              </Text>
              <View className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {DOCUMENT_CHECKLIST_TEMPLATE.map((tpl, idx) => {
                  const ready = documents.find((d) => d.key === tpl.key)?.ready ?? '';
                  const showDevHeader =
                    tpl.section === 'developed' && DOCUMENT_CHECKLIST_TEMPLATE[idx - 1]?.section !== 'developed';
                  return (
                    <View key={tpl.key}>
                      {showDevHeader ? (
                        <View className="border-b border-t border-slate-100 bg-slate-50 px-3.5 py-2 dark:border-slate-800 dark:bg-slate-900">
                          <Text className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            Developed from your country / university choices
                          </Text>
                        </View>
                      ) : null}
                      <View
                        className={`flex-row items-center gap-2 px-3.5 py-2.5 ${
                          idx === DOCUMENT_CHECKLIST_TEMPLATE.length - 1
                            ? ''
                            : 'border-b border-slate-100 dark:border-slate-800'
                        }`}>
                        <View className="flex-1">
                          <Text className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                            {tpl.name}
                            {tpl.optional ? ' *' : ''}
                          </Text>
                          <Text className="text-[10.5px] text-slate-400 dark:text-slate-500">{tpl.format}</Text>
                        </View>
                        <View className="flex-row gap-1.5">
                          {(['yes', 'no'] as const).map((opt) => {
                            const selected = ready === opt;
                            return (
                              <Pressable
                                key={opt}
                                onPress={() => setDocReady(tpl.key, selected ? '' : opt)}
                                className={`rounded-full border px-3 py-1 active:opacity-80 ${
                                  selected
                                    ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                                }`}>
                                <Text
                                  className={`text-[11.5px] ${
                                    selected
                                      ? 'font-semibold text-brand-700 dark:text-brand-200'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}>
                                  {opt === 'yes' ? 'Yes' : 'No'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Collapsible>

            {/* ---------- Terms & Conditions ---------- */}
            <Collapsible
              icon="shield-checkmark-outline"
              title="Terms & Conditions"
              status={
                termsAcceptedAt
                  ? `Agreed on ${new Date(termsAcceptedAt).toLocaleDateString()}`
                  : agreeTicked
                    ? 'Ticked — tap Save to confirm'
                    : 'Please read and agree'
              }
              tone={termsAcceptedAt ? 'done' : agreeTicked ? 'accent' : 'muted'}
              open={openKey === 'terms'}
              onToggle={() => toggleSection('terms')}>
              <Text className="mb-2 text-[13px] font-bold text-slate-800 dark:text-slate-100">Student Undertaking</Text>
              {STUDENT_UNDERTAKING.map((line, idx) => (
                <View key={idx} className="mb-1.5 flex-row gap-2">
                  <Text className="text-[12px] leading-[18px] text-slate-400 dark:text-slate-500">{idx + 1}.</Text>
                  <Text className="flex-1 text-[12px] leading-[18px] text-slate-600 dark:text-slate-300">{line}</Text>
                </View>
              ))}

              <Text className="mb-2 mt-4 text-[13px] font-bold text-slate-800 dark:text-slate-100">
                WIZDOM Foundation Scholarship — Terms &amp; Conditions
              </Text>
              <Text className="mb-3 text-[12px] leading-[18px] text-slate-600 dark:text-slate-300">{SCHOLARSHIP_INTRO}</Text>
              {SCHOLARSHIP_TERMS.map((section) => (
                <View key={section.title} className="mb-3">
                  <Text className="mb-1 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">{section.title}</Text>
                  {section.lines.map((line, idx) =>
                    line.startsWith('• ') ? (
                      <View key={idx} className="mb-0.5 flex-row gap-2 pl-3">
                        <Text className="text-[12px] leading-[18px] text-slate-400">•</Text>
                        <Text className="flex-1 text-[12px] leading-[18px] text-slate-600 dark:text-slate-300">
                          {line.slice(2)}
                        </Text>
                      </View>
                    ) : (
                      <Text key={idx} className="mb-1 text-[12px] leading-[18px] text-slate-600 dark:text-slate-300">
                        {line}
                      </Text>
                    ),
                  )}
                </View>
              ))}

              <Pressable
                disabled={!!termsAcceptedAt}
                onPress={() => setAgreeTicked((v) => !v)}
                className={`mt-2 flex-row items-start gap-2.5 rounded-xl border px-3.5 py-3 active:opacity-80 ${
                  termsAcceptedAt || agreeTicked
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}>
                <Ionicons
                  name={termsAcceptedAt || agreeTicked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={termsAcceptedAt || agreeTicked ? (isDark ? '#93c5fd' : PRIMARY) : isDark ? '#64748b' : '#94a3b8'}
                />
                <Text className="flex-1 text-[12.5px] font-semibold leading-[18px] text-slate-700 dark:text-slate-200">
                  {termsAcceptedAt
                    ? `You agreed to these Terms & Conditions on ${new Date(termsAcceptedAt).toLocaleDateString()}.`
                    : 'I have read, understood and agree to the Student Undertaking and the Terms & Conditions above.'}
                </Text>
              </Pressable>
            </Collapsible>

            <ErrorNote message={error} />
          </ScrollView>

          <SaveBar dirty={dirty} saving={saving} savedNote={savedNote} onSave={handleSave} />
      </KeyboardAvoidingView>

      <Toast message={toast} tone="success" onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}
