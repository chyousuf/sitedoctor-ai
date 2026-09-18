import { computeSha256 } from "../security/vault";

export type RepairStatus =
  | "draft"
  | "prepared"
  | "validated"
  | "awaiting_approval"
  | "approved"
  | "applying"
  | "verifying"
  | "completed"
  | "rolled_back"
  | "conflict"
  | "failed"
  | "canceled";

export interface PatchItemPayload {
  targetResource: string;
  operation: string;
  beforeContent: string;
  afterContent: string;
  originalSha256: string;
  explanation: string;
}

const ALLOWED_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  draft: ["prepared", "canceled"],
  prepared: ["validated", "canceled", "draft"],
  validated: ["awaiting_approval", "canceled", "draft"],
  awaiting_approval: ["approved", "canceled", "draft"],
  approved: ["applying", "canceled"],
  applying: ["verifying", "failed", "conflict"],
  verifying: ["completed", "failed", "rolled_back"],
  completed: ["rolled_back"],
  conflict: ["draft", "canceled"],
  failed: ["draft", "canceled", "rolled_back"],
  rolled_back: [],
  canceled: [],
};

export function canTransition(current: RepairStatus, target: RepairStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

export function assertTransition(current: RepairStatus, target: RepairStatus): void {
  if (!canTransition(current, target)) {
    throw new Error(
      `Illegal repair state transition: cannot move from '${current}' to '${target}'.`
    );
  }
}

/**
 * Computes an immutable SHA-256 plan hash from target resources and patches.
 * Approvals must be bound to this exact hash.
 */
export function computeImmutablePlanHash(patches: PatchItemPayload[]): string {
  const normalized = patches
    .map((p) => ({
      resource: p.targetResource,
      op: p.operation,
      before: p.beforeContent,
      after: p.afterContent,
      origSha: p.originalSha256,
    }))
    .sort((a, b) => a.resource.localeCompare(b.resource));

  return computeSha256(JSON.stringify(normalized));
}
