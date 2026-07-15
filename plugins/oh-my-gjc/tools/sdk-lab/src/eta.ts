import { resolve } from "node:path";
import { SdkClient, SdkClientError } from "@gajae-code/bridge-client";
import {
  InspectionError,
  assertHello,
  assertSessionMetadata,
  loadDiscovery,
  queryComplete,
  redactJson,
  redactToken,
} from "./inspect";

type JsonObject = Record<string, unknown>;
type Workflow = "ralplan" | "ultragoal";
type Confidence = "low" | "medium";
type CountMap = Record<"pending" | "in_progress" | "completed" | "abandoned", number | null>;
type JobCountMap = Record<"running" | "queued" | "paused" | "completed" | "failed" | "cancelled", number | null>;

const MAX_OUTPUT_STRING = 512;
const MAX_ESTIMATE_MINUTES = 960;
const TODO_STATUSES = ["pending", "in_progress", "completed", "abandoned"] as const;
const JOB_ITEM_STATUSES = ["running", "paused", "completed", "failed", "cancelled"] as const;
const SESSION_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export type EtaSnapshot = {
  session: { id: string; name: string | null };
  observedAt: string;
  workflow: Workflow;
  goal: { status: string | null; elapsedSeconds: number | null };
  todos: CountMap;
  runtimeJobs: JobCountMap;
  gates: { pending: number | null; quarantined: number | null };
  estimate: { likelyMinutes: number | null; conservativeMinutes: number | null; confidence: Confidence; basis: string };
};

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : null;
}

function pageItems(value: unknown): unknown[] | null {
  const page = asObject(asObject(value)?.page);
  return Array.isArray(page?.items) ? page.items : null;
}

function firstItem(value: unknown): JsonObject | null {
  const items = pageItems(value);
  return items && items.length === 1 ? asObject(items[0]) : null;
}

function boundedText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.slice(0, MAX_OUTPUT_STRING) : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function nonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}


function todoItems(value: unknown): unknown[] | null {
  const items = pageItems(value);
  if (!items) return null;
  if (items.length === 0) return [];
  if (items.every((item) => Array.isArray(asObject(item)?.tasks))) {
    return items.flatMap((item) => asObject(item)!.tasks as unknown[]);
  }
  return items;
}


function countStatuses<T extends readonly string[]>(items: unknown[] | null, statuses: T): Record<T[number], number | null> {
  const result = Object.fromEntries(statuses.map((status) => [status, null])) as Record<T[number], number | null>;
  if (!items || !items.every((item) => asObject(item))) return result;
  for (const status of statuses) result[status] = 0;
  for (const item of items) {
    const value = asObject(item)!;
    const status = boundedText(value.status ?? value.state)?.toLowerCase();
    if (!status || !Object.hasOwn(result, status)) {
      return Object.fromEntries(statuses.map((knownStatus) => [knownStatus, null])) as Record<T[number], number | null>;
    }
    result[status as T[number]] = (result[status as T[number]] ?? 0) + 1;
  }
  return result;
}
function runtimeJobCounts(value: unknown): JobCountMap {
  const unknown = Object.fromEntries(
    ["running", "queued", "paused", "completed", "failed", "cancelled"].map((status) => [status, null]),
  ) as JobCountMap;
  const root = firstItem(value);
  const delivery = asObject(root?.delivery);
  if (
    !root
    || !Array.isArray(root.running)
    || !Array.isArray(root.recent)
    || !delivery
    || nonNegativeInteger(delivery.queued) === null
    || typeof delivery.delivering !== "boolean"
    || !Array.isArray(delivery.pendingJobIds)
    || !delivery.pendingJobIds.every((id) => typeof id === "string" && id.length > 0)
    || nonNegativeInteger(delivery.deadLettered) === null
    || (delivery.nextRetryAt !== undefined && nonNegativeNumber(delivery.nextRetryAt) === null)
    || delivery.pendingJobIds.length !== delivery.queued
    || (delivery.delivering === true && delivery.queued === 0)
  ) return unknown;
  if (
    !root.running.every((item) => asObject(item)?.status === "running")
    || !root.recent.every((item) => {
      const status = asObject(item)?.status;
      return typeof status === "string" && status !== "running" && JOB_ITEM_STATUSES.includes(status as typeof JOB_ITEM_STATUSES[number]);
    })
    || delivery.deadLettered !== 0
  ) return unknown;
  const itemCounts = countStatuses([...root.running, ...root.recent], JOB_ITEM_STATUSES);
  return {
    running: itemCounts.running,
    queued: delivery.queued as number,
    paused: itemCounts.paused,
    completed: itemCounts.completed,
    failed: itemCounts.failed,
    cancelled: itemCounts.cancelled,
  };
}



