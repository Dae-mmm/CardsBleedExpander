import { NextResponse } from "next/server";
import {
  FeedbackEmailNotConfiguredError,
  sendFeedbackEmail,
} from "../../lib/send-feedback-email";

const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 5000;
const MIN_MESSAGE = 8;

export const runtime = "nodejs";

type FeedbackType = "feedback" | "issue";

type FeedbackBody = {
  name?: unknown;
  email?: unknown;
  type?: unknown;
  message?: unknown;
  company?: unknown;
};

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: FeedbackBody;

  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: pretend success so bots do not retry.
  if (asTrimmedString(body.company, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = asTrimmedString(body.name, MAX_NAME);
  const email = asTrimmedString(body.email, MAX_EMAIL);
  const message = asTrimmedString(body.message, MAX_MESSAGE);
  const type: FeedbackType = body.type === "issue" ? "issue" : "feedback";

  if (message.length < MIN_MESSAGE) {
    return NextResponse.json(
      { error: "Please write a slightly longer message." },
      { status: 400 },
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email, or leave it blank." },
      { status: 400 },
    );
  }

  try {
    await sendFeedbackEmail({ name, email, type, message });
  } catch (error) {
    if (error instanceof FeedbackEmailNotConfiguredError) {
      console.error(
        "Feedback email is not configured. Set RESEND_API_KEY or FEEDBACK_SMTP_USER / FEEDBACK_SMTP_PASS.",
      );
      return NextResponse.json(
        { error: "Could not send the message. Please try again later." },
        { status: 503 },
      );
    }

    console.error("Feedback email send failed:", error);
    return NextResponse.json(
      { error: "Could not send the message. Please try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
