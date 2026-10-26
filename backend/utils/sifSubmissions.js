const Student = require('../models/Student');
const Message = require('../models/Message');
const { createNotification } = require('./notify');
const { getActiveParticipantIds, attachReadStatus } = require('./chatReadStatus');
const { emitChatMessage } = require('../socket');

// The app has no explicit "Submit" — each tab just saves. A form counts as
// submitted the first time a save leaves it fully filled in; that posts one
// pinned Group Chat message from the student ("SIF is submitted") so staff
// see it at the top of the chat. Announced once per form
// (sif.submittedAt.<form>) — later edits don't repost.

const filled = (v) => typeof v === 'string' && v.trim() !== '';

function isSifComplete(sif) {
  const p = sif.personalDetails || {};
  const personalDone =
    [
      'dateOfBirth',
      'address',
      'previousVisaRejection',
      'emergencyContactName',
      'emergencyContactRelationship',
      'maritalStatus',
      'passportNumber',
      'passportDateOfIssue',
      'passportDateOfExpiry',
    ].every((k) => filled(p[k])) &&
    (p.previousVisaRejection !== 'yes' || filled(p.previousVisaRejectionDetails)) &&
    (p.maritalStatus !== 'Married' || filled(p.spouseDetails));

  const academicDone = (sif.academicQualifications || []).some((r) =>
    ['yearOfPassing', 'percentage', 'schoolCollegeName'].every((k) => filled(r[k]))
  );
  const prof = sif.professionalDetails || {};
  const professionalDone = filled(prof.hasInternship) && filled(prof.hasIndustryExperience);
  const docs = sif.documentChecklist || [];
  const documentsDone = docs.length > 0 && docs.every((d) => filled(d.ready));

  return personalDone && academicDone && professionalDone && documentsDone && !!sif.termsAcceptedAt;
}

// LOR / SOP count as submitted once the student has answered "Do you need
// assistance?" — "No" right away, "Yes" once the details below it are filled.
function isLorComplete(sif) {
  if (sif.lorAssistance === 'no') return true;
  const lor = sif.lor || [];
  return (
    sif.lorAssistance === 'yes' &&
    lor.length > 0 &&
    lor.every((r) =>
      ['professorName', 'contactPhone', 'contactEmail', 'degreeStudied', 'cgpa', 'subjectsTopics'].every((k) =>
        filled(r[k])
      )
    )
  );
}

function isSopComplete(sif) {
  if (sif.sopAssistance === 'no') return true;
  const sop = sif.sop || {};
  return (
    sif.sopAssistance === 'yes' &&
    ['courseName', 'motivation', 'additionalInfo', 'expectationsToLearn', 'futurePlans'].every((k) => filled(sop[k]))
  );
}

// `text` gets "(no assistance needed)" when the student answered No, so
// staff can tell the two apart from the pinned banner alone.
const FORMS = [
  { key: 'sif', text: () => 'SIF is submitted', isComplete: isSifComplete },
  {
    key: 'lor',
    text: (sif) => `LOR is submitted${sif.lorAssistance === 'no' ? ' (no assistance needed)' : ''}`,
    isComplete: isLorComplete,
  },
  {
    key: 'sop',
    text: (sif) => `SOP is submitted${sif.sopAssistance === 'no' ? ' (no assistance needed)' : ''}`,
    isComplete: isSopComplete,
  },
];

// Call after the student's SIF has been saved. Posts the pinned message for
// each form that has just become complete and hasn't been announced yet.
async function announceSifSubmissions(student) {
  const sif = student.sif || {};
  const due = FORMS.filter((form) => !sif.submittedAt?.[form.key] && form.isComplete(sif));
  if (!due.length) return;

  const now = new Date();
  // Claim the announcement atomically so two quick saves can't both post.
  const claimed = [];
  for (const form of due) {
    const res = await Student.updateOne(
      { _id: student._id, [`sif.submittedAt.${form.key}`]: null },
      { $set: { [`sif.submittedAt.${form.key}`]: now } }
    );
    if (res.modifiedCount) claimed.push(form);
  }
  if (!claimed.length) return;

  const participantIds = await getActiveParticipantIds(student._id);
  for (const form of claimed) {
    const text = form.text(sif);
    const message = await Message.create({
      student: student._id,
      sender: 'student',
      senderName: student.name,
      text,
      pinned: true,
      readBy: [student._id],
    });
    const [withStatus] = attachReadStatus([message], participantIds, student._id);
    emitChatMessage(withStatus, student._id);

    await createNotification({
      student: student._id,
      type: 'message',
      title: `${student.name}: ${text}`,
      body: text,
      department: 'General',
    });
  }

  await Student.updateOne({ _id: student._id }, { $set: { lastMessageAt: now } });
}

module.exports = { announceSifSubmissions };