function gateCounts(value: unknown): { pending: number | null; quarantined: number | null } {
  const items = pageItems(value);
  if (!items || !items.every((item) => asObject(item))) return { pending: null, quarantined: null };
  let pending = 0;
  let quarantined = 0;
  for (const item of items) {
    const object = asObject(item)!;
    const marker = boundedText(object.tag)?.toLowerCase();
    const lifecycle = asObject(object.lifecycle);
    if (marker === "pending" && lifecycle === null) pending += 1;
    else if (marker === "quarantined" && lifecycle?.state === "quarantined") quarantined += 1;
    else return { pending: null, quarantined: null };
  }
  return { pending, quarantined };
}

function goalSummary(goalGet: unknown, nowMs: number): EtaSnapshot["goal"] {
  const root = firstItem(goalGet);
  const goal = asObject(root?.goal);
  if (root?.enabled !== true || root.mode !== "active" || !goal || goal.status !== "active") {
    return { status: boundedText(goal?.status)?.toLowerCase() ?? null, elapsedSeconds: null };
  }
  const explicitElapsed = nonNegativeNumber(goal.timeUsedSeconds ?? goal.elapsedSeconds);
  if (explicitElapsed !== null) return { status: "active", elapsedSeconds: Math.floor(explicitElapsed) };
  const startedAt = nonNegativeNumber(goal.createdAt ?? goal.startedAt ?? goal.startedAtMs);
  const elapsedSeconds = startedAt !== null && nowMs >= startedAt
    ? Math.floor((nowMs - startedAt) / 1_000)
    : null;
  return { status: "active", elapsedSeconds };
}

function nullEstimate(basis: string): EtaSnapshot["estimate"] {
  return { likelyMinutes: null, conservativeMinutes: null, confidence: "low", basis };
}

function estimate(snapshot: Omit<EtaSnapshot, "estimate">): EtaSnapshot["estimate"] {
  if (snapshot.goal.status !== "active") return nullEstimate("Insufficient evidence: the goal is not an enabled active goal.");
  if (snapshot.gates.pending === null || snapshot.gates.pending > 0) return nullEstimate("Insufficient evidence: a pending human workflow gate exists or gate evidence is unavailable.");
  if (snapshot.gates.quarantined === null || snapshot.gates.quarantined > 0) return nullEstimate("Insufficient evidence: quarantined gate state exists or is unavailable.");
  if (snapshot.runtimeJobs.failed === null || snapshot.runtimeJobs.failed > 0) return nullEstimate("Insufficient evidence: failed runtime jobs exist or job evidence is unavailable.");
  if (snapshot.runtimeJobs.paused === null || snapshot.runtimeJobs.paused > 0) return nullEstimate("Insufficient evidence: paused runtime jobs exist or job evidence is unavailable.");
  if (snapshot.runtimeJobs.queued === null || snapshot.runtimeJobs.queued > 0) return nullEstimate("Insufficient evidence: undelivered runtime job results exist or delivery evidence is unavailable.");
  const todoValues = TODO_STATUSES.map((status) => snapshot.todos[status]);
  const jobValues = Object.values(snapshot.runtimeJobs);
  if (todoValues.some((value) => value === null) || jobValues.some((value) => value === null)) {
    return nullEstimate("Insufficient evidence: required todo or job state is unknown.");
  }

  const remainingUnits = snapshot.todos.pending! + snapshot.todos.in_progress!;
  const completedUnits = snapshot.todos.completed!;
  if (remainingUnits === 0) return nullEstimate("Insufficient evidence: no remaining todo unit was observed.");
  if (completedUnits === 0 || snapshot.goal.elapsedSeconds === null || snapshot.goal.elapsedSeconds <= 0) {
    return nullEstimate("Insufficient evidence: no observed elapsed-per-completed-unit rate is available.");
  }
  const minutesPerUnit = snapshot.goal.elapsedSeconds / 60 / completedUnits;
  const liveCriticalPath = snapshot.runtimeJobs.running! > 0 ? minutesPerUnit : 0;
  const likelyMinutes = Math.min(MAX_ESTIMATE_MINUTES, Math.max(1, Math.ceil(remainingUnits * minutesPerUnit + liveCriticalPath)));
  const conservativeMinutes = Math.min(
    MAX_ESTIMATE_MINUTES,
    Math.max(likelyMinutes, Math.ceil(likelyMinutes * 1.75)),
  );
  const confidence: Confidence = completedUnits >= 3 ? "medium" : "low";
  return {
    likelyMinutes,
    conservativeMinutes,
    confidence,
    basis: "Non-probabilistic heuristic band extrapolated from this goal's observed elapsed seconds per completed todo; parallel running jobs contribute one critical-path unit, not a summed duration.",
  };
}

