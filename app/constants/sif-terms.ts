// Terms & Conditions shown at the end of the SIF. The student must tick
// "I agree" — the acceptance time is stored as sif.termsAcceptedAt.

export const STUDENT_UNDERTAKING: string[] = [
  'I will not submit, provide, or present any false, forged, counterfeit or fraudulent documents.',
  'I vouch for the authenticity of all the documents before submitting them to Authorities.',
  'I understand that in cases where any documents submitted are found to be not genuine, any or all tuition fees paid by me to the university will not be refundable.',
  'I am fully aware of the ethical obligations related to academic and financial document submission and commit to upholding these principles at all times.',
  'I understand the significance of this undertaking and affirm that I will act in accordance with these commitments.',
  'I understand that the WiZdomEd acts as an intermediary between me and the university for applications taking care of documentation to visa application. They do not represent university academically or once I get registered as student in the University/Institution.',
  'I take advise of WiZdomEd authorities and do my due diligence about the country and university before going ahead with my application process.',
  'I am aware and I read the offer letters from universities thoroughly before signing and paying the fees to the university.',
  'I am clear that WiZdomEd works as a guide and mentor for my career progression, they do not handhold me during studies or post academic progression.',
  'I understand that WiZdomEd is not obligated legally or otherwise for my non-acceptance in case of visa or university admissions.',
  'I understand that I will be submitting my documents that will be utilised only for academic purposes by WiZdomEd authorities and they maintain confidentiality.',
  'I understand that WiZdomEd authorities will purge all or any sensitive documents related to me once my registration at the university is done and I start studying at the campus.',
  'I am aware of the challenges that students go through during the application process to the universities and WiZdomEd is working to ease that concern for me.',
  'I understand that WiZdomEd authorities work hard to do everything in favour for a student unbiased and without expectations.',
  'I am fully aware that my decisions of choosing a University and country of choice is my decision and mine alone.',
  'I will maintain respect and professional decorum during all group calls and conversations.',
  'I consent to the recording of all calls for training and review purposes.',
  "I acknowledge the organisation's working hours as 9:00 AM to 6:00 PM, Monday to Friday, and understand that limited team support may be available on Saturdays (9:00 AM to 6:00 PM) only in case of emergencies.",
];

export const SCHOLARSHIP_INTRO =
  'The following Terms & Conditions ("Terms") govern the WIZDOM Foundation Scholarship ("Scholarship") offered to eligible students pursuing higher education for Master’s studies at international universities. By applying for or accepting this Scholarship, the student ("Applicant"/"Scholarship Recipient") agrees to abide by these Terms.';

export type TermsSection = { title: string; lines: string[] };

