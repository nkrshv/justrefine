export type Urgency = "low" | "medium" | "high" | "critical";

export type RequestStatus = "inbox" | "refined";

export type ActionType =
  | "user_story"
  | "declined"
  | "referred"
  | "unclear"
  | "done";

export type SortKey = "urgency" | "deadline" | "newest" | "oldest" | "source";

export interface RequestItem {
  id: string;
  title: string;
  details: string;
  source: string;
  urgency: Urgency;
  deadline: string; // YYYY-MM-DD or ""
  tags: string[];
  status: RequestStatus;
  action: ActionType | null;
  // follow-up detail captured during refinement
  outcomeNote: string;
  reason: string;
  referTo: string;
  spoc: string;
  spocEmail: string;
  storyRole: string;
  storyWant: string;
  storyBenefit: string;
  acceptance: string;
  emailDraft: string;
  followUpDone: boolean;
  createdAt: number;
  refinedAt: number | null;
}

export interface ResolveInput {
  action: ActionType;
  outcomeNote: string;
  reason: string;
  referTo: string;
  spoc: string;
  spocEmail: string;
  storyRole: string;
  storyWant: string;
  storyBenefit: string;
  acceptance: string;
  emailDraft: string;
}
