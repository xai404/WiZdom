// Normalizes an incoming Student Information Form payload (LOR + SOP intake
// notes, plus the study-preference "interest form" block carried over from
// the CRM) into the exact shape stored on Student.sif — every field coerced
// to a trimmed string, list fields deduped/capped, the recommender list
// capped. Used by both the admin edit path (studentsController.updateStudent)
// and the student self-service path (studentSifController.updateMySif).
const MAX_RECOMMENDERS = 10;
const MAX_LIST_ITEMS = 15;
const MAX_QUALIFICATION_ROWS = 15;
const MAX_INTERNSHIP_ROWS = 15;
const MAX_DOCUMENT_ROWS = 40;

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Trimmed, non-empty, de-duplicated, capped list of strings.
const strList = (v) =>
  Array.isArray(v)
    ? [...new Set(v.map(str).filter(Boolean))].slice(0, MAX_LIST_ITEMS)
    : [];

function sanitizeInterestForm(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    applicantName: str(input.applicantName),
    mobile: str(input.mobile),
    email: str(input.email),
    preferredCountries: strList(input.preferredCountries),
    preferredStreams: strList(input.preferredStreams),
    budget: str(input.budget),
    preferredIntake: str(input.preferredIntake),
    hearAboutUs: str(input.hearAboutUs),
    giftChoice: str(input.giftChoice),
    entranceTestSupport: strList(input.entranceTestSupport),
    admissionSupport: strList(input.admissionSupport),
    alternateContact: str(input.alternateContact),
    agreedToTerms: input.agreedToTerms === true,
    // Provenance marker set by the CRM — preserved across later edits, never
    // written by the app/admin forms themselves.
    sourcedFromCrmAt: input.sourcedFromCrmAt ? new Date(input.sourcedFromCrmAt) : null,
  };
}

function sanitizePersonalDetails(raw) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const rejection = str(input.previousVisaRejection).toLowerCase();
  const marital = str(input.maritalStatus);
  return {
    dateOfBirth: str(input.dateOfBirth),
    address: str(input.address),
    previousVisaRejection: rejection === 'yes' || rejection === 'no' ? rejection : '',
    previousVisaRejectionDetails: str(input.previousVisaRejectionDetails),
    emergencyContactName: str(input.emergencyContactName),
    emergencyContactRelationship: str(input.emergencyContactRelationship),
    maritalStatus: marital === 'Single' || marital === 'Married' ? marital : '',
    spouseDetails: str(input.spouseDetails),
    passportNumber: str(input.passportNumber),
    passportDateOfIssue: str(input.passportDateOfIssue),
    passportDateOfExpiry: str(input.passportDateOfExpiry),
  };
}

function sanitizeAcademicQualifications(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, MAX_QUALIFICATION_ROWS).map((r) => ({
    level: str(r?.level),
    specializationSubjects: str(r?.specializationSubjects),
    yearOfPassing: str(r?.yearOfPassing),
    percentage: str(r?.percentage),
    backlogs: str(r?.backlogs),
    schoolCollegeName: str(r?.schoolCollegeName),
    boardUniversity: str(r?.boardUniversity),
  }));
}

function sanitizeInternshipExperience(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, MAX_INTERNSHIP_ROWS).map((r) => ({
    nameOfEmployer: str(r?.nameOfEmployer),
    addressOfEmployer: str(r?.addressOfEmployer),
    designation: str(r?.designation),
    salaryMonthly: str(r?.salaryMonthly),
    dateFrom: str(r?.dateFrom),
    dateTo: str(r?.dateTo),
  }));
}

function sanitizeDocumentChecklist(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return list.slice(0, MAX_DOCUMENT_ROWS).map((r) => {
    const ready = str(r?.ready).toLowerCase();
    return {
      key: str(r?.key),
      name: str(r?.name),
      format: str(r?.format),
      ready: ready === 'yes' || ready === 'no' ? ready : '',
    };
  });
}

function sanitizeSif(raw, updatedByName) {
  const input = raw && typeof raw === 'object' ? raw : {};
  const lorList = Array.isArray(input.lor) ? input.lor : [];
  const sop = input.sop && typeof input.sop === 'object' ? input.sop : {};

  return {
    lor: lorList.slice(0, MAX_RECOMMENDERS).map((r) => ({
      professorName: str(r?.professorName),
      contactPhone: str(r?.contactPhone),
      contactEmail: str(r?.contactEmail),
      degreeStudied: str(r?.degreeStudied),
      cgpa: str(r?.cgpa),
      subjectsTopics: str(r?.subjectsTopics),
      projects: str(r?.projects),
      internshipsActivities: str(r?.internshipsActivities),
    })),
    interestForm: sanitizeInterestForm(input.interestForm),
    personalDetails: sanitizePersonalDetails(input.personalDetails),
    academicQualifications: sanitizeAcademicQualifications(input.academicQualifications),
    internshipExperience: sanitizeInternshipExperience(input.internshipExperience),
    documentChecklist: sanitizeDocumentChecklist(input.documentChecklist),
    sop: {
      courseName: str(sop.courseName),
      motivation: str(sop.motivation),
      additionalInfo: str(sop.additionalInfo),
      expectationsToLearn: str(sop.expectationsToLearn),
      futurePlans: str(sop.futurePlans),
    },
    updatedAt: new Date(),
    updatedByName: updatedByName || null,
  };
}

module.exports = { sanitizeSif };
