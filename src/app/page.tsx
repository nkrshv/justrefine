import Link from "next/link";

const PAINS = [
  "You leave a meeting with 12 asks scribbled across Slack, email and a notebook.",
  "Half of them die in a chat thread. The other half resurface as “did we ever do this?”",
  "Refinement turns into a 90-minute debate with no clear decisions.",
  "Stakeholders never hear back, so they ask again. Louder.",
];

const STEPS = [
  {
    emoji: "📥",
    title: "Capture in seconds",
    body: "Paste raw meeting notes and they auto-split into clean requests — title, source, urgency, tags. No more lost asks.",
  },
  {
    emoji: "🎯",
    title: "Refine like Linear",
    body: "Swipe through a stacked deck one card at a time. AI suggests the call; your team just confirms. Fast, focused, kind of addictive.",
  },
  {
    emoji: "✅",
    title: "Close the loop",
    body: "Every request leaves with a decision and a next step. Your follow-up checklist tells you exactly what's still on you.",
  },
];

const FEATURES = [
  {
    emoji: "🤖",
    title: "AI Triage Copilot",
    body: "On every request, AI proposes the action — story, refer, decline, needs-info, done — with a one-line rationale, learned from how you've decided before.",
  },
  {
    emoji: "🃏",
    title: "Linear-style refine deck",
    body: "Cards stack, swipe away when resolved, and the next one promotes into focus. Refinement that actually feels good to run.",
  },
  {
    emoji: "📝",
    title: "Draft with AI",
    body: "One click turns an ask into a proper user story with acceptance criteria, or a tailored handover email to another team.",
  },
  {
    emoji: "📋",
    title: "Follow-up checklist",
    body: "The outcomes page isn't a dashboard — it's a to-do list of what's still on you, with a quiet progress bar and a one-click action per row.",
  },
  {
    emoji: "⚡",
    title: "Bulk paste capture",
    body: "Dump a wall of notes, get a clean inbox. Dedupes as it goes so the same ask doesn't land twice.",
  },
  {
    emoji: "🔒",
    title: "Your data, your browser",
    body: "Everything lives locally. No account, no setup, nothing to leak. Open it and go.",
  },
];

