export type AuthMode = "auto" | "api-key" | "oauth";

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

export const generatedAt = "2026-04-28T00:05:55.411Z";

export const operations = [
  {
    "id": "get__v4_account_colors",
    "method": "GET",
    "path": "/v4/account/colors",
    "summary": "List colors",
    "tag": "Accounts",
    "commandSegments": [
      "account",
      "colors",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/accounts/list-colors.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": []
  },
  {
    "id": "put__v4_account_colors",
    "method": "PUT",
    "path": "/v4/account/colors",
    "summary": "Update colors",
    "tag": "Accounts",
    "commandSegments": [
      "account",
      "colors",
      "update"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/accounts/update-colors.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_account_creator_profile",
    "method": "GET",
    "path": "/v4/account/creator_profile",
    "summary": "Get Creator Profile",
    "tag": "Accounts",
    "commandSegments": [
      "account",
      "creatorprofile",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/accounts/get-creator-profile.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": []
  },
  {
    "id": "get__v4_account_email_stats",
    "method": "GET",
    "path": "/v4/account/email_stats",
    "summary": "Get email stats",
    "tag": "Accounts",
    "commandSegments": [
      "account",
      "emailstats",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/accounts/get-email-stats.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": []
  },
  {
    "id": "get__v4_account",
    "method": "GET",
    "path": "/v4/account",
    "summary": "Get current account",
    "tag": "Accounts",
    "commandSegments": [
      "account",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/accounts/get-current-account.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": []
  },
  {
    "id": "get__v4_account_growth_stats",
    "method": "GET",
    "path": "/v4/account/growth_stats",
    "summary": "Get growth stats",
    "description": "Get growth stats for a specific time period. Defaults to last 90 days.<br/><br/>NOTE: We return your stats in your sending time zone. This endpoint does not return timestamps in UTC.",
    "tag": "Accounts",
    "commandSegments": [
      "account",
      "growthstats",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/accounts/get-growth-stats.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "ending",
        "cliName": "ending",
        "description": "Get stats for time period ending on this date (format yyyy-mm-dd). Defaults to today.",
        "required": false,
        "type": "string"
      },
      {
        "name": "starting",
        "cliName": "starting",
        "description": "Get stats for time period beginning on this date (format yyyy-mm-dd). Defaults to 90 days ago.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_broadcasts_broadcast_id_clicks",
    "method": "GET",
    "path": "/v4/broadcasts/{broadcast_id}/clicks",
    "summary": "Get link clicks for a broadcast",
    "description": "NOTE: Pagination parameters control the list of clicks for the top level broadcast.",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "clicks",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/get-link-clicks-for-a-broadcast.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "broadcast_id",
        "cliName": "broadcastid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "post__v4_broadcasts",
    "method": "POST",
    "path": "/v4/broadcasts",
    "summary": "Create a broadcast",
    "description": "Draft or schedule to send a broadcast to all or a subset of your subscribers.<br/><br/>To save a draft, set `send_at` to `null`.<br/><br/>To publish to the web, set `public` to `true`.<br/><br/>To schedule the broadcast for sending, provide a `send_at` timestamp. Scheduled broadcasts should contain a subject and your content, at a minimum.<br/><br/>We currently support targeting your subscribers based on segment or tag ids.<aside class='notice'>Starting point templates are not currently supported.</aside>",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/create-a-broadcast.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "delete__v4_broadcasts_id_",
    "method": "DELETE",
    "path": "/v4/broadcasts/{id}",
    "summary": "Delete a broadcast",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "delete"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/delete-a-broadcast.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "get__v4_broadcasts_id_",
    "method": "GET",
    "path": "/v4/broadcasts/{id}",
    "summary": "Get a broadcast",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/get-a-broadcast.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "get__v4_broadcasts",
    "method": "GET",
    "path": "/v4/broadcasts",
    "summary": "List broadcasts",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/list-broadcasts.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_broadcasts_stats",
    "method": "GET",
    "path": "/v4/broadcasts/stats",
    "summary": "Get stats for a list of broadcasts",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "stats",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-list-of-broadcasts.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": []
  },
  {
    "id": "get__v4_broadcasts_broadcast_id_stats",
    "method": "GET",
    "path": "/v4/broadcasts/{broadcast_id}/stats",
    "summary": "Get stats for a broadcast",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "stats",
      "getbybroadcast"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/get-stats-for-a-broadcast.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "broadcast_id",
        "cliName": "broadcastid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "put__v4_broadcasts_id_",
    "method": "PUT",
    "path": "/v4/broadcasts/{id}",
    "summary": "Update a broadcast",
    "description": "Update an existing broadcast. Continue to draft or schedule to send a broadcast to all or a subset of your subscribers.<br/><br/>To save a draft, set `public` to false.<br/><br/>To schedule the broadcast for sending, set `public` to true and provide `send_at`. Scheduled broadcasts should contain a subject and your content, at a minimum.<br/><br/>We currently support targeting your subscribers based on segment or tag ids.",
    "tag": "Broadcasts",
    "commandSegments": [
      "broadcasts",
      "update"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/broadcasts/update-a-broadcast.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_bulk_custom_fields",
    "method": "POST",
    "path": "/v4/bulk/custom_fields",
    "summary": "Bulk create custom fields",
    "description": "See \"[Bulk & async processing](#bulk-amp-async-processing)\" for more information.",
    "tag": "Custom Fields",
    "commandSegments": [
      "bulk",
      "customfields",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/custom-fields/bulk-create-custom-fields.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_bulk_custom_fields_subscribers",
    "method": "POST",
    "path": "/v4/bulk/custom_fields/subscribers",
    "summary": "Bulk update subscriber custom field values",
    "tag": "Custom Fields",
    "commandSegments": [
      "bulk",
      "customfields",
      "subscribers",
      "update"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/custom-fields/bulk-update-subscriber-custom-field-values.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_bulk_forms_subscribers",
    "method": "POST",
    "path": "/v4/bulk/forms/subscribers",
    "summary": "Bulk add subscribers to forms",
    "description": "Adding subscribers to double opt-in forms will trigger sending an Incentive Email. Subscribers already added to the specified form will not receive the Incentive Email again. For more information about double opt-in see \"[Double opt-in](#double-opt-in)\". <br/><br/>The subscribers being added to the form must already exist. Subscribers can be created in bulk using the \"[Bulk create subscriber](#bulk-create-subscribers)\" endpoint.<br/><br/>See \"[Bulk & async processing](#bulk-amp-async-processing)\" for more information.",
    "tag": "Forms",
    "commandSegments": [
      "bulk",
      "forms",
      "subscribers",
      "add"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/forms/bulk-add-subscribers-to-forms.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_bulk_subscribers",
    "method": "POST",
    "path": "/v4/bulk/subscribers",
    "summary": "Bulk create subscribers",
    "description": "See \"[Bulk & async processing](#bulk-amp-async-processing)\" for more information.",
    "tag": "Subscribers",
    "commandSegments": [
      "bulk",
      "subscribers",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/bulk-create-subscribers.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_bulk_tags",
    "method": "POST",
    "path": "/v4/bulk/tags",
    "summary": "Bulk create tags",
    "description": "See \"[Bulk & async processing](#bulk-amp-async-processing)\" for more information.",
    "tag": "Tags",
    "commandSegments": [
      "bulk",
      "tags",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/bulk-create-tags.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "delete__v4_bulk_tags_subscribers",
    "method": "DELETE",
    "path": "/v4/bulk/tags/subscribers",
    "summary": "Bulk remove tags from subscribers",
    "description": "See \"[Bulk & async processing](#bulk-amp-async-processing)\" for more information.",
    "tag": "Tags",
    "commandSegments": [
      "bulk",
      "tags",
      "subscribers",
      "remove"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/bulk-remove-tags-from-subscribers.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": []
  },
  {
    "id": "post__v4_bulk_tags_subscribers",
    "method": "POST",
    "path": "/v4/bulk/tags/subscribers",
    "summary": "Bulk tag subscribers",
    "description": "The subscribers being tagged must already exist. Subscribers can be created in bulk using the \"[Bulk create subscriber](#bulk-create-subscribers)\" endpoint.<br/><br/>See \"[Bulk & async processing](#bulk-amp-async-processing)\" for more information.",
    "tag": "Tags",
    "commandSegments": [
      "bulk",
      "tags",
      "subscribers",
      "tag"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/bulk-tag-subscribers.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_custom_fields",
    "method": "POST",
    "path": "/v4/custom_fields",
    "summary": "Create a custom field",
    "description": "Create a custom field for your account. The label field must be unique to your account. Whitespace will be removed from the beginning and the end of your label.<br/><br/>Additionally, a key field and a name field will be generated for you. The key is an ASCII-only, lowercased, underscored representation of your label. This key must be unique to your account. Keys are used in personalization tags in sequences and broadcasts. Names are unique identifiers for use in the HTML of custom forms. They are made up of a combination of ID and the key of the custom field prefixed with \"ck_field\".",
    "tag": "Custom Fields",
    "commandSegments": [
      "customfields",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/custom-fields/create-a-custom-field.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "delete__v4_custom_fields_id_",
    "method": "DELETE",
    "path": "/v4/custom_fields/{id}",
    "summary": "Delete custom field",
    "description": "This will remove all data in this field from your subscribers.",
    "tag": "Custom Fields",
    "commandSegments": [
      "customfields",
      "delete"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/custom-fields/delete-custom-field.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "get__v4_custom_fields",
    "method": "GET",
    "path": "/v4/custom_fields",
    "summary": "List custom fields",
    "description": "A custom field allows you to collect subscriber information beyond the standard fields of first name and email address. An example would be a custom field called last name so you can get the full names of your subscribers.<br/><br/>You create a custom field, and then you're able to use that in your forms or emails.",
    "tag": "Custom Fields",
    "commandSegments": [
      "customfields",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/custom-fields/list-custom-fields.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "put__v4_custom_fields_id_",
    "method": "PUT",
    "path": "/v4/custom_fields/{id}",
    "summary": "Update a custom field",
    "description": "Updates a custom field label (see [Create a custom field](#create-a-custom-field) above for more information on labels). Note that the key will change but the name remains the same when the label is updated.<br/><br/><strong>Warning: </strong>An update to a custom field will break all of the liquid personalization tags in emails that reference it - e.g. if you update a `Zip_Code` custom field to `Post_Code`, all liquid tags referencing `{{ subscriber.Zip_Code }}` would no longer work and need to be replaced with `{{ subscriber.Post_Code }}`.",
    "tag": "Custom Fields",
    "commandSegments": [
      "customfields",
      "update"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/custom-fields/update-a-custom-field.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_email_templates",
    "method": "GET",
    "path": "/v4/email_templates",
    "summary": "List email templates",
    "tag": "Email Templates",
    "commandSegments": [
      "emailtemplates",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/email-templates/list-email-templates.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_forms",
    "method": "GET",
    "path": "/v4/forms",
    "summary": "List forms",
    "tag": "Forms",
    "commandSegments": [
      "forms",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/forms/list-forms.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      },
      {
        "name": "status",
        "cliName": "status",
        "description": "Filter forms that have this status (`active`, `archived`, `trashed`, or `all`). Defaults to `active`.",
        "required": false,
        "type": "string",
        "enumValues": [
          "active",
          "archived",
          "trashed",
          "all"
        ]
      },
      {
        "name": "type",
        "cliName": "type",
        "description": "Filter forms and landing pages by type. Use `embed` for embedded forms. Use `hosted` for landing pages.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "post__v4_forms_form_id_subscribers",
    "method": "POST",
    "path": "/v4/forms/{form_id}/subscribers",
    "summary": "Add subscriber to form by email address",
    "description": "The subscriber being added to the form must already exist. Subscribers can be created using the \"[Create a subscriber](#create-a-subscriber)\" endpoint.",
    "tag": "Forms",
    "commandSegments": [
      "forms",
      "subscribers",
      "add"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "form_id",
        "cliName": "formid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_forms_form_id_subscribers_id_",
    "method": "POST",
    "path": "/v4/forms/{form_id}/subscribers/{id}",
    "summary": "Add subscriber to form",
    "description": "The subscriber being added to the form must already exist. Subscribers can be created using the \"[Create a subscriber](#create-a-subscriber)\" endpoint.",
    "tag": "Forms",
    "commandSegments": [
      "forms",
      "subscribers",
      "addbyid"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/forms/add-subscriber-to-form.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "form_id",
        "cliName": "formid",
        "required": true,
        "type": "integer"
      },
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_forms_form_id_subscribers",
    "method": "GET",
    "path": "/v4/forms/{form_id}/subscribers",
    "summary": "List subscribers for a form",
    "tag": "Forms",
    "commandSegments": [
      "forms",
      "subscribers",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/forms/list-subscribers-for-a-form.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "form_id",
        "cliName": "formid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [
      {
        "name": "added_after",
        "cliName": "addedAfter",
        "description": "Filter subscribers who have been added to the form after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "added_before",
        "cliName": "addedBefore",
        "description": "Filter subscribers who have been added to the form before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_after",
        "cliName": "createdAfter",
        "description": "Filter subscribers who have been created after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_before",
        "cliName": "createdBefore",
        "description": "Filter subscribers who have been created before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      },
      {
        "name": "status",
        "cliName": "status",
        "description": "Filter subscribers who have this status (`active`, `inactive`, `bounced`, `complained`, `cancelled` or `all`). Defaults to `active`.",
        "required": false,
        "type": "string",
        "enumValues": [
          "active",
          "inactive",
          "bounced",
          "complained",
          "cancelled",
          "all"
        ]
      }
    ]
  },
  {
    "id": "post__v4_purchases",
    "method": "POST",
    "path": "/v4/purchases",
    "summary": "Create a purchase",
    "tag": "Purchases",
    "commandSegments": [
      "purchases",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/purchases/create-a-purchase.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_purchases_id_",
    "method": "GET",
    "path": "/v4/purchases/{id}",
    "summary": "Get a purchase",
    "tag": "Purchases",
    "commandSegments": [
      "purchases",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/purchases/get-a-purchase.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "get__v4_purchases",
    "method": "GET",
    "path": "/v4/purchases",
    "summary": "List purchases",
    "tag": "Purchases",
    "commandSegments": [
      "purchases",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/purchases/list-purchases.md",
    "supportsApiKey": false,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_segments",
    "method": "GET",
    "path": "/v4/segments",
    "summary": "List segments",
    "tag": "Segments",
    "commandSegments": [
      "segments",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/segments/list-segments.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_sequences",
    "method": "GET",
    "path": "/v4/sequences",
    "summary": "List sequences",
    "tag": "Sequences",
    "commandSegments": [
      "sequences",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/sequences/list-sequences.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "post__v4_sequences_sequence_id_subscribers",
    "method": "POST",
    "path": "/v4/sequences/{sequence_id}/subscribers",
    "summary": "Add subscriber to sequence by email address",
    "description": "The subscriber being added to the sequence must already exist. Subscribers can be created using the \"[Create a subscriber](#create-a-subscriber)\" endpoint.",
    "tag": "Sequences",
    "commandSegments": [
      "sequences",
      "subscribers",
      "add"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence-by-email-address.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "sequence_id",
        "cliName": "sequenceid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_sequences_sequence_id_subscribers_id_",
    "method": "POST",
    "path": "/v4/sequences/{sequence_id}/subscribers/{id}",
    "summary": "Add subscriber to sequence",
    "description": "The subscriber being added to the sequence must already exist. Subscribers can be created using the \"[Create a subscriber](#create-a-subscriber)\" endpoint.",
    "tag": "Sequences",
    "commandSegments": [
      "sequences",
      "subscribers",
      "addbyid"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/sequences/add-subscriber-to-sequence.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "sequence_id",
        "cliName": "sequenceid",
        "required": true,
        "type": "integer"
      },
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_sequences_sequence_id_subscribers",
    "method": "GET",
    "path": "/v4/sequences/{sequence_id}/subscribers",
    "summary": "List subscribers for a sequence",
    "tag": "Sequences",
    "commandSegments": [
      "sequences",
      "subscribers",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/sequences/list-subscribers-for-a-sequence.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "sequence_id",
        "cliName": "sequenceid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [
      {
        "name": "added_after",
        "cliName": "addedAfter",
        "description": "Filter subscribers who have been added to the form after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "added_before",
        "cliName": "addedBefore",
        "description": "Filter subscribers who have been added to the form before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_after",
        "cliName": "createdAfter",
        "description": "Filter subscribers who have been created after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_before",
        "cliName": "createdBefore",
        "description": "Filter subscribers who have been created before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      },
      {
        "name": "status",
        "cliName": "status",
        "description": "Filter subscribers who have this status (`active`, `inactive`, `bounced`, `complained`, `cancelled` or `all`). Defaults to `active`.",
        "required": false,
        "type": "string",
        "enumValues": [
          "active",
          "inactive",
          "bounced",
          "complained",
          "cancelled",
          "all"
        ]
      }
    ]
  },
  {
    "id": "post__v4_subscribers",
    "method": "POST",
    "path": "/v4/subscribers",
    "summary": "Create a subscriber",
    "description": "Behaves as an upsert. If a subscriber with the provided email address does not exist, it creates one with the specified first name and state. If a subscriber with the provided email address already exists, it updates the first name.<br/><br/>We will ignore custom fields that don't already exist in your account. We will not return an error if you try to add data to a custom field that does not exist. Please use <a href=\"#create-a-custom-field\">Create a custom field</a> to create custom fields before setting for subscribers.<br/><br/><strong>NOTE:</strong> Updating the subscriber state with this endpoint is not supported at this time.<br/><strong>NOTE:</strong> We support creating/updating a maximum of 140 custom fields at a time.",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/create-a-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_subscribers_filter",
    "method": "POST",
    "path": "/v4/subscribers/filter",
    "summary": "Filter subscribers based on engagement",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "filter",
      "apply"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/filter-subscribers-based-on-engagement.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_subscribers_id_",
    "method": "GET",
    "path": "/v4/subscribers/{id}",
    "summary": "Get a subscriber",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "get"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/get-a-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "get__v4_subscribers",
    "method": "GET",
    "path": "/v4/subscribers",
    "summary": "List subscribers",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/list-subscribers.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_after",
        "cliName": "createdAfter",
        "description": "Filter subscribers who have been created after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_before",
        "cliName": "createdBefore",
        "description": "Filter subscribers who have been created before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "email_address",
        "cliName": "emailAddress",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "number"
      },
      {
        "name": "sort_field",
        "cliName": "sortField",
        "required": false,
        "type": "string"
      },
      {
        "name": "sort_order",
        "cliName": "sortOrder",
        "required": false,
        "type": "string",
        "enumValues": [
          "asc",
          "desc"
        ]
      },
      {
        "name": "status",
        "cliName": "status",
        "description": "Filter subscribers who have this status (`active`, `inactive`, `bounced`, `complained`, `cancelled` or `all`). Defaults to `active`.",
        "required": false,
        "type": "string",
        "enumValues": [
          "active",
          "inactive",
          "bounced",
          "complained",
          "cancelled",
          "all"
        ]
      },
      {
        "name": "updated_after",
        "cliName": "updatedAfter",
        "description": "Filter subscribers who have been updated after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "updated_before",
        "cliName": "updatedBefore",
        "description": "Filter subscribers who have been updated before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_subscribers_subscriber_id_stats",
    "method": "GET",
    "path": "/v4/subscribers/{subscriber_id}/stats",
    "summary": "List stats for a subscriber",
    "description": "Retrieve email stats for a specific subscriber. You can filter the stats by providing `email_sent_after` and/or `email_sent_before` query parameters to limit the stats to emails sent within a specific date range.\nNote: this functionality was added in June 2025, so no data for events before that date will be included.",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "stats",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/list-stats-for-a-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "subscriber_id",
        "cliName": "subscriberid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [
      {
        "name": "email_sent_after",
        "cliName": "emailSentAfter",
        "description": "Filter to stats for emails sent after this date (YYYY-MM-DD)/nNOTE: This functionality was added 2025-06-28 and will only include stats for emails sent before this date.",
        "required": false,
        "type": "string"
      },
      {
        "name": "email_sent_before",
        "cliName": "emailSentBefore",
        "description": "Filter to stats for emails sent before this date (YYYY-MM-DD)/nNote: this functionality was added in June 2025, so no data for events before that date will be included.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_subscribers_subscriber_id_tags",
    "method": "GET",
    "path": "/v4/subscribers/{subscriber_id}/tags",
    "summary": "List tags for a subscriber",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "tags",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/list-tags-for-a-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "subscriber_id",
        "cliName": "subscriberid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "post__v4_subscribers_id_unsubscribe",
    "method": "POST",
    "path": "/v4/subscribers/{id}/unsubscribe",
    "summary": "Unsubscribe subscriber",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "unsubscribe",
      "apply"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/unsubscribe-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "put__v4_subscribers_id_",
    "method": "PUT",
    "path": "/v4/subscribers/{id}",
    "summary": "Update a subscriber",
    "description": "We will ignore custom fields that don't already exist in your account. We will not return an error if you try to add data to a custom field that does not exist. Please use <a href=\"#create-a-custom-field\">Create a custom field</a> to create custom fields before setting for subscribers.<br/><br/><strong>NOTE: </strong>We support creating/updating a maximum of 140 custom fields at a time.",
    "tag": "Subscribers",
    "commandSegments": [
      "subscribers",
      "update"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/subscribers/update-a-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_tags",
    "method": "POST",
    "path": "/v4/tags",
    "summary": "Create a tag",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/create-a-tag.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "get__v4_tags",
    "method": "GET",
    "path": "/v4/tags",
    "summary": "List tags",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/list-tags.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "get__v4_tags_tag_id_subscribers",
    "method": "GET",
    "path": "/v4/tags/{tag_id}/subscribers",
    "summary": "List subscribers for a tag",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "subscribers",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/list-subscribers-for-a-tag.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "tag_id",
        "cliName": "tagid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_after",
        "cliName": "createdAfter",
        "description": "Filter subscribers who have been created after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "created_before",
        "cliName": "createdBefore",
        "description": "Filter subscribers who have been created before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      },
      {
        "name": "status",
        "cliName": "status",
        "description": "Filter subscribers who have this status (`active`, `inactive`, `bounced`, `complained`, `cancelled` or `all`). Defaults to `active`.",
        "required": false,
        "type": "string",
        "enumValues": [
          "active",
          "inactive",
          "bounced",
          "complained",
          "cancelled",
          "all"
        ]
      },
      {
        "name": "tagged_after",
        "cliName": "taggedAfter",
        "description": "Filter subscribers who have been tagged after this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      },
      {
        "name": "tagged_before",
        "cliName": "taggedBefore",
        "description": "Filter subscribers who have been tagged before this date (format yyyy-mm-dd)",
        "required": false,
        "type": "string"
      }
    ]
  },
  {
    "id": "delete__v4_tags_tag_id_subscribers",
    "method": "DELETE",
    "path": "/v4/tags/{tag_id}/subscribers",
    "summary": "Remove tag from subscriber by email address",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "subscribers",
      "remove"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/remove-tag-from-subscriber-by-email-address.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "tag_id",
        "cliName": "tagid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "delete__v4_tags_tag_id_subscribers_id_",
    "method": "DELETE",
    "path": "/v4/tags/{tag_id}/subscribers/{id}",
    "summary": "Remove tag from subscriber",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "subscribers",
      "removebyid"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/remove-tag-from-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "tag_id",
        "cliName": "tagid",
        "required": true,
        "type": "integer"
      },
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "post__v4_tags_tag_id_subscribers",
    "method": "POST",
    "path": "/v4/tags/{tag_id}/subscribers",
    "summary": "Tag a subscriber by email address",
    "description": "The subscriber being tagged must already exist. Subscribers can be created using the \"[Create a subscriber](#create-a-subscriber)\" endpoint.",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "subscribers",
      "tag"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/tag-a-subscriber-by-email-address.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "tag_id",
        "cliName": "tagid",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_tags_tag_id_subscribers_id_",
    "method": "POST",
    "path": "/v4/tags/{tag_id}/subscribers/{id}",
    "summary": "Tag a subscriber",
    "description": "The subscriber being tagged must already exist. Subscribers can be created using the \"[Create a subscriber](#create-a-subscriber)\" endpoint.",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "subscribers",
      "tagbyid"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/tag-a-subscriber.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "tag_id",
        "cliName": "tagid",
        "required": true,
        "type": "integer"
      },
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "put__v4_tags_id_",
    "method": "PUT",
    "path": "/v4/tags/{id}",
    "summary": "Update tag name",
    "tag": "Tags",
    "commandSegments": [
      "tags",
      "update"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/tags/update-tag-name.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "post__v4_webhooks",
    "method": "POST",
    "path": "/v4/webhooks",
    "summary": "Create a webhook",
    "description": "Available event types:<br/>- `subscriber.subscriber_activate`<br/>- `subscriber.subscriber_unsubscribe`<br/>- `subscriber.subscriber_bounce`<br/>- `subscriber.subscriber_complain`<br/>- `subscriber.form_subscribe`, required parameter `form_id` [Integer]<br/>- `subscriber.course_subscribe`, required parameter `sequence_id` [Integer]<br/>- `subscriber.course_complete`, required parameter `sequence_id` [Integer]<br/>- `subscriber.link_click`, required parameter `initiator_value` [String] as a link URL<br/>- `subscriber.product_purchase`, required parameter `product_id` [Integer]<br/>- `subscriber.tag_add`, required parameter `tag_id` [Integer]<br/>- `subscriber.tag_remove`, required parameter `tag_id` [Integer]<br/>- `purchase.purchase_create`<br/>- `custom_field.field_created`<br/>- `custom_field.field_deleted`<br/>- `custom_field.field_value_updated`, required parameter `custom_field_id` [Integer]",
    "tag": "Webhooks",
    "commandSegments": [
      "webhooks",
      "create"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/webhooks/create-a-webhook.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [],
    "requestBody": {
      "required": false,
      "contentTypes": [
        "application/json"
      ]
    }
  },
  {
    "id": "delete__v4_webhooks_id_",
    "method": "DELETE",
    "path": "/v4/webhooks/{id}",
    "summary": "Delete a webhook",
    "tag": "Webhooks",
    "commandSegments": [
      "webhooks",
      "delete"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/webhooks/delete-a-webhook.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [
      {
        "name": "id",
        "cliName": "id",
        "required": true,
        "type": "integer"
      }
    ],
    "queryParams": []
  },
  {
    "id": "get__v4_webhooks",
    "method": "GET",
    "path": "/v4/webhooks",
    "summary": "List webhooks",
    "description": "Webhooks are automations that will receive subscriber data when a subscriber event is triggered, such as when a subscriber completes a sequence.<br/><br/>When a webhook is triggered, a `POST` request will be made to your URL with a JSON payload.",
    "tag": "Webhooks",
    "commandSegments": [
      "webhooks",
      "list"
    ],
    "docsUrl": "https://developers.kit.com/api-reference/webhooks/list-webhooks.md",
    "supportsApiKey": true,
    "supportsOAuth": true,
    "pathParams": [],
    "queryParams": [
      {
        "name": "after",
        "cliName": "after",
        "description": "To fetch next page of results, use `?after=<end_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "before",
        "cliName": "before",
        "description": "To fetch previous page of results, use `?before=<start_cursor>`",
        "required": false,
        "type": "string"
      },
      {
        "name": "include_total_count",
        "cliName": "includeTotalCount",
        "description": "To include the total count of records in the response, use `true`. For large collections, expect a slightly slower response.",
        "required": false,
        "type": "boolean"
      },
      {
        "name": "per_page",
        "cliName": "perPage",
        "description": "Number of results per page. Default 500, maximum 1000.",
        "required": false,
        "type": "string"
      }
    ]
  }
] as const satisfies readonly GeneratedOperation[];
