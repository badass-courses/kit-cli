import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type NextAction = {
  command: string;
  description: string;
  params?: Record<
    string,
    {
      description?: string;
      value?: string | number | boolean;
      default?: string | number | boolean;
      enum?: string[];
      required?: boolean;
    }
  >;
};

export type SuccessEnvelope = {
  ok: true;
  command: string;
  result: Record<string, unknown>;
  next_actions: NextAction[];
};

export type ErrorEnvelope = {
  ok: false;
  command: string;
  error: {
    message: string;
    code: string;
  };
  fix: string;
  next_actions: NextAction[];
};

export type Envelope = SuccessEnvelope | ErrorEnvelope;

export const printEnvelope = (envelope: Envelope) => {
  console.log(JSON.stringify(envelope, null, 2));
  if (!envelope.ok) {
    process.exitCode = 1;
  }
};

export const success = (
  command: string,
  result: Record<string, unknown>,
  nextActions: NextAction[],
): SuccessEnvelope => ({
  ok: true,
  command,
  result,
  next_actions: nextActions,
});

export const failure = (
  command: string,
  message: string,
  code: string,
  fix: string,
  nextActions: NextAction[],
): ErrorEnvelope => ({
  ok: false,
  command,
  error: {
    message,
    code,
  },
  fix,
  next_actions: nextActions,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const summarizeArray = async (entries: unknown[]) => {
  if (entries.length <= 20) {
    return {
      entries,
      truncated: false,
      total: entries.length,
    };
  }

  const directory = await mkdtemp(join(tmpdir(), "kit-cli-"));
  const fullOutput = join(directory, "response.json");
  await writeFile(fullOutput, JSON.stringify(entries, null, 2));

  return {
    entries: entries.slice(0, 20),
    truncated: true,
    total: entries.length,
    full_output: fullOutput,
  };
};

export const contextSafeResult = async (payload: unknown) => {
  if (Array.isArray(payload)) {
    return {
      data: await summarizeArray(payload),
    } satisfies Record<string, unknown>;
  }

  if (!isRecord(payload)) {
    return {
      data: payload,
    } satisfies Record<string, unknown>;
  }

  const result: Record<string, unknown> = { ...payload };

  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      result[key] = await summarizeArray(value);
    }
  }

  return result;
};
