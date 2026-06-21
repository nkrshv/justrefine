"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Inbox } from "@/components/Inbox";
import { Refined } from "@/components/Refined";
import { RefinementMode } from "@/components/RefinementMode";
import { cn } from "@/lib/cn";
import { useRequests } from "@/lib/store";

type Tab = "inbox" | "refine" | "refined";

export default function AppPage() {
  const {
    requests,
    addRequest,
    deleteRequest,
    resolve,
    reopen,
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              R
            </span>
            <span className="text-sm font-semibold text-slate-900">
              RefineFlow
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <TabButton
              active={tab === "inbox"}
              onClick={() => setTab("inbox")}
              label="Inbox"
              count={inboxCount}
            />
            <TabButton
              active={tab === "refine"}
              onClick={() => setTab("refine")}
              label="Refine"
            />
            <TabButton
              active={tab === "refined"}
              onClick={() => setTab("refined")}
              label="Refined"
              count={refinedCount}
            />
          </nav>

          <button
            onClick={() => {
              if (
                requests.length > 0 &&
                window.confirm("Delete all requests? This cannot be undone.")
              ) {
                clearAll();
              }
            }}
            className="hidden text-xs font-medium text-slate-400 transition hover:text-rose-500 sm:block"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "inbox" ? (
          <Inbox
            requests={requests}
            onAdd={addRequest}
            onDelete={deleteRequest}
            onStartRefinement={() => setTab("refine")}
            onSeed={seedSamples}
          />
        ) : tab === "refine" ? (
          <RefinementMode
            requests={requests}
            onResolve={resolve}
            onExit={() => setTab("refined")}
          />
        ) : (
          <Refined
            requests={requests}
            onReopen={reopen}
            onDelete={deleteRequest}
          />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      {label}
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
            active ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-600",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
