import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type OpenApi = {
  paths: Record<string, Record<string, OperationObject>>;
};

type OperationObject = {
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  security?: Array<Record<string, string[]>>;
};

type ParameterObject = {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema?: {
    type?: string;
    enum?: string[];
  };
};

type RequestBodyObject = {
  required?: boolean;
  content?: Record<string, unknown>;
};

type GeneratedOperation = {
  id: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  tag: string;
  commandSegments: string[];
  docsUrl: string;
  supportsApiKey: boolean;
  supportsOAuth: boolean;
  pathParams: Array<{
    name: string;
    cliName: string;
    description?: string;
    required: boolean;
    type: string;
    enumValues?: string[];
  }>;
  queryParams: Array<{
    name: string;
    cliName: string;
    description?: string;
    required: boolean;
    type: string;
    enumValues?: string[];
  }>;
  requestBody?: {
    required: boolean;
    contentTypes: string[];
  };
};

const projectRoot = resolve(import.meta.dir, "..");
const specPath = resolve(projectRoot, "openapi/kit-v4.json");
const docsIndexPath = resolve(projectRoot, "openapi/llms.txt");
const outputPath = resolve(projectRoot, "src/generated/operations.ts");

const spec = JSON.parse(await readFile(specPath, "utf8")) as OpenApi;
const docsIndex = await readFile(docsIndexPath, "utf8");

const docsByTitle = new Map<string, string>();
for (const match of docsIndex.matchAll(/- \[(.*?)\]\((.*?)\)/g)) {
  const [, title, url] = match;
  if (title && url) {
    docsByTitle.set(title.trim(), url.trim());
  }
}

const splitIdentifier = (value: string) => value.match(/[a-zA-Z0-9]+/g) ?? [];

const toCamelCase = (value: string) => {
  const tokens = splitIdentifier(value);
  if (tokens.length === 0) {
    return undefined;
  }

  return tokens
    .map((token, index) => {
      const lower = token.toLowerCase();
      return index === 0
        ? lower
        : `${lower[0]?.toUpperCase() ?? ""}${lower.slice(1)}`;
    })
    .join("");
};

const normalizeSegment = (value: string) =>
  splitIdentifier(value).join("").toLowerCase();

const extractPathParamNames = (path: string) =>
  [...path.matchAll(/\{([^}]+)\}/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value));

const actionFromSummary = (summary: string) => {
  const normalized = summary.toLowerCase();

  if (normalized.startsWith("bulk create ")) {
    return "create";
  }
  if (normalized.startsWith("bulk update ")) {
    return "update";
  }
  if (normalized.startsWith("bulk add ")) {
    return "add";
  }
  if (normalized.startsWith("bulk remove ")) {
    return "remove";
  }
  if (normalized.startsWith("bulk tag ")) {
    return "tag";
  }
  if (normalized.startsWith("bulk ")) {
    return "bulk";
  }
  if (normalized.startsWith("get ")) {
    return "get";
  }
  if (normalized.startsWith("list ")) {
    return "list";
  }
  if (normalized.startsWith("create ")) {
    return "create";
  }
  if (normalized.startsWith("update ")) {
    return "update";
  }
  if (normalized.startsWith("delete ")) {
    return "delete";
  }
  if (normalized.startsWith("add ")) {
    return "add";
  }
  if (normalized.startsWith("remove ")) {
    return "remove";
  }
  if (normalized.startsWith("tag ")) {
    return "tag";
  }
  if (normalized.startsWith("unsubscribe ")) {
    return "apply";
  }
  if (normalized.startsWith("filter ")) {
    return "apply";
  }

  return "run";
};

const qualifyAction = (
  action: string,
  operation: {
    summary: string;
    path: string;
    pathParamNames: string[];
    queryParams: ParameterObject[];
  },
  seenCount: number
) => {
  if (seenCount === 0) {
    return action;
  }

  const normalizedSummary = operation.summary.toLowerCase();

  if (normalizedSummary.includes("by email address")) {
    return `${action}byemail`;
  }

  if (operation.pathParamNames.length > 1 || operation.path.endsWith("/{id}")) {
    return `${action}byid`;
  }

  const [firstPathParamName] = operation.pathParamNames;
  if (firstPathParamName && operation.pathParamNames.length === 1) {
    const qualifier = normalizeSegment(
      firstPathParamName.replace(/_?id$/i, "")
    );
    if (qualifier && qualifier !== "id") {
      return `${action}by${qualifier}`;
    }
  }

  if (normalizedSummary.includes("stats")) {
    return `${action}stats`;
  }

  if (normalizedSummary.includes("click")) {
    return `${action}clicks`;
  }

  if (operation.queryParams.some((parameter) => parameter.name === "status")) {
    return `${action}filtered`;
  }

  return `${action}${seenCount + 1}`;
};

