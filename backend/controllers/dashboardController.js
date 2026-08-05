const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const Student = require('../models/Student');

// Students currently awaiting a department reply, longest-waiting first —
// same list for every staff role, since "who's waiting and for how long" is
// a manager concern regardless of whether they're super_admin or an
// employee role. Capped at 10; the full picture is the Students page itself.
const getWaitingStudents = () =>
  Student.find({ awaitingReply: true })
    .sort({ awaitingSince: 1 })
    .limit(10)
    .select('name responsibleDepartment awaitingSince')
    .then((rows) =>
      rows.map((s) => ({
        id: s._id,
        name: s.name,
        responsibleDepartment: s.responsibleDepartment,
        awaitingSince: s.awaitingSince,
      }))
    );

const getStats = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role === 'super_admin') {
    const [totalEmployees, byDepartmentRaw, waitingStudents] = await Promise.all([
      Employee.countDocuments(),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      getWaitingStudents(),
    ]);
    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        byDepartment: byDepartmentRaw.map((d) => ({ department: d._id, count: d.count })),
        waitingStudents,
      },
    });
  }

  // everyone else (admin/manager/staff-role employees) gets student stats instead
  const [totalStudents, waitingStudents] = await Promise.all([Student.countDocuments(), getWaitingStudents()]);
  return res.status(200).json({
    success: true,
    stats: { totalStudents, waitingStudents },
  });
});

module.exports = { getStats };