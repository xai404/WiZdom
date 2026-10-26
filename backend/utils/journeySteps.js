const Student = require('../models/Student');
const { JOURNEY_STEPS, LEGACY_STAGES, SUBSTEP_BY_KEY } = require('../constants/journeyStages');

// A step's status, derived from its sub-steps' status tones: rejected if
// any sub-step is, completed once all are, in_progress once any has moved
// off its default, else pending.
function deriveStepTone(tones) {
  if (tones.includes('rejected')) return 'rejected';
  if (tones.every((t) => t === 'completed')) return 'completed';
  if (tones.some((t) => t !== 'pending')) return 'in_progress';
  return 'pending';
}

function buildSubstep(sub, saved, remarksFor) {
  const option = sub.statuses.find((o) => o.value === saved?.status) || sub.statuses[0];
  return {
    key: sub.key,
    title: sub.label,
    status: option.value,
    statusLabel: option.label,
    tone: option.tone,
    updatedAt: saved?.updatedAt || null,
    options: sub.statuses,
    remarks: remarksFor(sub.key),
  };
}

const latestDate = (dates) =>
  dates.filter(Boolean).reduce((max, d) => (!max || new Date(d) > new Date(max) ? d : max), null);

// One step of the response shape both the admin Journey tab and the
// student app read. `remarksFor` comes from utils/journeyRemarks.
function buildStep(step, savedByTitle, remarksFor) {
  const substeps = step.substeps.map((sub) => buildSubstep(sub, savedByTitle.get(sub.key), remarksFor));
  const remarks = remarksFor(step.title);
  const latest = remarks[remarks.length - 1];
  return {
    title: step.title,
    status: deriveStepTone(substeps.map((s) => s.tone)),
    updatedAt: latestDate([
      latest?.createdAt,
      ...substeps.flatMap((s) => [s.updatedAt, s.remarks[s.remarks.length - 1]?.createdAt]),
    ]),
    remarks,
    latestRemark: latest?.text || null,
    substeps,
  };
}

function buildJourney(student, remarksFor) {
  const savedByTitle = new Map(student.journey.map((entry) => [entry.title, entry]));
  return JOURNEY_STEPS.map((step) => buildStep(step, savedByTitle, remarksFor));
}

// True only once every sub-step of every step is done.
function isJourneyCompleted(journeyEntries) {
  const savedByTitle = new Map(journeyEntries.map((entry) => [entry.title, entry]));
  return JOURNEY_STEPS.every((step) => buildStep(step, savedByTitle, () => []).status === 'completed');
}

// One-time, idempotent rewrite of progress saved under the old flat
// 21-stage journey: statuses move onto the matching new sub-step, and
// remarks move onto the step.
// Runs on every server start; students with no legacy entries are skipped.
async function migrateLegacyJourneys() {
  const legacyTitles = Object.keys(LEGACY_STAGES).filter((t) => !JOURNEY_STEPS.some((s) => s.title === t));
  const students = await Student.find({ 'journey.title': { $in: Object.keys(LEGACY_STAGES) } }).select(
    'journey journeyCompleted'
  );

  let migrated = 0;
  for (const student of students) {
    const entries = student.journey.map((e) => e.toObject());
    const byTitle = new Map(entries.map((e) => [e.title, e]));
    const ensure = (title) => {
      if (!byTitle.has(title)) byTitle.set(title, { title, status: 'pending', updatedAt: null, remarks: [] });
      return byTitle.get(title);
    };

    let changed = false;
    for (const entry of entries) {
      const legacy = LEGACY_STAGES[entry.title];
      if (!legacy) continue;
      // A legacy title that is also a new step title keeps its remarks in
      // place — only its old status still needs carrying over.
      const isStepTitle = !legacyTitles.includes(entry.title);
      if (entry.status === 'pending' && isStepTitle) continue;

      const newStatus = legacy.status?.[entry.status];
      if (legacy.substep && newStatus) {
        const sub = ensure(legacy.substep);
        // Two old stages can feed one sub-step (Application Management +
        // Offer Letters) — keep whichever is further along.
        const rank = (value) => SUBSTEP_BY_KEY.get(legacy.substep).statuses.findIndex((o) => o.value === value);
        if (rank(newStatus) > rank(sub.status)) {
          sub.status = newStatus;
          sub.updatedAt = entry.updatedAt || new Date();
        }
      }

      if (isStepTitle) {
        entry.status = 'pending';
      } else {
        const remarks = [...(entry.remarks || [])];
        if (entry.remark && remarks.length === 0) {
          remarks.push({ text: entry.remark, byName: '', byRole: '', createdAt: entry.remarkUpdatedAt || new Date() });
        }
        if (remarks.length) {
          const step = ensure(legacy.step);
          step.remarks = [...(step.remarks || []), ...remarks].sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
          );
        }
        byTitle.delete(entry.title);
      }
      changed = true;
    }

    if (!changed) continue;
    student.journey = [...byTitle.values()];
    student.journeyCompleted = isJourneyCompleted(student.journey);
    await student.save({ validateModifiedOnly: true });
    migrated += 1;
  }

  if (migrated) console.log(`Migrated ${migrated} student journey(s) to the 7-step format`);
}

module.exports = { buildJourney, buildStep, isJourneyCompleted, migrateLegacyJourneys };