const generatedOperations: GeneratedOperation[] = [];
const seenCommandKeys = new Map<string, number>();

for (const [path, methods] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(methods)) {
    const summary = operation.summary?.trim();
    if (!summary) {
      continue;
    }

    const rawSegments = path.split("/").filter(Boolean).slice(1);
    const staticSegments = rawSegments
      .filter((segment) => !segment.startsWith("{"))
      .map(normalizeSegment)
      .filter(Boolean);

    const groupSegments = staticSegments.length > 0 ? staticSegments : ["api"];
    const pathParamNames = extractPathParamNames(path);
    const parameters = operation.parameters ?? [];
    const pathParams = pathParamNames.map((pathParamName) => {
      const parameter = parameters.find(
        (candidate) =>
          candidate.in === "path" && candidate.name === pathParamName
      );

      return {
        name: pathParamName,
        cliName: normalizeSegment(pathParamName),
        description: parameter?.description,
        required: true,
        type: parameter?.schema?.type ?? "string",
        enumValues: parameter?.schema?.enum,
      };
    });

    const queryParams = parameters
      .filter((parameter) => parameter.in === "query")
      .flatMap((parameter) => {
        const cliName = toCamelCase(parameter.name);
        if (!cliName) {
          return [];
        }

        return [
          {
            name: parameter.name,
            cliName,
            description: parameter.description,
            required: parameter.required ?? false,
            type: parameter.schema?.type ?? "string",
            enumValues: parameter.schema?.enum,
          },
        ];
      });

    const baseAction = actionFromSummary(summary);
    const actionKey = [...groupSegments, baseAction].join(".");
    const seenCount = seenCommandKeys.get(actionKey) ?? 0;
    const action = qualifyAction(
      baseAction,
      {
        summary,
        path,
        pathParamNames,
        queryParams: parameters.filter((parameter) => parameter.in === "query"),
      },
      seenCount
    );
    seenCommandKeys.set(actionKey, seenCount + 1);

    const securityNames = (operation.security ?? []).flatMap((entry) =>
      Object.keys(entry)
    );
    const supportsApiKey = securityNames.includes("API Key");
    const supportsOAuth = securityNames.includes("OAuth2");

    generatedOperations.push({
      id: `${method.toLowerCase()}_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`,
      method: method.toUpperCase(),
      path,
      summary,
      description: operation.description?.trim() || undefined,
      tag: operation.tags?.[0] ?? "General",
      commandSegments: [...groupSegments, action],
      docsUrl:
        docsByTitle.get(summary) ??
        "https://developers.kit.com/api-reference/v4.json",
      supportsApiKey,
      supportsOAuth,
      pathParams,
      queryParams,
      requestBody: operation.requestBody
        ? {
            required: operation.requestBody.required ?? false,
            contentTypes: Object.keys(operation.requestBody.content ?? {}),
          }
        : undefined,
    });
  }
}

generatedOperations.sort((left, right) => {
  const commandCompare = left.commandSegments
    .join(" ")
    .localeCompare(right.commandSegments.join(" "));
  if (commandCompare !== 0) {
    return commandCompare;
  }

  return left.method.localeCompare(right.method);
});

const fileContents = `export type AuthMode = "auto" | "api-key" | "oauth";

export type GeneratedParam = {
  name: string;
  cliName: string;
  description?: string;
  required: boolean;
  type: string;
  enumValues?: string[];
};

export type GeneratedOperation = {
  id: string;
  method: string;
  path: string;
  summary: string;
  description?: string;
  tag: string;
  commandSegments: string[];
  docsUrl: string;
  supportsApiKey: boolean;
  supportsOAuth: boolean;
  pathParams: GeneratedParam[];
  queryParams: GeneratedParam[];
  requestBody?: {
    required: boolean;
    contentTypes: string[];
  };
};

export const generatedAt = ${JSON.stringify(new Date().toISOString())};

export const operations = ${JSON.stringify(generatedOperations, null, 2)} as const satisfies readonly GeneratedOperation[];
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, fileContents);

console.log(
  `Generated ${generatedOperations.length} operations → ${outputPath}`
);