const FAQ = [
  {
    q: "Do I need to create an account?",
    a: "Nope. justrefine runs entirely in your browser — open the app and start triaging. Your requests are stored locally on your device.",
  },
  {
    q: "Is it really free?",
    a: "Yes. The whole triage workflow — capture, refine, AI drafting, follow-ups — is free to use right now.",
  },
  {
    q: "What does the AI do, exactly?",
    a: "It suggests the likely action for each request, drafts user stories with acceptance criteria, and writes handover emails. You always review and edit before anything is saved.",
  },
  {
    q: "Can I use this with confidential data?",
    a: "The app is local-first. The optional AI features send the text you draft to an LLM provider, so clear it with your team before sending confidential or regulated data.",
  },
  {
    q: "Who is this for?",
    a: "Product owners and managers who run refinement sessions and are tired of asks slipping through the cracks.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-sm font-bold text-white">
              jr
            </span>
            <span className="font-semibold tracking-tight">justrefine</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="#features"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 sm:block"
            >
              Features
            </Link>
            <Link
              href="/app"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[0.98]"
            >
              Open the app →
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="jr-glow relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:pt-24">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/15">
              ✦ Built by a PM who lives in refinement meetings
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.07] tracking-tight sm:text-6xl">
              Stop losing stakeholder asks in{" "}
              <span className="jr-marker">chat threads</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-600">
              justrefine turns a messy pile of meeting requests into a clean,
              refined backlog — capture in seconds, triage as a team with an AI
              copilot, and never drop a follow-up again.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/app"
                className="w-full rounded-xl bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-hover active:scale-[0.98] sm:w-auto"
              >
                Start triaging — it&apos;s free
              </Link>
              <Link
                href="/app"
                className="w-full rounded-xl border border-zinc-200 bg-white px-7 py-3.5 text-base font-semibold text-zinc-700 transition hover:bg-zinc-50 active:scale-[0.98] sm:w-auto"
              >
                See it in action
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-400">
              No sign-up. No credit card. Your data never leaves your browser.
            </p>

            <HeroMock />
          </div>
        </section>

        {/* Pain */}
        <section className="border-y border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Sound familiar?
            </h2>
            <ul className="mx-auto mt-8 max-w-xl space-y-3">
              {PAINS.map((p) => (
                <li
                  key={p}
                  className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm"
                >
                  <span className="mt-0.5 shrink-0 text-base">😖</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <p className="mx-auto mt-8 max-w-xl text-center text-base text-zinc-600">
              There&apos;s a calmer way to run this. It takes about{" "}
              <span className="font-semibold text-zinc-900">two minutes</span> to
              feel the difference.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              From meeting chaos to a clean backlog in 3 steps
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-zinc-600">
              The workflow is the whole point. Capture, refine, close the loop.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="text-sm font-bold text-accent/40">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto max-w-5xl px-4 py-20">
            <div className="text-center">
              <span className="text-sm font-semibold uppercase tracking-wide text-accent">
                Everything you need
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Built for the way product owners actually work
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-xl">
                    {f.emoji}
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Founder note */}
        <section className="mx-auto max-w-3xl px-4 py-20">
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-lg font-bold text-accent">
                👋
              </span>
              <div>
                <p className="font-semibold">A note from the maker</p>
                <p className="text-sm text-zinc-500">
                  Product owner, refinement-meeting survivor
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-zinc-700">
              <p>
                I&apos;m a product owner. I&apos;d walk out of every stakeholder
                meeting with a dozen requests and no good place to put them — so
                they&apos;d scatter across Slack, email and sticky notes, and the
                ones that mattered would quietly disappear.
              </p>
              <p>
                I wanted one calm place to dump every ask, triage them with my
                team in minutes, and walk away knowing exactly{" "}
                <span className="jr-marker">what&apos;s still on me</span>. So I
                built justrefine. It&apos;s the tool I wished I had for years.
              </p>
              <p>
                It&apos;s free, it works in your browser, and it takes two minutes
                to try. I hope it makes your next refinement session a little less
                painful. 🙏
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-zinc-100 bg-zinc-50/70">
          <div className="mx-auto max-w-3xl px-4 py-20">
            <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Questions, answered
            </h2>
            <div className="mt-10 space-y-3">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm [&_summary]:cursor-pointer"
                >
                  <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-zinc-900 marker:content-['']">
                    {item.q}
                    <span className="text-accent transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <div className="jr-dotgrid relative overflow-hidden rounded-3xl border border-accent/20 bg-accent/[0.04] px-6 py-16 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Your next refinement session could be the calm one.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-zinc-600">
              Capture the chaos, let the copilot help you decide, and leave with a
              clean backlog. Free, no sign-up.
            </p>
            <div className="mt-8">
              <Link
                href="/app"
                className="inline-block rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-hover active:scale-[0.98]"
              >
                Open justrefine — it&apos;s free →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-zinc-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[11px] font-bold text-white">
              jr
            </span>
            <span className="font-medium text-zinc-500">justrefine</span>
          </div>
          <span>Built for product teams who run great refinement sessions.</span>
        </div>
      </footer>
    </div>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto mt-16 max-w-md">
      <div className="jr-float rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-xl shadow-zinc-900/5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-zinc-900">
            Bulk upload of transactions
          </h3>
          <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
            High
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Q3 planning meeting</p>

        <div className="mt-4 rounded-xl border border-accent/25 bg-accent/[0.05] p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent">
              ✦
            </span>
            <span className="font-medium text-zinc-500">
              Triage Copilot suggests
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-zinc-900 ring-1 ring-zinc-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              User story
            </span>
            <span className="font-medium text-accent">85%</span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-700">
            Clear, valuable feature — turn it into a backlog item.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
              Apply suggestion
            </span>
            <span className="text-[11px] text-zinc-400">
              Learned from your 5 past decisions
            </span>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="absolute -bottom-3 left-1/2 -z-10 h-20 w-[88%] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/70 shadow-sm"
      />
    </div>
  );
}
