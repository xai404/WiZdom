// Builds each step's remark list (Student.journey[].remarks, oldest first)
// for both the admin Journey tab and the student app. Remarks are only ever
// added on the Journey tab — stage-tagged chat messages are not remarks.
// `forStudent` strips staff names/ids — students only ever see the team label.
// Async so callers don't need to change if a lookup is ever needed again.
async function buildRemarksByStage(student, { forStudent = false } = {}) {
  const savedByTitle = new Map(student.journey.map((stage) => [stage.title, stage]));

  const shape = (r) =>
    forStudent
      ? { _id: String(r._id), text: r.text, byRole: r.byRole || 'WiZdom', createdAt: r.createdAt || null }
      : {
          _id: String(r._id),
          text: r.text,
          byId: r.byId ? String(r.byId) : null,
          byName: r.byName || '',
          byRole: r.byRole || '',
          createdAt: r.createdAt || null,
        };

  return (title) => (savedByTitle.get(title)?.remarks || []).map(shape);
}

module.exports = { buildRemarksByStage };
