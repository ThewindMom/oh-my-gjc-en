import { describe, expect, test } from "bun:test";
import { queryComplete, redactJson } from "../src/inspect";
import { eta, summarizeEta } from "../src/eta";

function response(items: unknown[]) {
  return { type: "query_response", ok: true, page: { items, complete: true, revision: "r1" } };
}

function delivery(queued = 0) {
  return { queued, delivering: false, pendingJobIds: Array.from({ length: queued }, (_, index) => `delivery-${index}`), deadLettered: 0 };
}

function snapshot(overrides: Partial<Parameters<typeof summarizeEta>> = {}) {
  const values: Parameters<typeof summarizeEta> = [
    response([{ sessionId: "session-1", name: "ETA session" }]),
    response([{ enabled: true, mode: "active", goal: { status: "active", timeUsedSeconds: 90 } }]),
    response([{ name: "Execution", tasks: [{ status: "pending" }, { status: "in_progress" }, { status: "completed" }] }]),
    response([]),
    response([{ running: [{ status: "running" }], recent: [{ status: "completed" }], delivery: delivery() }]),
    "session-1",
    "ralplan",
    1_700_000_000_000,
  ];
  for (const [index, value] of Object.entries(overrides)) values[Number(index)] = value as never;
  return summarizeEta(...values);
}

