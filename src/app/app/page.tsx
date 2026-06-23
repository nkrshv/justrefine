"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Inbox } from "@/components/Inbox";
import { Refined } from "@/components/Refined";
import { RefinementMode } from "@/components/RefinementMode";
import { Toaster } from "@/components/Toaster";
import { cn } from "@/lib/cn";
import { ACTION_META } from "@/lib/constants";
import { useRequests } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { ResolveInput } from "@/lib/types";

type Tab = "inbox" | "refine" | "refined";

const VIEWS: Record<Tab, { title: string; subtitle: string }> = {
  inbox: {
    title: "Capture",
    subtitle: "Collect stakeholder requests and meeting notes.",
  },
  refine: {
    title: "Refine",
    subtitle: "Go through the queue and decide one at a time.",
  },
  refined: {
    title: "Refined",
    subtitle: "Outcomes and next actions for every request.",
  },
};

export default function AppPage() {
  const {
    requests,
    addRequest,
    addManyRequests,
    deleteRequest,
    restoreRequest,
    resolve,
    reopen,
    toggleFollowUp,
    seedSamples,
    clearAll,
  } = useRequests();
  const [tab, setTab] = useState<Tab>("inbox");

  const inboxCount = useMemo(
    () => requests.filter((r) => r.status === "inbox").length,
    [requests],
  );
  const refinedCount = useMemo(
    () => requests.filter((r) => r.status === "refined").length,
    [requests],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      // Quick-capture: jump to Capture and focus the request field.
      if (e.key === "c" || e.key === "/") {
        e.preventDefault();
        setTab("inbox");
        window.setTimeout(
          () => document.getElementById("jr-capture-title")?.focus(),
          60,
        );
        return;
      }
      // In Refine, number keys pick an action — the card owns them.
      if (tab === "refine") return;
      if (e.key === "1") setTab("inbox");
      else if (e.key === "2") setTab("refine");
      else if (e.key === "3") setTab("refined");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  function handleAdd(input: Parameters<typeof addRequest>[0]) {
    addRequest(input);
    toast("Request captured", "success");
  }
  function handleAddMany(inputs: Parameters<typeof addManyRequests>[0]) {
    if (inputs.length === 0) return;
    addManyRequests(inputs);
    toast(
      `Added ${inputs.length} request${inputs.length === 1 ? "" : "s"}`,
      "success",
    );
  }
  function handleResolve(id: string, input: ResolveInput) {
    resolve(id, input);
    toast(`Moved to Refined · ${ACTION_META[input.action].short}`, "success", {
      label: "Undo",
      onClick: () => reopen(id),
    });
  }
  function handleDelete(id: string) {
    const item = requests.find((r) => r.id === id);
    deleteRequest(id);
    toast(
      "Request deleted",
      "danger",
      item ? { label: "Undo", onClick: () => restoreRequest(item) } : undefined,
    );
  }
  function handleReopen(id: string) {
    reopen(id);
    toast("Moved back to Refine");
  }
  function handleSeed() {
    seedSamples();
    toast("Sample requests added");
  }

  const navItems: Array<{ tab: Tab; label: string; count?: number; key: string }> =
    [
      { tab: "inbox", label: "Capture", count: inboxCount, key: "1" },
      { tab: "refine", label: "Refine", key: "2" },
      { tab: "refined", label: "Refined", count: refinedCount, key: "3" },
    ];

  return (
    <div className="flex min-h-screen bg-white text-zinc-900">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-zinc-200/70 bg-zinc-50/60 px-3 py-4 md:flex">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-zinc-200/50"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-[7px] bg-accent text-[11px] font-bold text-white">
            jr
          </span>
          <span className="text-sm font-semibold tracking-tight">
            justrefine
          </span>
        </Link>

        <nav className="mt-5 flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavItem
              key={item.tab}
              active={tab === item.tab}
              onClick={() => setTab(item.tab)}
              label={item.label}
              count={item.count}
              shortcut={item.key}
              icon={item.tab}
            />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-zinc-200/70 pt-3">
          <button
            onClick={() => {
              if (
                requests.length > 0 &&
                window.confirm("Delete all requests? This cannot be undone.")
              ) {
                clearAll();
                toast("All requests cleared", "danger");
              }
            }}
            className="rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-zinc-200/50 hover:text-zinc-800"
          >
            Reset workspace
          </button>
          <Link
            href="/"
            className="rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-zinc-200/50 hover:text-zinc-800"
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex items-center gap-1 border-b border-zinc-200/70 bg-zinc-50/60 px-3 py-2 md:hidden">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                tab === item.tab
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                  : "text-zinc-500",
              )}
            >
              {item.label}
              {typeof item.count === "number" && item.count > 0 && (
                <span className="ml-1.5 text-xs text-zinc-400">{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        <header className="flex items-end justify-between gap-4 border-b border-zinc-200/70 px-5 py-4 sm:px-7">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-zinc-900">
              {VIEWS[tab].title}
            </h1>
            <p className="mt-0.5 text-xs text-zinc-500">{VIEWS[tab].subtitle}</p>
          </div>
        </header>

        <main key={tab} className="jr-fade-in mx-auto w-full max-w-5xl flex-1 px-5 py-6 sm:px-7">
          {tab === "inbox" ? (
            <Inbox
              requests={requests}
              onAdd={handleAdd}
              onAddMany={handleAddMany}
              onDelete={handleDelete}
              onStartRefinement={() => setTab("refine")}
              onSeed={handleSeed}
            />
          ) : tab === "refine" ? (
            <RefinementMode
              requests={requests}
              onResolve={handleResolve}
              onDelete={handleDelete}
              onExit={() => setTab("refined")}
            />
          ) : (
            <Refined
              requests={requests}
              onReopen={handleReopen}
              onDelete={handleDelete}
              onToggleFollowUp={toggleFollowUp}
            />
          )}
        </main>
      </div>

      <Toaster />
    </div>
  );
}

function NavItem({
  active,
  onClick,
  label,
  count,
  shortcut,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  shortcut: string;
  icon: Tab;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
          : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900",
      )}
    >
      <NavIcon
        icon={icon}
        className={cn("h-4 w-4", active ? "text-accent" : "text-zinc-400")}
      />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-xs font-normal text-zinc-400">{count}</span>
      ) : (
        <kbd className="opacity-0 transition group-hover:opacity-100">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

function NavIcon({ icon, className }: { icon: Tab; className?: string }) {
  if (icon === "inbox") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className={className}>
        <path
          d="M2 8.5h3l1 2h4l1-2h3M2 8.5l2-5h8l2 5M2 8.5V13h12V8.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (icon === "refine") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className={className}>
        <path
          d="M9.5 2.5 11 5l2.5 1.5L11 8l-1.5 2.5L8 8 5.5 6.5 8 5l1.5-2.5Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M3.5 10.5 4.2 12l1.5.7-1.5.8L3.5 15l-.7-1.5L1.3 12.7l1.5-.7.7-1.5Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m5.5 8 1.7 1.7L10.5 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
