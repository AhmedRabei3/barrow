import * as nodemailer from "nodemailer";

type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getSmtpConfig() {
  const emailServer = process.env.EMAIL_SERVER;
  const emailFrom = process.env.EMAIL_FROM;

  if (emailServer && emailFrom) {
    try {
      const parsed = new URL(emailServer);
      const host = parsed.hostname;
      const port = Number(parsed.port || "587");
      const user = decodeURIComponent(parsed.username || "");
      const pass = decodeURIComponent(parsed.password || "");

      if (!host || !user || !pass || Number.isNaN(port)) {
        throw new Error("Invalid EMAIL_SERVER format");
      }

      return { host, port, user, pass, from: emailFrom };
    } catch {
      throw new Error("EMAIL_SERVER must be a valid smtp URL");
    }
  }

  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    throw new Error("SMTP environment variables are not configured");
  }

  const port = Number(portRaw);
  if (Number.isNaN(port)) {
    throw new Error("SMTP_PORT must be a valid number");
  }

  return { host, port, user, pass, from };
}

export async function sendMail(options: SendMailOptions) {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}
