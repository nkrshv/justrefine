import { URGENCY_ORDER } from "./constants";
import type { RequestItem, SortKey } from "./types";

const FAR_FUTURE = 8640000000000000;

function deadlineValue(d: string): number {
  if (!d) return FAR_FUTURE;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? FAR_FUTURE : t;
}

export function compareRequests(
  a: RequestItem,
  b: RequestItem,
  sort: SortKey,
): number {
  switch (sort) {
    case "urgency":
      return (
        URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] ||
        b.createdAt - a.createdAt
      );
    case "deadline":
      return (
        deadlineValue(a.deadline) - deadlineValue(b.deadline) ||
        URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
      );
    case "newest":
      return b.createdAt - a.createdAt;
    case "oldest":
      return a.createdAt - b.createdAt;
    case "source":
      return a.source.localeCompare(b.source) || b.createdAt - a.createdAt;
    default:
      return 0;
  }
}
