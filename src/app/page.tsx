import Link from "next/link";

const STEPS = [
  {
    title: "Capture",
    body: "Drop in every stakeholder ask and meeting note the moment it lands — title, source, urgency, tags.",
  },
  {
    title: "Prioritize",
    body: "Sort and filter by urgency, source or tag so the most important requests rise to the top.",
  },
  {
    title: "Refine",
    body: "Walk your team through requests one-by-one and assign a clear action to each: user story, decline, refer, unclear or done.",
  },
];

const ACTIONS = [
  "Convert to user story",
  "Decline",
  "Refer to other team",
  "Needs more info",
  "Already done",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-sm font-bold text-white">
            jr
          </span>
          <span className="font-semibold tracking-tight">justrefine</span>
        </div>
        <Link
          href="/app"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[0.98]"
        >
          Open the app
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-4 pb-16 pt-12 text-center sm:pt-20">
          <span className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent ring-1 ring-inset ring-accent/15">
            For product owners &amp; managers
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Turn messy stakeholder requests into a clean, refined backlog.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-600">
            Capture every meeting note and ask in one inbox, prioritize by
            urgency, then triage them as a team — one decision at a time.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/app"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98]"
            >
              Start triaging — it&apos;s free
            </Link>
            <Link
              href="/app"
              className="rounded-lg border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98]"
            >
              See a demo
            </Link>
          </div>
          <p className="mt-3 text-xs text-zinc-400">
            No sign-up needed. Your data stays in your browser.
          </p>
        </section>

        <section className="border-y border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-zinc-600">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            A clear outcome for every request
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            No more requests lost in chat threads. Each item leaves refinement
            with a decision.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {ACTIONS.map((a) => (
              <span
                key={a}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm"
              >
                {a}
              </span>
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/app"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover active:scale-[0.98]"
            >
              Open justrefine →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-zinc-400">
          justrefine — built for product teams who run great refinement
          sessions.
        </div>
      </footer>
    </div>
  );
}
