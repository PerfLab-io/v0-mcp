export type APIKeyOptions = {
  apiKey?: string;
};

class SessionApiKeyStore {
  private static instance: SessionApiKeyStore;
  private sessionKeys = new Map<string, string>();
  private currentSessionId: string | null = null;

  static getInstance(): SessionApiKeyStore {
    if (!SessionApiKeyStore.instance) {
      SessionApiKeyStore.instance = new SessionApiKeyStore();
    }
    return SessionApiKeyStore.instance;
  }

  setSessionApiKey(sessionId: string, apiKey: string): void {
    this.sessionKeys.set(sessionId, apiKey);
  }

  getSessionApiKey(sessionId: string): string | undefined {
    return this.sessionKeys.get(sessionId);
  }

  setCurrentSession(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  getCurrentSessionApiKey(): string | undefined {
    if (!this.currentSessionId) return undefined;
    return this.sessionKeys.get(this.currentSessionId);
  }

  getCurrentSessionId(): string | undefined {
    return this.currentSessionId || undefined;
  }

  clearSession(sessionId: string): void {
    this.sessionKeys.delete(sessionId);
    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }
}

export const sessionApiKeyStore = SessionApiKeyStore.getInstance();

export type ChatDetail = {
  id: string;
  object: "chat";
  url: string;
  demo?: string;
  shareable: boolean;
  privacy?: "public" | "private" | "team" | "team-edit" | "unlisted";
  title?: string;
  updatedAt?: string;
  favorite: boolean;
  authorId: string;
  latestVersion?: {
    id: string;
    status: "pending" | "completed" | "failed";
  };
  messages: {
    id: string;
    object: "message";
    content: string;
    createdAt: string;
    type:
      | "message"
      | "refinement"
      | "forked-block"
      | "forked-chat"
      | "open-in-v0"
      | "added-environment-variables"
      | "added-integration"
      | "deleted-file"
      | "moved-file"
      | "renamed-file"
      | "edited-file"
      | "replace-src"
      | "reverted-block"
      | "fix-with-v0"
      | "sync-git";
  }[];
};

export type ChatSummary = {
  id: string;
  object: "chat";
  shareable: boolean;
  privacy: string;
  title?: string;
  updatedAt: string;
  favorite: boolean;
  authorId: string;
  latestVersion?: {
    id: string;
    status: "pending" | "completed" | "failed";
  };
};

export type MessageDetail = {
  id: string;
  object: "message";
  chatId: string;
  url: string;
  files?: {
    lang: string;
    meta: Record<string, any>;
    source: string;
  }[];
  demo?: string;
  text: string;
  modelConfiguration: {
    modelId: "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg";
    imageGenerations?: boolean;
    thinking?: boolean;
  };
};

export interface ProjectDetail {
  id: string;
  object: "project";
  name: string;
  vercelProjectId?: string;
}

export interface ScopeSummary {
  id: string;
  object: "scope";
  name?: string;
}

export interface UserDetail {
  id: string;
  object: "user";
  name?: string;
  email: string;
  avatar: string;
}

export interface VercelProjectDetail {
  id: string;
  object: "vercel_project";
  name: string;
}

export interface ChatsCreateRequest {
  message: string;
  attachments?: {
    url: string;
  }[];
  system?: string;
  chatPrivacy?: "public" | "private" | "team-edit" | "team" | "unlisted";
  projectId?: string;
  modelConfiguration?: {
    modelId: "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg";
    imageGenerations?: boolean;
    thinking?: boolean;
  };
}

export type ChatsCreateResponse = {
  id: string;
  object: "chat";
  url: string;
  files?: {
    lang: string;
    meta: Record<string, any>;
    source: string;
  }[];
  demo?: string;
  text: string;
  modelConfiguration: {
    modelId: "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg";
    imageGenerations?: boolean;
    thinking?: boolean;
  };
};

export interface ChatsFindResponse {
  object: "list";
  data: ChatSummary[];
}

export interface ChatsDeleteResponse {
  id: string;
  object: "chat";
  deleted: true;
}

export type ChatsGetByIdResponse = ChatDetail;

export interface ChatsUpdateRequest {
  privacy?: "public" | "private" | "team" | "team-edit" | "unlisted";
}

export type ChatsUpdateResponse = ChatDetail;

export interface ChatsFavoriteRequest {
  isFavorite: boolean;
}

export interface ChatsFavoriteResponse {
  id: string;
  object: "chat";
  favorited: boolean;
}

export interface ChatsForkRequest {
  versionId?: string;
}

export type ChatsForkResponse = ChatDetail;

export type ProjectsGetByChatIdResponse = ProjectDetail;

export interface ChatsCreateMessageRequest {
  message: string;
  attachments?: {
    url: string;
  }[];
  modelConfiguration?: {
    modelId: "v0-1.5-sm" | "v0-1.5-md" | "v0-1.5-lg";
    imageGenerations?: boolean;
    thinking?: boolean;
  };
}

export type ChatsCreateMessageResponse = MessageDetail;

export interface ChatsGetMetadataResponse {
  git: {
    branch: string;
    commit: string;
  };
  deployment: {
    id: string;
  };
  project: {
    id: string;
    name: string;
    url: string;
  };
}

export type ChatsResumeResponse = MessageDetail;

export interface DeploymentsFindLogsResponse {
  error?: string;
  logs: string[];
  nextSince?: number;
}

export interface DeploymentsFindErrorsResponse {
  error?: string;
  fullErrorText?: string;
  errorType?: string;
  formattedError?: string;
}

export interface IntegrationsVercelProjectsFindResponse {
  object: "list";
  data: VercelProjectDetail[];
}

export interface IntegrationsVercelProjectsCreateRequest {
  projectId: string;
  name: string;
}

export type IntegrationsVercelProjectsCreateResponse = VercelProjectDetail;

export interface ProjectsFindResponse {
  object: "list";
  data: ProjectDetail[];
}

export interface ProjectsCreateRequest {
  name: string;
  description?: string;
  icon?: string;
  environmentVariables?: {
    key: string;
    value: string;
  }[];
  instructions?: string;
}

export type ProjectsCreateResponse = ProjectDetail;

export interface ProjectsAssignRequest {
  chatId: string;
}

export interface ProjectsAssignResponse {
  object: "project";
  id: string;
  assigned: true;
}

export interface RateLimitsFindResponse {
  remaining?: number;
  reset?: number;
  limit: number;
}

export type UserGetResponse = UserDetail;

export type UserGetBillingResponse =
  | {
      billingType: "token";
      data: {
        plan: string;
        billingMode?: "test";
        role: string;
        billingCycle: {
          start: number;
          end: number;
        };
        balance: {
          remaining: number;
          total: number;
        };
        onDemand: {
          balance: number;
          blocks?: {
            expirationDate?: number;
            effectiveDate: number;
            originalBalance: number;
            currentBalance: number;
          }[];
        };
      };
    }
  | {
      billingType: "legacy";
      data: {
        remaining?: number;
        reset?: number;
        limit: number;
      };
    };

export interface UserGetPlanResponse {
  object: "plan";
  plan: string;
  billingCycle: {
    start: number;
    end: number;
  };
  balance: {
    remaining: number;
    total: number;
  };
}

export interface UserGetScopesResponse {
  object: "list";
  data: ScopeSummary[];
}

const BASE_URL = "https://api.v0.dev/v1" as const;

interface FetcherParams {
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  apiKey?: string;
}

async function fetcher(
  url: string,
  method: string,
  params: FetcherParams = {}
): Promise<any> {
  const queryString = params.query
    ? "?" + new URLSearchParams(params.query).toString()
    : "";
  const finalUrl = BASE_URL + url + queryString;

  const apiKey = params.apiKey || sessionApiKeyStore.getCurrentSessionApiKey();

  if (!apiKey) {
    throw new Error(
      "API key is required. Provide via Authorization header, session, or V0_API_KEY environment variable"
    );
  }

  const hasBody = method !== "GET" && params.body;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...params.headers,
  };

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(finalUrl, {
    method,
    headers,
    body: hasBody ? JSON.stringify(params.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json();
}

export const v0 = {
  chats: {
    async create(params: ChatsCreateRequest): Promise<ChatsCreateResponse> {
      const body = {
        message: params.message,
        attachments: params.attachments,
        system: params.system,
        chatPrivacy: params.chatPrivacy,
        projectId: params.projectId,
        modelConfiguration: params.modelConfiguration,
      };
      return fetcher("/chats", "POST", { body });
    },

    async find(params?: {
      limit?: string;
      offset?: string;
      isFavorite?: string;
    }): Promise<ChatsFindResponse> {
      const query = params
        ? Object.fromEntries(
            Object.entries({
              limit: params.limit,
              offset: params.offset,
              isFavorite: params.isFavorite,
            }).filter(([_, value]) => value !== undefined)
          )
        : {};

      const hasQuery = Object.keys(query).length > 0;
      return fetcher("/chats", "GET", {
        ...(hasQuery ? { query } : {}),
      });
    },

    async delete(params: { chatId: string }): Promise<ChatsDeleteResponse> {
      return fetcher(`/chats/${params.chatId}`, "DELETE");
    },

    async getById(params: { chatId: string }): Promise<ChatsGetByIdResponse> {
      return fetcher(`/chats/${params.chatId}`, "GET");
    },

    async update(
      params: { chatId: string } & ChatsUpdateRequest
    ): Promise<ChatsUpdateResponse> {
      const body = {
        privacy: params.privacy,
      };
      return fetcher(`/chats/${params.chatId}`, "PATCH", { body });
    },

    async favorite(
      params: { chatId: string } & ChatsFavoriteRequest
    ): Promise<ChatsFavoriteResponse> {
      const body = {
        isFavorite: params.isFavorite,
      };
      return fetcher(`/chats/${params.chatId}/favorite`, "PUT", { body });
    },

    async fork(
      params: { chatId: string } & ChatsForkRequest
    ): Promise<ChatsForkResponse> {
      const body = {
        versionId: params.versionId,
      };
      return fetcher(`/chats/${params.chatId}/fork`, "POST", { body });
    },

    async createMessage(
      params: { chatId: string } & ChatsCreateMessageRequest
    ): Promise<ChatsCreateMessageResponse> {
      const body = {
        message: params.message,
        attachments: params.attachments,
        modelConfiguration: params.modelConfiguration,
      };
      return fetcher(`/chats/${params.chatId}/messages`, "POST", { body });
    },

    async getMetadata(params: {
      chatId: string;
    }): Promise<ChatsGetMetadataResponse> {
      return fetcher(`/chats/${params.chatId}/metadata`, "GET");
    },

    async resume(params: {
      chatId: string;
      messageId: string;
    }): Promise<ChatsResumeResponse> {
      return fetcher(
        `/chats/${params.chatId}/messages/${params.messageId}/resume`,
        "POST"
      );
    },
  },

  projects: {
    async getByChatId(params: {
      chatId: string;
    }): Promise<ProjectsGetByChatIdResponse> {
      return fetcher(`/chats/${params.chatId}/project`, "GET");
    },

    async find(): Promise<ProjectsFindResponse> {
      return fetcher("/projects", "GET");
    },

    async create(
      params: ProjectsCreateRequest
    ): Promise<ProjectsCreateResponse> {
      const body = {
        name: params.name,
        description: params.description,
        icon: params.icon,
        environmentVariables: params.environmentVariables,
        instructions: params.instructions,
      };
      return fetcher("/projects", "POST", { body });
    },

    async assign(
      params: { projectId: string } & ProjectsAssignRequest
    ): Promise<ProjectsAssignResponse> {
      const body = {
        chatId: params.chatId,
      };
      return fetcher(`/projects/${params.projectId}/assign`, "POST", { body });
    },
  },

  deployments: {
    async findLogs(params: {
      deploymentId: string;
      since?: string;
    }): Promise<DeploymentsFindLogsResponse> {
      const query = Object.fromEntries(
        Object.entries({
          since: params.since,
        }).filter(([_, value]) => value !== undefined)
      );
      const hasQuery = Object.keys(query).length > 0;
      return fetcher(`/deployments/${params.deploymentId}/logs`, "GET", {
        ...(hasQuery ? { query } : {}),
      });
    },

    async findErrors(params: {
      deploymentId: string;
    }): Promise<DeploymentsFindErrorsResponse> {
      return fetcher(`/deployments/${params.deploymentId}/errors`, "GET");
    },
  },

  integrations: {
    vercel: {
      projects: {
        async find(): Promise<IntegrationsVercelProjectsFindResponse> {
          return fetcher("/integrations/vercel/projects", "GET");
        },

        async create(
          params: IntegrationsVercelProjectsCreateRequest
        ): Promise<IntegrationsVercelProjectsCreateResponse> {
          const body = {
            projectId: params.projectId,
            name: params.name,
          };
          return fetcher("/integrations/vercel/projects", "POST", { body });
        },
      },
    },
  },

  rateLimits: {
    async find(params?: { scope?: string }): Promise<RateLimitsFindResponse> {
      const query = params
        ? Object.fromEntries(
            Object.entries({
              scope: params.scope,
            }).filter(([_, value]) => value !== undefined)
          )
        : {};

      const hasQuery = Object.keys(query).length > 0;
      return fetcher("/rate-limits", "GET", {
        ...(hasQuery ? { query } : {}),
      });
    },
  },

  user: {
    async get(): Promise<UserGetResponse> {
      return fetcher("/user", "GET");
    },

    async getBilling(params?: {
      scope?: string;
    }): Promise<UserGetBillingResponse> {
      const query = params
        ? Object.fromEntries(
            Object.entries({
              scope: params.scope,
            }).filter(([_, value]) => value !== undefined)
          )
        : {};

      const hasQuery = Object.keys(query).length > 0;
      return fetcher("/user/billing", "GET", {
        ...(hasQuery ? { query } : {}),
      });
    },

    async getPlan(): Promise<UserGetPlanResponse> {
      return fetcher("/user/plan", "GET");
    },

    async getScopes(): Promise<UserGetScopesResponse> {
      return fetcher("/user/scopes", "GET");
    },
  },
};

export const v0Client = v0;
