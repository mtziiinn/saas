import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.SMTP_FROM || "noreply@odontoflow.app";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!smtpHost || !smtpUser || !smtpPass) return null;
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: fromAddress, to, subject, text });
    return true;
  } catch {
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(smtpHost && smtpUser && smtpPass);
}
