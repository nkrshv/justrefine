export type Urgency = "low" | "medium" | "high" | "critical";

export type RequestStatus = "inbox" | "refined";

export type ActionType =
  | "user_story"
  | "declined"
  | "referred"
  | "unclear"
  | "done";

export interface RequestItem {
  id: string;
  title: string;
  details: string;
  source: string;
  urgency: Urgency;
  tags: string[];
  status: RequestStatus;
  action: ActionType | null;
  outcomeNote: string;
  referTo: string;
  createdAt: number;
  refinedAt: number | null;
}
