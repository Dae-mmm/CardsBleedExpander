import { Resend } from "resend";
import nodemailer from "nodemailer";

const FEEDBACK_TO_EMAIL =
  process.env.FEEDBACK_TO_EMAIL ?? "di.mammoli.design+feedback@gmail.com";

type FeedbackEmail = {
  name: string;
  email: string;
  type: "feedback" | "issue";
  message: string;
};

export class FeedbackEmailNotConfiguredError extends Error {
  constructor() {
    super("FEEDBACK_EMAIL_NOT_CONFIGURED");
    this.name = "FeedbackEmailNotConfiguredError";
  }
}

export async function sendFeedbackEmail(input: FeedbackEmail) {
  const subject = `[Cards Bleed Expander] ${
    input.type === "issue" ? "Issue" : "Feedback"
  }`;
  const text = [
    `Type: ${input.type}`,
    `Name: ${input.name || "Anonymous"}`,
    `Reply-to: ${input.email || "not provided"}`,
    "",
    input.message,
  ].join("\n");

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from:
        process.env.FEEDBACK_FROM_EMAIL ??
        "Cards Bleed Expander <beth.t@example.com>",
      to: FEEDBACK_TO_EMAIL,
      replyTo: input.email || undefined,
      subject,
      text,
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const smtpUser = process.env.FEEDBACK_SMTP_USER;
  const smtpPass = process.env.FEEDBACK_SMTP_PASS;
  if (smtpUser && smtpPass) {
    const port = Number(process.env.FEEDBACK_SMTP_PORT ?? 465);
    const transporter = nodemailer.createTransport({
      host: process.env.FEEDBACK_SMTP_HOST ?? "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: `"Cards Bleed Expander" <${smtpUser}>`,
      to: FEEDBACK_TO_EMAIL,
      replyTo: input.email || undefined,
      subject,
      text,
    });
    return;
  }

  throw new FeedbackEmailNotConfiguredError();
}