export function summarizeEta(
  metadata: unknown,
  goalGet: unknown,
  todos: unknown,
  gates: unknown,
  runtimeJobs: unknown,
  fallbackSessionId: string,
  workflow: Workflow,
  nowMs = Date.now(),
): EtaSnapshot {
  const metadataItem = firstItem(metadata);
  const snapshot: Omit<EtaSnapshot, "estimate"> = {
    session: {
      id: boundedText(metadataItem?.sessionId ?? metadataItem?.id) ?? fallbackSessionId,
      name: boundedText(metadataItem?.name ?? metadataItem?.title ?? metadataItem?.identity),
    },
    observedAt: new Date(nowMs).toISOString(),
    workflow,
    goal: goalSummary(goalGet, nowMs),
    todos: countStatuses(todoItems(todos), TODO_STATUSES),
    runtimeJobs: runtimeJobCounts(runtimeJobs),
    gates: gateCounts(gates),
  };
  return { ...snapshot, estimate: estimate(snapshot) };
}
async function optionalSnapshot(
  client: SdkClient,
  query: "goal.list/get" | "runtime.jobs.list",
  unavailableItems: unknown[],
): Promise<unknown> {
  try {
    return await queryComplete(client, query);
  } catch (error) {
    if (error instanceof SdkClientError && error.code === "resource_gone") {
      return { type: "query_response", ok: true, page: { items: unavailableItems, complete: true, revision: "absent" } };
    }
    throw error;
  }
}
async function requiredSnapshot(client: SdkClient, query: Parameters<typeof queryComplete>[1]): Promise<unknown> {
  try {
    return await queryComplete(client, query);
  } catch (error) {
    const message = error instanceof Error ? error.message : "query failed";
    throw new InspectionError(`SDK ETA query ${query} failed: ${message}`);
  }
}



async function etaPath(discoveryPath: string, workflow: Workflow, expectedSessionId: string): Promise<EtaSnapshot> {
  const discovery = await loadDiscovery(discoveryPath);
  if (discovery.sessionId !== expectedSessionId) {
    throw new InspectionError("SDK discovery does not belong to the selected workflow session.");
  }
  let client: SdkClient | undefined;
  let unsubscribe: (() => void) | void;
  let hello: unknown;
  try {
    client = new SdkClient(discovery.url, discovery.token, { reconnectAttempts: 0, timeoutMs: 5_000 });
    unsubscribe = client.onFrame((frame) => {
      if (!hello && asObject(frame)?.type === "hello") hello = frame;
    });
    await client.connect();
    assertHello(hello);
    const metadata = await requiredSnapshot(client, "session.metadata");
    const goalGet = await optionalSnapshot(client, "goal.list/get", []);
    const todos = await requiredSnapshot(client, "todo.list");
    const gates = await requiredSnapshot(client, "workflow.gates.list");
    const runtimeJobs = await optionalSnapshot(client, "runtime.jobs.list", [{ unavailable: true }]);
    assertSessionMetadata(metadata, discovery.sessionId);
    return redactJson(
      summarizeEta(metadata, goalGet, todos, gates, runtimeJobs, discovery.sessionId, workflow),
      discovery.token,
    ) as EtaSnapshot;
  } catch (error) {
    throw new InspectionError(redactToken(error instanceof Error ? error.message : "SDK ETA inspection failed.", discovery.token));
  } finally {
    try {
      if (typeof unsubscribe === "function") unsubscribe();
      await client?.close();
    } catch {
      // A failed close must not hide a completed read-only snapshot.
    }
  }
}

export async function eta(
  workflow: Workflow,
  sessionId: string,
  endpoint?: string,
  cwd = process.cwd(),
): Promise<EtaSnapshot> {
  if (!SESSION_ID_RE.test(sessionId)) throw new InspectionError("A valid exact workflow session ID is required.");
  if (process.env.GJC_SESSION_ID?.trim() && process.env.GJC_SESSION_ID.trim() !== sessionId) {
    throw new InspectionError("Selected workflow session does not match the current GJC session.");
  }
  const discoveryPath = endpoint
    ? resolve(cwd, endpoint)
    : resolve(cwd, ".gjc", "state", "sdk", `${sessionId}.json`);
  return await etaPath(discoveryPath, workflow, sessionId);
}

function argumentsFrom(args: string[]): { workflow: Workflow; sessionId: string; endpoint?: string } {
  let workflow: Workflow | undefined;
  let sessionId: string | undefined;
  let endpoint: string | undefined;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!value) throw new InspectionError("Usage: bun run eta --workflow <ralplan|ultragoal> --session-id <id> [--endpoint <discovery.json>].");
    if (flag === "--workflow" && (value === "ralplan" || value === "ultragoal")) workflow = value;
    else if (flag === "--session-id" && SESSION_ID_RE.test(value)) sessionId = value;
    else if (flag === "--endpoint") endpoint = value;
    else throw new InspectionError("Usage: bun run eta --workflow <ralplan|ultragoal> --session-id <id> [--endpoint <discovery.json>].");
  }
  if (!workflow || !sessionId) throw new InspectionError("Usage: bun run eta --workflow <ralplan|ultragoal> --session-id <id> [--endpoint <discovery.json>].");
  return { workflow, sessionId, endpoint };
}

if (import.meta.main) {
  try {
    const args = argumentsFrom(Bun.argv.slice(2));
    console.log(JSON.stringify(await eta(args.workflow, args.sessionId, args.endpoint)));
  } catch (error) {
    console.error(redactToken(error instanceof Error ? error.message : "SDK ETA inspection failed."));
    process.exitCode = 1;
  }
}