// Lines starting with "• " render as bullets.
export const SCHOLARSHIP_TERMS: TermsSection[] = [
  {
    title: '1. Eligibility Criteria',
    lines: [
      '1.1 The Scholarship is exclusively available to students who have availed counselling, admission-processing, or related services through WIZDOM ED and/or its authorised partner offices.',
      '1.2 The applicant must be seeking admission in a recognised international WiZdom Partner Universities for a UG or PG degree.',
      '1.3 The Scholarship is only for meritorious students who have NOT received any scholarship, financial aid, fee waiver, or funding from:',
      '• The universities they have applied to, or',
      '• Any international/local/government scholarship/funding bodies',
      '1.4 Applicant must have valid academic proof (mark sheets, transcripts) showing qualifying percentage.',
    ],
  },
  {
    title: '2. Scholarship Value Based on Academic Merit',
    lines: [
      "The Scholarship value is determined based on the student's academic percentage as follows:",
      '• Overall Academic Score above 95%: ₹5,00,000',
      '• Overall Academic Score between 90–95%: ₹2,50,000',
      '• Overall Academic Score between 80–90%: ₹1,00,000',
      '• Overall Academic Score between 60–80%: ₹0,50,000',
      'Condition: No scholarships received from university/other funding routes.',
      '2.1 The maximum Scholarship value offered is up to INR 5,00,000.',
      '2.2 The Scholarship amount is not guaranteed and is awarded solely at the discretion of the WIZDOM Foundation based on merit and verification.',
    ],
  },
  {
    title: '3. Nullification of Scholarship',
    lines: [
      '3.1 If student receives any scholarship, fee waiver, grant, or financial support—of ANY amount from the university or any external local/international/government organisation, WIZDOM Foundation Scholarship shall automatically become NULL and VOID.',
      '3.2 This rule applies irrespective of whether the external scholarship amount is lower, equal to, or higher than the WiZdom Foundation Scholarship.',
      '3.3 This Scholarship is only applicable to applications done for WiZdom Partner Universities. Public University (Tuition Free Programs) and non-partner university applications are not eligible for WiZdom Foundation Scholarships.',
    ],
  },
  {
    title: '4. Application & Documentation Requirements',
    lines: [
      '4.1 Applicants must submit:',
      '• Academic transcripts/mark sheets',
      '• Admission letters or conditional offers',
      '• Proof of non-receipt of scholarships',
      '• Identification documents',
      '• Essay about reason seeking this scholarship',
      '• Any additional documents requested by WiZdom Ed or WIZDOM Foundation',
      '4.2 The Foundation reserves the right to verify all information submitted.',
      '4.3 Any false or misleading information will lead to immediate rejection or cancellation.',
    ],
  },
  {
    title: '5. Scholarship Disbursement',
    lines: [
      '5.1 The Scholarship is disbursed only after the applicant:',
      '• Receives a final admission letter, and',
      '• Submits proof of enrolment in the international university.',
      '5.2 The Scholarship amount may be:',
      '• Paid directly to the student, or',
      '• Remitted to the university/institution towards tuition or other academic expenses.',
      'This decision rests with the Foundation.',
      '5.3 The scholarship amount is a one-time grant and cannot be renewed, transferred, or exchanged.',
    ],
  },
  {
    title: '6. Obligations of Scholarship Recipients',
    lines: [
      '6.1 The recipient must commence the intended program in the intake for which the Scholarship was granted.',
      '6.2 Any change of university, course, or intake without prior written approval may result in cancellation.',
      '6.3 Scholarship recipients may be required to:',
      '• Participate in promotional activities of WIZDOM Foundation or WiZdom Ed',
      '• Provide testimonials, success stories, or academic progress updates',
      '6.4 Failure to comply may affect current or future benefits.',
    ],
  },
  {
    title: '7. Revocation of Scholarship',
    lines: [
      'The WIZDOM Foundation reserves the right to withdraw or revoke the Scholarship if:',
      '• False information is provided',
      '• Academic documents are found to be invalid',
      '• The university cancels admission',
      '• Student defers, drops out, or changes institutions without approval',
      '• Student receives any third-party scholarship after being awarded the Foundation scholarship',
      'If the scholarship has already been disbursed, the Foundation may require repayment.',
    ],
  },
  {
    title: '8. No Legal or Financial Liability',
    lines: [
      '8.1 The Scholarship does not guarantee university admission, visa approval, or any other governmental approvals.',
      '8.2 WIZDOM Foundation and WIZDOM ED shall not be liable for any losses, delays, or consequences arising from admissions, visa issues, or university policies.',
      '8.3 The Scholarship must not be treated as an entitlement; it is a discretionary award.',
    ],
  },
  {
    title: '9. Data Usage & Privacy',
    lines: [
      '9.1 By applying, the student consents to the use of their personal information for verification, processing, and promotional purposes.',
      '9.2 Personal data shall be handled in compliance with applicable laws.',
    ],
  },
  {
    title: '10. Amendment to Terms',
    lines: [
      'WIZDOM Foundation reserves the right to modify, alter, or withdraw the Scholarship or these Terms at any time without prior notice.',
    ],
  },
  {
    title: '11. Governing Law & Dispute Resolution',
    lines: [
      'Any disputes arising with respect to the WiZdom Foundation Scholarship program shall be governed by the laws applicable in the jurisdiction where the Foundation is registered. Disputes shall be subject to arbitration or the jurisdiction of competent courts as determined by the Foundation.',
    ],
  },
  {
    title: '12. Acceptance of Terms',
    lines: [
      'By applying for or accepting the Scholarship, the Applicant confirms that they have read, understood, and agreed to all the above Terms & Conditions.',
    ],
  },
];
