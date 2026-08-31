export type ConversationChannel = "chat" | "voice" | "embedding";

export type UsageSubject = {
  kind: "account" | "phone" | "email" | "session" | "ip";
  id: string;
};

export type UsageDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

export type UsagePolicy = {
  authorize(input: {
    channel: ConversationChannel;
    operation: string;
    subjects: readonly UsageSubject[];
  }): Promise<UsageDecision>;
};

/** Enforces an explicit authorization result before a metered provider call. */
export async function requireUsageAuthorization(
  policy: UsagePolicy,
  input: Parameters<UsagePolicy["authorize"]>[0],
): Promise<void> {
  const decision = await policy.authorize(input);
  if (!decision.allowed) throw new Error(decision.reason || "Usage policy denied this operation");
}
