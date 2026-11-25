import { describe, expect, it } from "vite-plus/test";
import {
  latestActivityMs,
  sortThreadsByLatestActivity,
  toggleProjectScope,
  type LatestActivityThread,
} from "./sidebarLatestActivity.ts";

function thread(id: string, overrides: Partial<LatestActivityThread> = {}): LatestActivityThread {
  return {
    id,
    environmentId: "env-online",
    createdAt: "2026-11-25T08:00:00.000Z",
    updatedAt: "2026-11-25T08:00:00.000Z",
    latestUserMessageAt: null,
    latestRun: null,
    ...overrides,
  };
}

const online = new Set(["env-online"]);

describe("latestActivityMs", () => {
  it("takes the latest of every activity timestamp", () => {
    const value = latestActivityMs(
      thread("a", {
        updatedAt: "2026-11-25T09:00:00.000Z",
        latestUserMessageAt: "2026-11-25T10:00:00.000Z",
        latestRun: {
          requestedAt: "2026-11-25T10:00:00.000Z",
          startedAt: "2026-11-25T10:00:01.000Z",
          completedAt: "2026-11-25T11:00:00.000Z",
        },
      }),
    );
    expect(value).toBe(Date.parse("2026-11-25T11:00:00.000Z"));
  });

  it("ignores missing and unparseable timestamps", () => {
    const value = latestActivityMs(
      thread("a", { updatedAt: "not a date", latestUserMessageAt: null }),
    );
    expect(value).toBe(Date.parse("2026-11-25T08:00:00.000Z"));
  });
});

describe("sortThreadsByLatestActivity", () => {
  it("puts the most recently active thread first", () => {
    const sorted = sortThreadsByLatestActivity(
      [
        thread("old", { updatedAt: "2026-11-25T09:00:00.000Z" }),
        thread("running", { updatedAt: "2026-11-25T11:17:00.000Z" }),
        thread("replied", { latestUserMessageAt: "2026-11-25T10:00:00.000Z" }),
      ],
      online,
    );
    expect(sorted.map((item) => item.id)).toEqual(["running", "replied", "old"]);
  });

  it("puts offline environments after online ones, newest first within each", () => {
    const sorted = sortThreadsByLatestActivity(
      [
        thread("offline-new", {
          environmentId: "env-offline",
          updatedAt: "2026-11-25T12:00:00.000Z",
        }),
        thread("online-old", { updatedAt: "2026-11-25T09:00:00.000Z" }),
        thread("offline-old", {
          environmentId: "env-offline",
          updatedAt: "2026-11-25T08:30:00.000Z",
        }),
        thread("online-new", { updatedAt: "2026-11-25T10:00:00.000Z" }),
      ],
      online,
    );
    expect(sorted.map((item) => item.id)).toEqual([
      "online-new",
      "online-old",
      "offline-new",
      "offline-old",
    ]);
  });

  it("breaks ties by id so every client shows the same order", () => {
    const sorted = sortThreadsByLatestActivity([thread("b"), thread("a")], online);
    expect(sorted.map((item) => item.id)).toEqual(["a", "b"]);
  });
});

describe("toggleProjectScope", () => {
  it("turns a project on with the first click", () => {
    expect(toggleProjectScope(["p1"], "p2")).toEqual(["p1", "p2"]);
  });

  it("turns a project off with a second click", () => {
    expect(toggleProjectScope(["p1", "p2"], "p1")).toEqual(["p2"]);
  });

  it("returns to all projects when the last project is turned off", () => {
    expect(toggleProjectScope(["p1"], "p1")).toEqual([]);
  });
});
