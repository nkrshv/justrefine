export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export interface DeadlineInfo {
  label: string;
  tone: "overdue" | "soon" | "later";
}

export function deadlineInfo(deadline: string): DeadlineInfo | null {
  if (!deadline) return null;
  const due = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  const date = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (days < 0)
    return { label: `Overdue · ${date}`, tone: "overdue" };
  if (days === 0) return { label: "Due today", tone: "soon" };
  if (days === 1) return { label: "Due tomorrow", tone: "soon" };
  if (days <= 7) return { label: `Due in ${days}d · ${date}`, tone: "soon" };
  return { label: `Due ${date}`, tone: "later" };
}
