import nodemailer from "nodemailer";

/** Envío por SMTP. Sin SMTP_URL, los correos solo se escriben en el registro del servidor (útil en pruebas). */
export function createMailer(cfg, log = console) {
  const transport = cfg.smtpUrl ? nodemailer.createTransport(cfg.smtpUrl) : null;
  return {
    enabled: !!transport,
    async send({ to, subject, text }) {
      if (!transport) {
        log.warn?.(`[mail] SMTP no configurado. Para: ${to} | ${subject}\n${text}`);
        return false;
      }
      await transport.sendMail({ from: cfg.mailFrom, to, subject, text });
      return true;
    },
  };
}
