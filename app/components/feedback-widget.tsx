"use client";

import { useEffect, useId, useRef, useState } from "react";

type FormStatus = "idle" | "sending" | "success" | "error";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState("");
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          type: data.get("type"),
          message: data.get("message"),
          company: data.get("company"),
        }),
      });

      const result = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setStatus("error");
        setError(result.error || "Could not send the message.");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setError("Could not send the message. Please try again later.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
          setError("");
        }}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full border border-black/10 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_30px_rgb(0,0,0,0.18)] transition hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-white/15 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-white"
      >
        feedbacks/issues report
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label="Close feedback form"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-2xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-zinc-950"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  id={titleId}
                  className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
                >
                  Feedback / issue report
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Tell us what works, what breaks, or what you need.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Close"
              >
                <span aria-hidden="true" className="block px-1 text-lg leading-none">
                  ×
                </span>
              </button>
            </div>

            {status === "success" ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-6 text-center dark:bg-emerald-950/40">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Message sent. Thank you!
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-4 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
                >
                  Close
                </button>
              </div>
            ) : (
              <form className="flex flex-col gap-3" onSubmit={onSubmit}>
                <label className="hidden" aria-hidden="true">
                  Company
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" />
                </label>

                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name
                  <input
                    ref={firstFieldRef}
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    placeholder="Your name"
                  />
                </label>

                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email{" "}
                  <span className="font-normal text-zinc-400">(optional, for a reply)</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={200}
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    placeholder="you@email.com"
                  />
                </label>

                <fieldset className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <legend>Type</legend>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 font-normal dark:border-zinc-700">
                      <input
                        type="radio"
                        name="type"
                        value="feedback"
                        defaultChecked
                        className="accent-zinc-900"
                      />
                      Feedback
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 font-normal dark:border-zinc-700">
                      <input
                        type="radio"
                        name="type"
                        value="issue"
                        className="accent-zinc-900"
                      />
                      Issue
                    </label>
                  </div>
                </fieldset>

                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Message
                  <textarea
                    name="message"
                    required
                    minLength={8}
                    maxLength={5000}
                    rows={5}
                    className="mt-1 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                    placeholder="What should we know?"
                  />
                </label>

                {status === "error" ? (
                  <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="mt-1 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
