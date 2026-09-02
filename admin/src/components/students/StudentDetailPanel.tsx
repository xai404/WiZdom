import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Milestone, MessageCircle, ClipboardList } from 'lucide-react';
import { Tabs } from '../ui';
import type { TabItem } from '../ui';
import { fetchStudentById, fetchStudentChat, fetchStudentJourney, postStudentChatMessage, updateStudentJourneyStage } from '../../api/students';
import JourneyTab from './JourneyTab';
import ChatTab from './ChatTab';
import StudentInfoTab from './StudentInfoTab';
import type { ChatMessage, JourneyStage, JourneyStageStatus, Student } from '../../types';

const TABS: TabItem[] = [
  { key: 'journey', label: 'Journey', icon: <Milestone size={15} /> },
  { key: 'chats', label: 'Chats', icon: <MessageCircle size={15} /> },
  { key: 'sif', label: 'SIF', icon: <ClipboardList size={15} /> },
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
  const [activeTab, setActiveTab] = useState('journey');

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

  // Opening the SIF tab re-pulls the student so the LOR/SOP the student
  // filled in on the app shows up even if this panel was opened earlier.
  useEffect(() => {
    if (activeTab !== 'sif') return;
    fetchStudentById(studentId)
      .then((s) => {
        setStudent(s);
        onStudentUpdated(s);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, studentId]);

  const remarksByStage = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const msg of messages) {
      if (!msg.stage) continue;
      const existing = map.get(msg.stage);
      if (!existing || new Date(msg.createdAt) > new Date(existing.createdAt)) {
        map.set(msg.stage, msg);
      }
    }
    return map;
  }, [messages]);

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
    <div className="flex h-full min-h-0 w-full flex-col gap-4">
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto">
        <button onClick={onBack} className="shrink-0 text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <Tabs
          tabs={TABS}
          active={activeTab}
          onChange={setActiveTab}
          layoutId="student-detail-tab"
          className="shrink-0"
        />
      </div>

      <div className="min-h-0 flex-1">
        {activeTab === 'journey' ? (
          <div className="h-full overflow-y-auto pr-1">
            <JourneyTab
              journey={journey}
              remarksByStage={remarksByStage}
              isClosed={student.status === 'Closed'}
              onStatusChange={async (title, status: JourneyStageStatus) => {
                await updateStudentJourneyStage(student.id, title, status);
                const j = await fetchStudentJourney(student.id);
                setJourney(j);
                await refreshStudent();
              }}
              onPostRemark={async (title, text) => {
                await postStudentChatMessage(student.id, text, title);
                const m = await fetchStudentChat(student.id);
                setMessages(m);
              }}
            />
          </div>
        ) : activeTab === 'sif' ? (
          <StudentInfoTab
            // Remount (and re-seed the form) whenever the student changes or
            // their SIF was updated server-side — e.g. the student just
            // saved it from the app.
            key={`${student.id}:${student.sif?.updatedAt ?? 'none'}`}
            student={student}
            onStudentUpdated={(s) => {
              setStudent(s);
              onStudentUpdated(s);
            }}
          />
        ) : (
          <ChatTab
            studentId={student.id}
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
