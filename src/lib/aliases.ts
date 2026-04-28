import type { GeneratedOperation } from "../generated/operations";

export type CuratedAlias = {
  commandSegments: string[];
  targetOperationId: GeneratedOperation["id"];
  description: string;
};

export const curatedAliases: CuratedAlias[] = [
  {
    commandSegments: ["whoami"],
    targetOperationId: "get__v4_account",
    description: "Shortcut for the current Kit account",
  },
  {
    commandSegments: ["subs", "list"],
    targetOperationId: "get__v4_subscribers",
    description: "Shortcut for listing subscribers",
  },
  {
    commandSegments: ["subs", "get"],
    targetOperationId: "get__v4_subscribers_id_",
    description: "Shortcut for fetching a subscriber by ID",
  },
  {
    commandSegments: ["subs", "create"],
    targetOperationId: "post__v4_subscribers",
    description: "Shortcut for creating or upserting a subscriber",
  },
  {
    commandSegments: ["subs", "update"],
    targetOperationId: "put__v4_subscribers_id_",
    description: "Shortcut for updating a subscriber",
  },
  {
    commandSegments: ["subs", "tags"],
    targetOperationId: "get__v4_subscribers_subscriber_id_tags",
    description: "Shortcut for listing tags on a subscriber",
  },
  {
    commandSegments: ["subs", "stats"],
    targetOperationId: "get__v4_subscribers_subscriber_id_stats",
    description: "Shortcut for subscriber email stats",
  },
  {
    commandSegments: ["subs", "filter"],
    targetOperationId: "post__v4_subscribers_filter",
    description: "Shortcut for subscriber engagement filtering",
  },
  {
    commandSegments: ["subs", "unsubscribe"],
    targetOperationId: "post__v4_subscribers_id_unsubscribe",
    description: "Shortcut for unsubscribing a subscriber",
  },
  {
    commandSegments: ["bcasts", "list"],
    targetOperationId: "get__v4_broadcasts",
    description: "Shortcut for listing broadcasts",
  },
  {
    commandSegments: ["bcasts", "get"],
    targetOperationId: "get__v4_broadcasts_id_",
    description: "Shortcut for fetching a broadcast",
  },
  {
    commandSegments: ["bcasts", "create"],
    targetOperationId: "post__v4_broadcasts",
    description: "Shortcut for creating a broadcast",
  },
  {
    commandSegments: ["bcasts", "update"],
    targetOperationId: "put__v4_broadcasts_id_",
    description: "Shortcut for updating a broadcast",
  },
  {
    commandSegments: ["bcasts", "delete"],
    targetOperationId: "delete__v4_broadcasts_id_",
    description: "Shortcut for deleting a broadcast",
  },
  {
    commandSegments: ["forms", "ls"],
    targetOperationId: "get__v4_forms",
    description: "Shortcut for listing forms",
  },
  {
    commandSegments: ["tags", "ls"],
    targetOperationId: "get__v4_tags",
    description: "Shortcut for listing tags",
  },
  {
    commandSegments: ["segments", "ls"],
    targetOperationId: "get__v4_segments",
    description: "Shortcut for listing segments",
  },
  {
    commandSegments: ["sequences", "ls"],
    targetOperationId: "get__v4_sequences",
    description: "Shortcut for listing sequences",
  },
];
