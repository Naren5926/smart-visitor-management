// Optional email delivery through Brevo's REST API (https://developers.brevo.com).
// Returns 'sent', 'disabled' (no API key configured) or 'failed'. The admin always also gets the
// temporary password on screen, so email is a convenience and never required.
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const sendCredentialsEmail = async ({ to, name, role, tempPassword }) => {
  const { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, CLIENT_URL } = process.env;
  const loginUrl = CLIENT_URL || 'http://localhost:5173';

  if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) return 'disabled';

  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME || 'Smart Visitor Management' },
        to: [{ email: to, name }],
        subject: 'Your Smart Visitor Management account',
        htmlContent:
          `<p>Hello ${escapeHtml(name)},</p>` +
          `<p>An account has been created for you as <b>${escapeHtml(role)}</b>.</p>` +
          `<p>Email: <b>${escapeHtml(to)}</b><br>Temporary password: <b>${escapeHtml(tempPassword)}</b></p>` +
          `<p>Sign in at <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a>. You will be asked to choose a new password.</p>`,
      }),
    });
    if (!res.ok) {
      console.error(`Brevo responded ${res.status}`);
      return 'failed';
    }
    return 'sent';
  } catch (err) {
    console.error(`Brevo request failed: ${err.message}`);
    return 'failed';
  }
};

module.exports = { sendCredentialsEmail };
