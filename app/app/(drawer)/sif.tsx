import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Toast } from '@/components/toast';
import { TopBar } from '@/components/top-bar';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  buildDefaultAcademicQualifications,
  buildDefaultDocumentChecklist,
  DOCUMENT_CHECKLIST_TEMPLATE,
  EMPTY_INTEREST_FORM,
  EMPTY_INTERNSHIP_ROW,
  EMPTY_LOR_RECOMMENDER,
  EMPTY_PERSONAL_DETAILS,
  EMPTY_SOP,
  fetchMySif,
  updateMySif,
  type AcademicQualification,
  type DocumentChecklistItem,
  type InterestForm,
  type InternshipRow,
  type LorRecommender,
  type PersonalDetails,
  type Sif,
  type SopDetails,
} from '@/lib/sif-api';

const PRIMARY = '#0049B7';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const animateNext = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));

const asList = (values: string[]) => (values && values.length ? values.join(', ') : '');

// The Student Interest Form as a fixed Field / Response list — carried over
// from the CRM enquiry and shown read-only here (the student edits it via
// their counsellor, not in-app). Mirrors the admin panel's SIF document.
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

function Field({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  const { isDark } = useAppTheme();
  return (
    <View className="mb-3.5">
      <Text className="mb-1 text-[13px] font-semibold text-slate-700 dark:text-slate-200">{label}</Text>
      {hint ? <Text className="mb-1.5 text-[11.5px] leading-4 text-slate-400 dark:text-slate-500">{hint}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
        multiline={multiline}
        keyboardType={keyboardType}
        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        style={multiline ? { minHeight: 88, textAlignVertical: 'top' } : undefined}
      />
    </View>
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
          <Ionicons name={icon} size={17} color={isDark ? '#8bb4fd' : PRIMARY} />
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [lor, setLor] = useState<LorRecommender[]>([{ ...EMPTY_LOR_RECOMMENDER }]);
  const [sop, setSop] = useState<SopDetails>({ ...EMPTY_SOP });
  const [personal, setPersonal] = useState<PersonalDetails>({ ...EMPTY_PERSONAL_DETAILS });
  const [academics, setAcademics] = useState<AcademicQualification[]>(buildDefaultAcademicQualifications());
  const [internships, setInternships] = useState<InternshipRow[]>([{ ...EMPTY_INTERNSHIP_ROW }]);
  const [documents, setDocuments] = useState<DocumentChecklistItem[]>(buildDefaultDocumentChecklist());
  // Read-only in the app (carried over from the CRM enquiry). Kept in state
  // only so it round-trips unchanged when the student saves their LOR/SOP —
  // the server's sanitizeSif rebuilds the whole object, so dropping it from
  // the payload would wipe it.
  const [interestForm, setInterestForm] = useState<InterestForm>({ ...EMPTY_INTEREST_FORM });

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
      lor: [EMPTY_LOR_RECOMMENDER],
      interestForm: EMPTY_INTEREST_FORM,
      personal: EMPTY_PERSONAL_DETAILS,
      academics: buildDefaultAcademicQualifications(),
      internships: [EMPTY_INTERNSHIP_ROW],
      documents: buildDefaultDocumentChecklist(),
      sop: EMPTY_SOP,
    }),
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadError(null);
    fetchMySif(token)
      .then((data) => {
        if (cancelled) return;
        // Only overwrite the fields if the server actually has answers —
        // never clobber something the student has already started typing.
        if (data.lor.length) setLor(data.lor);
        if (Object.values(data.sop).some((v) => v)) setSop(data.sop);
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
        const hasDocuments = data.documentChecklist.some((d) => d.ready);
        if (hasDocuments) setDocuments(data.documentChecklist);
        baselineRef.current = JSON.stringify({
          lor: data.lor.length ? data.lor : [EMPTY_LOR_RECOMMENDER],
          interestForm: hasInterest ? data.interestForm : EMPTY_INTEREST_FORM,
          personal: hasPersonal ? data.personalDetails : EMPTY_PERSONAL_DETAILS,
          academics: hasAcademics ? data.academicQualifications : buildDefaultAcademicQualifications(),
          internships: hasInternships ? data.internshipExperience : [EMPTY_INTERNSHIP_ROW],
          documents: hasDocuments ? data.documentChecklist : buildDefaultDocumentChecklist(),
          sop: Object.values(data.sop).some((v) => v) ? data.sop : EMPTY_SOP,
        });
        if (data.updatedAt) {
          setSavedNote(`Last saved ${new Date(data.updatedAt).toLocaleDateString()}`);
        }
      })
      .catch((err) => !cancelled && setLoadError(err instanceof Error ? err.message : 'Something went wrong.'));
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const dirty =
    JSON.stringify({ lor, interestForm, personal, academics, internships, documents, sop }) !==
    baselineRef.current;

  const interestRows = buildInterestRows(interestForm);
  const hasInterestForm = interestRows.some(([, value]) => value.trim());
  // Dates that logically can't be in the future.
  const today = new Date();

  // Per-section completion hints for the collapsed accordion headers.
  const rowIsFilled = (r: AcademicQualification | InternshipRow | LorRecommender) =>
    countFilled({ ...r, level: undefined } as Record<string, unknown>) > 0;
  const personalFilled = countFilled(personal as unknown as Record<string, unknown>);
  const academicCount = academics.filter(rowIsFilled).length;
  const internshipCount = internships.filter(rowIsFilled).length;
  const lorCount = lor.filter(rowIsFilled).length;
  const sopFilled = countFilled(sop as unknown as Record<string, unknown>);
  const docAnswered = documents.filter((d) => d.ready).length;

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

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const cleanedLor = lor.filter((r) => Object.values(r).some((v) => v.trim()));
      const cleanedInternships = internships.filter((r) => Object.values(r).some((v) => v.trim()));
      const payload: Sif = {
        lor: cleanedLor,
        interestForm,
        personalDetails: personal,
        academicQualifications: academics,
        internshipExperience: cleanedInternships,
        documentChecklist: documents,
        sop,
      };
      const saved = await updateMySif(token, payload);
      const nextLor = saved.lor.length ? saved.lor : [{ ...EMPTY_LOR_RECOMMENDER }];
      const nextInternships = saved.internshipExperience.length
        ? saved.internshipExperience
        : [{ ...EMPTY_INTERNSHIP_ROW }];
      setLor(nextLor);
      setInterestForm(saved.interestForm);
      setPersonal(saved.personalDetails);
      setAcademics(saved.academicQualifications);
      setInternships(nextInternships);
      setDocuments(saved.documentChecklist);
      setSop(saved.sop);
      baselineRef.current = JSON.stringify({
        lor: nextLor,
        interestForm: saved.interestForm,
        personal: saved.personalDetails,
        academics: saved.academicQualifications,
        internships: nextInternships,
        documents: saved.documentChecklist,
        sop: saved.sop,
      });
      setSavedNote(`Saved ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
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
            {loadError ? (
              <Pressable
                onPress={() => setReloadKey((k) => k + 1)}
                className="mb-3 flex-row items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 active:opacity-80 dark:bg-amber-950">
                <Ionicons name="cloud-offline-outline" size={15} color="#d97706" />
                <Text className="flex-1 text-[12px] text-amber-700 dark:text-amber-300">
                  Couldn&apos;t load your saved answers. You can still fill this in — tap to retry.
                </Text>
              </Pressable>
            ) : null}

            <View className="mb-4 flex-row gap-2.5 rounded-2xl bg-brand-50 px-3.5 py-3 dark:bg-brand-950/50">
              <Ionicons name="information-circle-outline" size={16} color={isDark ? '#8bb4fd' : PRIMARY} />
              <Text className="flex-1 text-[12px] leading-4 text-brand-700 dark:text-brand-200">
                Tap a section to fill it in. You do not need to write the LOR or SOP yourself — brief points are
                enough.
              </Text>
            </View>

            {/* ---------- Student Interest Form (read-only, from the CRM enquiry) ---------- */}
            <Collapsible
              icon="clipboard-outline"
              title="Student Interest Form"
              status={hasInterestForm ? 'From your enquiry · read-only' : 'Nothing on file'}
              tone="muted"
              open={openKey === 'interest'}
              onToggle={() => toggleSection('interest')}>
              <Text className="mb-2.5 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                Taken from the enquiry form you submitted. Contact your counsellor if anything needs updating.
              </Text>
              {hasInterestForm ? (
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
                  [row.percentage && `${row.percentage}%`, row.boardUniversity || row.schoolCollegeName]
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
                    <Field
                      label="Board / University"
                      value={row.boardUniversity}
                      onChangeText={(v) => setAcademicRow(i, { boardUniversity: v })}
                    />
                  </SubCard>
                );
              })}
            </Collapsible>

            {/* ---------- Internship / Industry Experience ---------- */}
            <Collapsible
              icon="briefcase-outline"
              title="Internship / Industry Experience"
              status={internshipCount === 0 ? 'None added (optional)' : `${internshipCount} added`}
              tone={internshipCount === 0 ? 'muted' : 'accent'}
              open={openKey === 'internship'}
              onToggle={() => toggleSection('internship')}>
              <Text className="mb-2.5 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                Add your internships or jobs, if any. Leave blank if not applicable.
              </Text>
              {internships.map((row, i) => (
              <View
                key={i}
                className="mb-2.5 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                    Experience {i + 1}
                  </Text>
                  <Pressable
                    onPress={() => removeInternship(i)}
                    hitSlop={8}
                    className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-red-50 dark:active:bg-red-950">
                    <Ionicons name="trash-outline" size={13} color={isDark ? '#64748b' : '#94a3b8'} />
                    <Text className="text-[12px] text-slate-400 dark:text-slate-500">Remove</Text>
                  </Pressable>
                </View>
                <Field label="Name of Employer" value={row.nameOfEmployer} onChangeText={(v) => setInternshipRow(i, { nameOfEmployer: v })} />
                <Field label="Address of Employer" multiline value={row.addressOfEmployer} onChangeText={(v) => setInternshipRow(i, { addressOfEmployer: v })} />
                <Field label="Your Designation" value={row.designation} onChangeText={(v) => setInternshipRow(i, { designation: v })} />
                <Field label="Salary (Monthly)" keyboardType="phone-pad" value={row.salaryMonthly} onChangeText={(v) => setInternshipRow(i, { salaryMonthly: v })} />
                <DateField label="Date From" value={row.dateFrom} onChange={(v) => setInternshipRow(i, { dateFrom: v })} maxYear={today.getFullYear()} />
                <DateField label="Date To" value={row.dateTo} onChange={(v) => setInternshipRow(i, { dateTo: v })} maxYear={today.getFullYear()} />
              </View>
              ))}
              <Pressable
                onPress={addInternship}
                className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 active:bg-brand-50 dark:border-slate-700 dark:active:bg-slate-800">
                <Ionicons name="add" size={16} color={isDark ? '#8bb4fd' : PRIMARY} />
                <Text className="text-[13px] font-semibold text-brand-600 dark:text-brand-300">Add another experience</Text>
              </Pressable>
            </Collapsible>

            {/* ---------- LOR ---------- */}
            <Collapsible
              icon="school-outline"
              title="Letter of Recommendation (LOR)"
              status={lorCount === 0 ? 'Not started' : `${lorCount} recommender${lorCount === 1 ? '' : 's'}`}
              tone={lorCount === 0 ? 'muted' : 'accent'}
              open={openKey === 'lor'}
              onToggle={() => toggleSection('lor')}>
              <Text className="mb-2.5 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                Details about the professor or professional recommending you — one block per recommender.
              </Text>
              {lor.map((r, i) => (
              <View
                key={i}
                className="mb-2.5 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                    Recommender {i + 1}
                  </Text>
                  <Pressable
                    onPress={() => removeRecommender(i)}
                    hitSlop={8}
                    className="flex-row items-center gap-1 rounded-lg px-2 py-1 active:bg-red-50 dark:active:bg-red-950">
                    <Ionicons name="trash-outline" size={13} color={isDark ? '#64748b' : '#94a3b8'} />
                    <Text className="text-[12px] text-slate-400 dark:text-slate-500">Remove</Text>
                  </Pressable>
                </View>

                <Field
                  label="Name of the Professor / Professional"
                  hint="Full name of the person providing the LOR."
                  value={r.professorName}
                  onChangeText={(v) => setRecommender(i, { professorName: v })}
                />
                <Field
                  label="Official Phone Number"
                  keyboardType="phone-pad"
                  value={r.contactPhone}
                  onChangeText={(v) => setRecommender(i, { contactPhone: v })}
                />
                <Field
                  label="Official Email ID"
                  keyboardType="email-address"
                  value={r.contactEmail}
                  onChangeText={(v) => setRecommender(i, { contactEmail: v })}
                />
                <Field
                  label="Degree Studied"
                  placeholder="e.g. BA in English"
                  value={r.degreeStudied}
                  onChangeText={(v) => setRecommender(i, { degreeStudied: v })}
                />
                <Field label="CGPA" value={r.cgpa} onChangeText={(v) => setRecommender(i, { cgpa: v })} />
                <Field
                  label="Subjects / Topics"
                  hint="Subjects or papers they taught you, or the topics they worked with you on."
                  multiline
                  value={r.subjectsTopics}
                  onChangeText={(v) => setRecommender(i, { subjectsTopics: v })}
                />
                <Field
                  label="Projects"
                  hint="Any academic, research, or professional projects you completed under their guidance."
                  multiline
                  value={r.projects}
                  onChangeText={(v) => setRecommender(i, { projects: v })}
                />
                <Field
                  label="Internships / Extracurricular Activities"
                  hint="Any internship, leadership role, competition, event, or other notable activity you were involved in."
                  multiline
                  value={r.internshipsActivities}
                  onChangeText={(v) => setRecommender(i, { internshipsActivities: v })}
                />
              </View>
            ))}

              <Pressable
                onPress={addRecommender}
                className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 py-2.5 active:bg-brand-50 dark:border-slate-700 dark:active:bg-slate-800">
                <Ionicons name="add" size={16} color={isDark ? '#8bb4fd' : PRIMARY} />
                <Text className="text-[13px] font-semibold text-brand-600 dark:text-brand-300">Add another recommender</Text>
              </Pressable>
            </Collapsible>

            {/* ---------- SOP ---------- */}
            <Collapsible
              icon="document-text-outline"
              title="Statement of Purpose (SOP)"
              status={sopFilled === 0 ? 'Not started' : sopFilled === 5 ? 'Complete' : `${sopFilled} of 5 filled`}
              tone={sopFilled === 0 ? 'muted' : sopFilled === 5 ? 'done' : 'accent'}
              open={openKey === 'sop'}
              onToggle={() => toggleSection('sop')}>
              <Text className="mb-2.5 text-[12px] leading-4 text-slate-400 dark:text-slate-500">
                Your background, motivation and future plans — simple points are fine.
              </Text>
              <View>
              <Field
                label="Course Name"
                hint="The exact name of the course you are planning to pursue."
                value={sop.courseName}
                onChangeText={(v) => setSopField({ courseName: v })}
              />
              <Field
                label="Motivation to Pursue the Course"
                hint="Why you want to study this particular course — a personal experience, academic interest, professional experience, career-related interest, or something you observed in the industry or your personal life."
                multiline
                value={sop.motivation}
                onChangeText={(v) => setSopField({ motivation: v })}
              />
              <Field
                label="Additional Information"
                hint="Any other personal, academic, professional, or relevant information you would like to include in your SOP."
                multiline
                value={sop.additionalInfo}
                onChangeText={(v) => setSopField({ additionalInfo: v })}
              />
              <Field
                label="What You Expect to Learn"
                hint="Knowledge, skills, or areas of expertise you hope to gain from the course. You may also mention specific modules that interest you and why."
                multiline
                value={sop.expectationsToLearn}
                onChangeText={(v) => setSopField({ expectationsToLearn: v })}
              />
              <Field
                label="Future Plans After Graduation (focused on India)"
                hint={
                  'What you plan to do after the course, focused on India. You may mention:\n' +
                  '• Companies or industries you would like to work in\n' +
                  '• A family business you plan to join or expand\n' +
                  '• A business idea or startup you would like to pursue\n' +
                  '• A specific area or sector where you would like to build your career\n' +
                  '• How you would like to apply the knowledge and skills gained from the course in India'
                }
                multiline
                value={sop.futurePlans}
                onChangeText={(v) => setSopField({ futurePlans: v })}
              />
              </View>
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

            {error ? (
              <Text className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-600 dark:bg-red-950 dark:text-red-300">
                {error}
              </Text>
            ) : null}
          </ScrollView>

          {/* Save bar */}
          <View className="border-t border-slate-100 bg-surface px-5 py-3 dark:border-slate-800 dark:bg-surface-dark">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="text-[12px] text-slate-400 dark:text-slate-500">
                {dirty ? 'Unsaved changes' : (savedNote ?? 'Not filled in yet')}
              </Text>
              <Pressable
                onPress={handleSave}
                disabled={!dirty || saving}
                className="flex-row items-center gap-1.5 rounded-xl px-5 py-2.5 active:opacity-90"
                style={{ backgroundColor: PRIMARY, opacity: !dirty || saving ? 0.5 : 1 }}>
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="save-outline" size={15} color="#ffffff" />
                )}
                <Text className="text-[14px] font-semibold text-white">Save</Text>
              </Pressable>
            </View>
          </View>
      </KeyboardAvoidingView>

      <Toast message={toast} tone="success" onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}
