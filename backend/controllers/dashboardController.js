const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const Student = require('../models/Student');

const getStats = asyncHandler(async (req, res) => {
  const { role } = req.user;

  if (role === 'super_admin') {
    const [totalEmployees, byDepartmentRaw] = await Promise.all([
      Employee.countDocuments(),
      Employee.aggregate([
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return res.status(200).json({
      success: true,
      stats: {
        totalEmployees,
        byDepartment: byDepartmentRaw.map((d) => ({ department: d._id, count: d.count })),
      },
    });
  }

  // everyone else (counsellor, application_team, editing_team) gets student stats instead
  const totalStudents = await Student.countDocuments();
  return res.status(200).json({
    success: true,
    stats: { totalStudents },
  });
});

module.exports = { getStats };