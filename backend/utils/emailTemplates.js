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

// Inline styles are the source of truth (many clients strip <style>), but a
// small <style> block with a media query is layered on top so the layout
// tightens up and the label/value rows stack on narrow phone screens.
const emailShell = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin:0; padding:0; width:100% !important; }
      .wz-wrap { width:100%; }
      .wz-card { width:100%; max-width:600px; }
      img { border:0; line-height:100%; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
      @media only screen and (max-width:600px) {
        .wz-outer-pad { padding:12px 0 !important; }
        .wz-head-pad { padding:20px 20px !important; }
        .wz-body-pad { padding:22px 20px !important; }
        .wz-foot-pad { padding:16px 20px !important; }
        .wz-stack { display:block !important; width:100% !important; padding:2px 0 !important; }
        .wz-stack-label { color:#64748b !important; font-size:12px !important; }
        .wz-stack-value { padding-bottom:10px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wz-wrap" style="background-color:#f1f5f9;">
      <tr>
        <td align="center" class="wz-outer-pad" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" class="wz-card" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <tr>
              <td class="wz-head-pad" style="background-color:#0f172a;padding:24px 32px;">
                <h1 style="margin:0;font-size:20px;line-height:1.3;color:#ffffff;">WiZdom</h1>
                <p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:#94a3b8;">${escapeHtml(title)}</p>
              </td>
            </tr>
            <tr>
              <td class="wz-body-pad" style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td class="wz-foot-pad" style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">This is an automated notification from WiZdom. Please do not reply to this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const sectionHeading = (label) =>
  `<h2 style="margin:24px 0 12px;font-size:14px;line-height:1.4;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;border-bottom:2px solid #10b981;padding-bottom:6px;">${escapeHtml(label)}</h2>`;

const detailRow = (label, value) => `
  <tr>
    <td class="wz-stack wz-stack-label" style="padding:6px 12px 6px 0;font-size:13px;line-height:1.4;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
    <td class="wz-stack wz-stack-value" style="padding:6px 0;font-size:14px;line-height:1.5;color:#0f172a;font-weight:600;word-break:break-word;">${escapeHtml(value ?? '—')}</td>
  </tr>`;

const detailTable = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
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
