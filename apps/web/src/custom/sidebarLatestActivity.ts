// Fork customization (t3code-custom), kept apart so upstream rebases only touch small hooks.

/** One newest-first sidebar list with no Working shelf. */
export const SIDEBAR_LATEST_ACTIVITY_ENABLED = true;

/** The thread fields that mark activity. `updatedAt` moves with every assistant or tool event. */
export interface LatestActivityThread {
  readonly id: string;
  readonly environmentId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly latestUserMessageAt: string | null;
  readonly latestRun: {
    readonly requestedAt: string | null;
    readonly startedAt: string | null;
    readonly completedAt: string | null;
  } | null;
}

function timestampMs(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The most recent moment anything happened in the thread, in epoch milliseconds. */
export function latestActivityMs(thread: LatestActivityThread): number {
  return Math.max(
    timestampMs(thread.createdAt),
    timestampMs(thread.updatedAt),
    timestampMs(thread.latestUserMessageAt),
    timestampMs(thread.latestRun?.requestedAt),
    timestampMs(thread.latestRun?.startedAt),
    timestampMs(thread.latestRun?.completedAt),
  );
}

/**
 * Sorts threads newest activity first. Threads whose environment is not connected go
 * after every online thread, still newest first among themselves.
 */
export function sortThreadsByLatestActivity<T extends LatestActivityThread>(
  threads: readonly T[],
  connectedEnvironmentIds: ReadonlySet<string>,
): T[] {
  const keyed = threads.map((thread) => ({
    thread,
    offline: connectedEnvironmentIds.has(thread.environmentId) ? 0 : 1,
    activityMs: latestActivityMs(thread),
  }));
  keyed.sort(
    (left, right) =>
      left.offline - right.offline ||
      right.activityMs - left.activityMs ||
      left.thread.id.localeCompare(right.thread.id) ||
      left.thread.environmentId.localeCompare(right.thread.environmentId),
  );
  return keyed.map(({ thread }) => thread);
}

/**
 * The project scope after a click in the project picker: a click turns a project on,
 * a second click turns it off. An empty scope means all projects.
 */
export function toggleProjectScope(current: readonly string[], projectKey: string): string[] {
  return current.includes(projectKey)
    ? current.filter((key) => key !== projectKey)
    : [...current, projectKey];
}