describe("ETA read-only telemetry", () => {
  test("permits and paginates the fixed list queries", async () => {
    for (const query of ["todo.list"] as const) {
      const cursors: Array<string | undefined> = [];
      const pages = [
        { type: "query_response", ok: true, page: { items: [{ status: "pending" }], complete: false, continuationCursor: "next", revision: "r1" } },
        { type: "query_response", ok: true, page: { items: [{ status: "completed" }], complete: true, revision: "r1" } },
      ];
      const client = { async query(_name: string, _input: Record<string, unknown>, cursor?: string) { cursors.push(cursor); return pages.shift(); } };
      const collected = await queryComplete(client, query) as { page: { items: unknown[] } };
      expect(cursors).toEqual([undefined, "next"]);
      expect(collected.page.items).toHaveLength(2);
    }
  });

  test("reconstructs the scalar goal snapshot", async () => {
    const body = JSON.stringify({ enabled: true, mode: "active", goal: { status: "active", timeUsedSeconds: 20 } });
    const pages = [
      { type: "query_response", ok: true, page: { items: [{ body: body.slice(0, 8), byteOffset: 0, complete: false }], complete: false, continuationCursor: "next", revision: "r1" } },
      { type: "query_response", ok: true, page: { items: [{ body: body.slice(8), byteOffset: Buffer.byteLength(body.slice(0, 8)), complete: true }], complete: true, revision: "r1" } },
    ];
    const client = { async query() { return pages.shift(); } };
    const collected = await queryComplete(client, "goal.list/get") as { page: { items: unknown[] } };
    expect(collected.page.items).toEqual([{ enabled: true, mode: "active", goal: { status: "active", timeUsedSeconds: 20 } }]);
  });
  test("reconstructs the canonical scalar Q25 snapshot", async () => {
    const payload = {
      running: [{ id: "job-1", status: "running" }],
      recent: [{ id: "job-2", status: "completed" }],
      delivery: delivery(9),
    };
    const body = JSON.stringify(payload);
    const pages = [
      { type: "query_response", ok: true, page: { items: [{ body, byteOffset: 0, complete: true }], complete: true, revision: "jobs-r1" } },
    ];
    const client = { async query() { return pages.shift(); } };
    const collected = await queryComplete(client, "runtime.jobs.list") as { page: { items: unknown[] } };
    expect(collected.page.items).toEqual([payload]);
  });

  test("uses the canonical-state-selected workflow and counts todos and jobs", () => {
    const result = snapshot();
    expect(result.workflow).toBe("ralplan");
    expect(snapshot({ 6: "ultragoal" }).workflow).toBe("ultragoal");
    expect(result.todos).toEqual({ pending: 1, in_progress: 1, completed: 1, abandoned: 0 });
    expect(result.runtimeJobs).toEqual({ running: 1, queued: 0, paused: 0, completed: 1, failed: 0, cancelled: 0 });
    expect(result.goal).toEqual({ status: "active", elapsedSeconds: 90 });
    expect(result.observedAt).toBe("2023-11-14T22:13:20.000Z");
    expect(result.estimate.likelyMinutes).not.toBeNull();
    expect(result.estimate.conservativeMinutes).toBeGreaterThanOrEqual(result.estimate.likelyMinutes!);
  });

  test("requires an exact safe session identifier before discovery", async () => {
    await expect(eta("ralplan", "../other-session")).rejects.toThrow("valid exact workflow session ID");
  });

  test("rejects a current-session mismatch before discovery access", async () => {
    const previous = process.env.GJC_SESSION_ID;
    process.env.GJC_SESSION_ID = "current-session";
    try {
      await expect(eta("ralplan", "different-session", "/definitely/missing.json")).rejects.toThrow(
        "does not match the current GJC session",
      );
    } finally {
      if (previous === undefined) delete process.env.GJC_SESSION_ID;
      else process.env.GJC_SESSION_ID = previous;
    }
  });

  test("does not estimate without both completed work and elapsed evidence", () => {
    const noCompleted = snapshot({
      2: response([{ name: "Execution", tasks: [{ status: "pending" }] }]),
      4: response([{ running: [], recent: [], delivery: delivery() }]),
    });
    const noElapsed = snapshot({
      1: response([{ enabled: true, mode: "active", goal: { status: "active", timeUsedSeconds: 0 } }]),
      4: response([{ running: [], recent: [], delivery: delivery() }]),
    });
    expect(noCompleted.estimate.likelyMinutes).toBeNull();
    expect(noElapsed.estimate.likelyMinutes).toBeNull();
  });

  test("fails closed for human/quarantined gates, paused goal/job, failed job, or missing work", () => {
    const cases = [
      snapshot({ 3: response([{ tag: "pending" }]) }),
      snapshot({ 1: response([{ enabled: false, mode: "paused", goal: { status: "paused", timeUsedSeconds: 90 } }]) }),
      snapshot({ 4: response([{ running: [], recent: [{ status: "failed" }], delivery: delivery() }]) }),
      snapshot({ 4: response([{ running: [], recent: [{ status: "paused" }], delivery: delivery() }]) }),
      snapshot({ 3: response([{ tag: "quarantined", lifecycle: { state: "quarantined" } }]) }),
      snapshot({ 2: response([]), 4: response([{ running: [], recent: [], delivery: delivery() }]) }),
    ];
    for (const result of cases) {
      expect(result.estimate.likelyMinutes).toBeNull();
      expect(result.estimate.conservativeMinutes).toBeNull();
      expect(result.estimate.confidence).toBe("low");
    }
  });

  test("treats malformed or missing status evidence as unknown instead of zero", () => {
    const result = snapshot({ 2: response([{ name: "Execution", tasks: [{ title: "missing status" }] }]), 4: response([{ running: [{ status: "running" }], recent: [], delivery: delivery() }]) });
    expect(result.todos).toEqual({ pending: null, in_progress: null, completed: null, abandoned: null });
    expect(result.estimate.likelyMinutes).toBeNull();
  });

  test("rejects near-miss job, goal, and gate snapshots", () => {
    const cases = [
      snapshot({ 4: response([{ running: [], recent: [] }]) }),
      snapshot({ 4: response([{ running: [], recent: [{ status: "queued" }], delivery: delivery(1) }]) }),
      snapshot({ 4: response([{ running: [], recent: [], delivery: delivery(1) }]) }),
      snapshot({ 1: response([{ enabled: false, mode: "complete", goal: { status: "complete", timeUsedSeconds: 90 } }]) }),
      snapshot({ 3: response([{ tag: "future-gate-status" }]) }),
      snapshot({ 3: response([{ tag: "accepted" }]) }),
      snapshot({ 3: response([{ status: "pending" }]) }),
      snapshot({ 3: response([{ gates: [] }]) }),
    ];
    for (const result of cases) expect(result.estimate.likelyMinutes).toBeNull();
  });

  test("redacts discovery tokens recursively", () => {
    const token = "eta-secret";
    const output = redactJson({ token, nested: [`prefix-${token}`] }, token);
    expect(JSON.stringify(output)).not.toContain(token);
  });
});
