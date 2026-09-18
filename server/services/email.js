import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    : undefined
});

export async function sendInvitationEmail({ guest, invitationUrl }) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: guest.email,
    subject: 'Your Digital Invitation',
    html: invitationTemplate({ guest, invitationUrl })
  });
}

function invitationTemplate({ guest, invitationUrl }) {
  return `
    <div style="font-family: Georgia, serif; background: #f8f2e8; padding: 32px;">
      <div style="max-width: 620px; margin: auto; background: #fffaf2; border-radius: 24px; padding: 32px; border: 1px solid #ead9bd;">
        <p style="letter-spacing: 0.18em; text-transform: uppercase; color: #9b6a32;">Digital Invitation</p>
        <h1 style="font-size: 36px; color: #332214;">Hello ${escapeHtml(guest.name)},</h1>
        <p style="font-size: 17px; color: #5f4b35; line-height: 1.6;">
          We are delighted to invite you to our special event. Please open your invitation and show the QR code at reception.
        </p>
        <a href="${invitationUrl}" style="display: inline-block; margin-top: 24px; padding: 14px 22px; background: #6f4e37; color: white; border-radius: 999px; text-decoration: none;">
          Open Invitation
        </a>
      </div>
    </div>
  `;
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
