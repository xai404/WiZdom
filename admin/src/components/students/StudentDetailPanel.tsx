import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Milestone, MessageCircle, ClipboardList, Award, FileText } from 'lucide-react';
import { Avatar, Tabs } from '../ui';
import type { TabItem } from '../ui';
import {
  fetchStudentById,
  fetchStudentChat,
  fetchStudentJourney,
  addStudentJourneyRemark,
  deleteStudentJourneyRemark,
  updateStudentJourneyStage,
} from '../../api/students';
import JourneyTab from './JourneyTab';
import ChatTab from './ChatTab';
import StudentInfoTab from './StudentInfoTab';
import type { ChatMessage, JourneyStage, Student } from '../../types';

const TABS: TabItem[] = [
  { key: 'chats', label: 'Chats', icon: <MessageCircle size={15} /> },
  { key: 'journey', label: 'Journey', icon: <Milestone size={15} /> },
  { key: 'sif', label: 'SIF', icon: <ClipboardList size={15} /> },
  { key: 'lor', label: 'LOR', icon: <Award size={15} /> },
  { key: 'sop', label: 'SOP', icon: <FileText size={15} /> },
];

interface StudentDetailPanelProps {
  studentId: string;
  onBack: () => void;
  onStudentUpdated: (student: Student) => void;
}

const StudentDetailPanel = ({ studentId, onBack, onStudentUpdated }: StudentDetailPanelProps) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [journey, setJourney] = useState<JourneyStage[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('chats');

  // Clicking a student in the list always lands on their chat — the panel
  // stays mounted across students, so reset rather than keep the last tab.
  const [tabStudentId, setTabStudentId] = useState(studentId);
  if (tabStudentId !== studentId) {
    setTabStudentId(studentId);
    setActiveTab('chats');
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchStudentById(studentId), fetchStudentJourney(studentId), fetchStudentChat(studentId)])
      .then(([s, j, m]) => {
        setStudent(s);
        setJourney(j);
        setMessages(m);
        onStudentUpdated(s);
      })
      .catch(() => setError('Could not load this student.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Re-pulls just the student doc (responsibleDepartment/awaitingReply/
  // lastHandledBy/journeyCompleted) — called after sending a chat message,
  // on each chat poll tick, and after a journey status change, so both this
  // panel's header and the card in the left list stay live without a full
  // page reload.
  const refreshStudent = async () => {
    const s = await fetchStudentById(studentId);
    setStudent(s);
    onStudentUpdated(s);
  };

  // Opening the SIF / LOR / SOP tab re-pulls the student so whatever they
  // filled in on the app shows up even if this panel was opened earlier.
  useEffect(() => {
    if (activeTab !== 'sif' && activeTab !== 'lor' && activeTab !== 'sop') return;
    fetchStudentById(studentId)
      .then((s) => {
        setStudent(s);
        onStudentUpdated(s);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, studentId]);

  const currentStage = useMemo(
    () => journey.find((s) => s.status !== 'completed')?.title ?? journey[journey.length - 1]?.title ?? '',
    [journey]
  );

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-brand-100 bg-white text-slate-400">
        Loading…
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-red-200 bg-red-50 text-red-500">
        {error || 'Student not found.'}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2">
      {/* Name + tabs share one row when there's room (wraps when narrow) so
          the chat below gets as much height as possible. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <button onClick={onBack} className="shrink-0 text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </button>
          {/* Circular profile avatar beside the student's / group's name —
              uses an existing profile image if set, initials otherwise. */}
          <Avatar
            name={student.groupName?.trim() || student.name}
            src={student.profilePicture}
            size={32}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {student.groupName?.trim() || student.name}
            </p>
            {student.groupName?.trim() ? (
              <p className="truncate text-xs text-slate-400">{student.name}</p>
            ) : (
              <p className="truncate text-xs text-slate-400">{student.email}</p>
            )}
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <Tabs
            tabs={TABS}
            active={activeTab}
            onChange={setActiveTab}
            layoutId="student-detail-tab"
            className="shrink-0"
            size="sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'journey' ? (
          <div className="h-full overflow-y-auto pr-1">
            <JourneyTab
              // Re-open the new student's current step when switching students.
              key={student.id}
              journey={journey}
              isClosed={student.status === 'Closed'}
              onStatusChange={async (substepKey, status) => {
                await updateStudentJourneyStage(student.id, substepKey, status);
                const j = await fetchStudentJourney(student.id);
                setJourney(j);
                await refreshStudent();
              }}
              onAddRemark={async (title, text) => {
                await addStudentJourneyRemark(student.id, title, text);
                setJourney(await fetchStudentJourney(student.id));
              }}
              onDeleteRemark={async (remarkId) => {
                await deleteStudentJourneyRemark(student.id, remarkId);
                setJourney(await fetchStudentJourney(student.id));
              }}
            />
          </div>
        ) : activeTab === 'sif' || activeTab === 'lor' || activeTab === 'sop' ? (
          <StudentInfoTab
            // Remount (and re-seed the form) whenever the student, the view,
            // or their SIF changes server-side — e.g. the student just saved
            // it from the app.
            key={`${student.id}:${activeTab}:${student.sif?.updatedAt ?? 'none'}`}
            view={activeTab}
            student={student}
            onStudentUpdated={(s) => {
              setStudent(s);
              onStudentUpdated(s);
            }}
          />
        ) : (
          <ChatTab
            studentId={student.id}
            studentName={student.name}
            stages={journey.map((j) => j.title)}
            currentStage={currentStage}
            responsibleDepartment={student.responsibleDepartment ?? null}
            lastHandledBy={student.lastHandledBy ?? null}
            awaitingSinceMessageId={student.awaitingSinceMessageId ?? null}
            messages={messages}
            setMessages={setMessages}
            onAfterChange={refreshStudent}
            isClosed={student.status === 'Closed'}
          />
        )}
      </div>
    </div>
  );
};

export default StudentDetailPanel;
