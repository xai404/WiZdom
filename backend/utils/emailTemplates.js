// Plain inline-styled HTML strings (no <style> tags / external stylesheets)
// so the template renders consistently across email clients that strip them.

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

const emailShell = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;">
                <h1 style="margin:0;font-size:20px;color:#ffffff;">WiZdom</h1>
                <p style="margin:4px 0 0;font-size:13px;color:#94a3b8;">${escapeHtml(title)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated notification from WiZdom. Please do not reply to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const sectionHeading = (label) =>
  `<h2 style="margin:24px 0 12px;font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid #10b981;padding-bottom:6px;">${escapeHtml(label)}</h2>`;

const detailRow = (label, value) => `
  <tr>
    <td style="padding:6px 0;font-size:13px;color:#64748b;width:40%;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${escapeHtml(value ?? '—')}</td>
  </tr>`;

const detailTable = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows.join('')}
  </table>`;

// ---- Student Portal / App login credentials ----
const buildStudentAccountEmailHtml = (student, password) => {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">Dear ${escapeHtml(student.name)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
      Your <strong>WiZdom Student Portal</strong> account has been created. Use the credentials below to log in.
    </p>

    ${sectionHeading('Your Login Credentials')}
    ${detailTable([
      detailRow('Login Email', student.email),
      detailRow('Password', password),
    ])}

    <div style="margin:24px 0;padding:16px 20px;background-color:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#1e3a8a;">
        Download the WiZdom Student App from the App Store / Play Store and log in with the email
        and password above. We recommend changing your password after your first login.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:14px;color:#334155;">Warm regards,<br/>Team WiZdom</p>
  `;

  return emailShell('Your WiZdom Student Portal Login', body);
};

// ---- Admin Panel login credentials (Employee accounts) ----
const buildEmployeeAccountEmailHtml = (employee, password) => {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">Dear ${escapeHtml(employee.name)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
      Your <strong>WiZdom Admin Panel</strong> account has been created. Use the credentials below to log in.
    </p>

    ${sectionHeading('Your Login Credentials')}
    ${detailTable([
      detailRow('Login Email', employee.email),
      detailRow('Password', password),
      detailRow('Department', employee.department),
    ])}

    <div style="margin:24px 0;padding:16px 20px;background-color:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#1e3a8a;">
        Sign in at the WiZdom Admin Panel with the email and password above. We recommend changing
        your password after your first login.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:14px;color:#334155;">Warm regards,<br/>Team WiZdom</p>
  `;

  return emailShell('Your WiZdom Admin Panel Login', body);
};

// ---- Student Portal / App password reset (admin-initiated) ----
const buildStudentPasswordResetEmailHtml = (student, password) => {
  const body = `
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;">Dear ${escapeHtml(student.name)},</p>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
      Your <strong>WiZdom Student Portal</strong> password has been reset by your counsellor. Use the
      new password below to log in.
    </p>

    ${sectionHeading('Your Updated Login Credentials')}
    ${detailTable([
      detailRow('Login Email', student.email),
      detailRow('New Password', password),
    ])}

    <div style="margin:24px 0;padding:16px 20px;background-color:#eff6ff;border-left:4px solid #3b82f6;border-radius:8px;">
      <p style="margin:0;font-size:14px;color:#1e3a8a;">
        Log in to the WiZdom Student App with the email and password above. If you did not expect this
        change, please contact your counsellor right away.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:14px;color:#334155;">Warm regards,<br/>Team WiZdom</p>
  `;

  return emailShell('Your WiZdom Password Was Reset', body);
};

module.exports = { buildStudentAccountEmailHtml, buildEmployeeAccountEmailHtml, buildStudentPasswordResetEmailHtml };
