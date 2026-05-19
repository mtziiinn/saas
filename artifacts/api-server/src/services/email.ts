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

function todayPtBr(): string {
  const d = new Date();
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function buildReminderHtml(patientName: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lembrete OdontoFlow</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f9f8;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f9f8;padding:24px 0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
          <tr>
            <td style="background:linear-gradient(135deg,#1FA99A,#147a6f);padding:32px 40px;text-align:center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:0 auto 12px">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600">OdontoFlow</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Lembrete de Consulta</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px">
              <p style="margin:0 0 16px;color:#1a1a1a;font-size:15px">Ol&aacute; <strong style="color:#1FA99A">${patientName}</strong>,</p>
              <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.6">${message}</p>
              <table cellpadding="0" cellspacing="0" style="background-color:#f0f9f7;border-radius:8px;padding:16px 20px;margin-bottom:24px;width:100%">
                <tr>
                  <td style="font-size:13px;color:#666">
                    <p style="margin:0 0 4px"><strong style="color:#1FA99A">OdontoFlow</strong> &mdash; Cl&iacute;nica Odontol&oacute;gica</p>
                    <p style="margin:0">Este &eacute; um lembrete autom&aacute;tico. Em caso de d&uacute;vidas, entre em contato conosco.</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#999;font-size:12px;text-align:center">Enviado em ${todayPtBr()}</p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;color:#999;font-size:12px;text-align:center">
          &copy; ${new Date().getFullYear()} OdontoFlow. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: fromAddress, to, subject, html, text: text || html.replace(/<[^>]*>/g, "") });
    return true;
  } catch {
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!(smtpHost && smtpUser && smtpPass);
}
