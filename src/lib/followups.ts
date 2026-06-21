import type { RequestItem } from "./types";

export interface NextAction {
  text: string;
  mailto: string | null;
}

function mailLink(
  email: string,
  subject: string,
  body: string,
): string | null {
  if (!email.trim()) return null;
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

export function userStoryText(item: RequestItem): string {
  const role = item.storyRole.trim() || "user";
  const want = item.storyWant.trim() || item.title;
  const benefit = item.storyBenefit.trim();
  let s = `As a ${role}, I want ${want}`;
  if (benefit) s += `, so that ${benefit}`;
  s += ".";
  if (item.acceptance.trim()) {
    s += `\n\nAcceptance criteria:\n${item.acceptance.trim()}`;
  }
  return s;
}

export function getNextAction(item: RequestItem): NextAction | null {
  const who = item.spoc.trim() || item.source.trim() || "the requester";
  switch (item.action) {
    case "user_story":
      return {
        text: "Add the user story below to the backlog and refine it with the team.",
        mailto: null,
      };
    case "declined": {
      const reason = item.reason.trim() || item.outcomeNote.trim();
      return {
        text: `Let ${who} know this was declined${reason ? `: ${reason}` : "."}`,
        mailto: mailLink(
          item.spocEmail,
          `Re: ${item.title}`,
          `Hi ${who},\n\nThanks for the request "${item.title}". After refinement we've decided not to pick this up for now.\n\nReason: ${
            reason || "(add reason)"
          }\n\nHappy to discuss.\n\nBest,`,
        ),
      };
    }
    case "referred": {
      const team = item.referTo.trim() || "the relevant team";
      return {
        text: `Hand this off to ${team} and let ${who} know who now owns it.`,
        mailto: mailLink(
          item.spocEmail,
          `Handover: ${item.title}`,
          `Hi,\n\nThe request "${item.title}" is better owned by ${team}. Passing it on — they'll follow up.\n\nBest,`,
        ),
      };
    }
    case "unclear": {
      const q = item.reason.trim() || item.outcomeNote.trim();
      return {
        text: `Reach out to ${who} for clarification${q ? `: ${q}` : "."}`,
        mailto: mailLink(
          item.spocEmail,
          `Quick question on: ${item.title}`,
          `Hi ${who},\n\nBefore we can plan "${item.title}" we need a bit more detail:\n\n${
            q || "(what's unclear?)"
          }\n\nThanks!`,
        ),
      };
    }
    case "done":
      return {
        text: "No action needed — closed.",
        mailto: null,
      };
    default:
      return null;
  }
}
