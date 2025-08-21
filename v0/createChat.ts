import { z } from "zod";
import { v0ClientManager, sessionApiKeyStore } from "./client";
import { handleApiKeyError } from "@/lib/error-handler";
import { sessionFileStore } from "@/resources/sessionFileStore";

export const createChatSchema = z.object({
  message: z.string().describe("The message to send to v0"),
  system: z.string().optional().describe("System prompt for the chat"),
  chatPrivacy: z
    .enum(["public", "private", "team-edit", "team", "unlisted"])
    .optional()
    .describe("Chat privacy setting"),
  projectId: z
    .string()
    .optional()
    .describe("Project ID to associate with the chat"),
  modelConfiguration: z
    .object({
      modelId: z.enum(["v0-1.5-sm", "v0-1.5-md", "v0-1.5-lg"]),
      imageGenerations: z.boolean().optional(),
      thinking: z.boolean().optional(),
    })
    .optional()
    .describe("Model configuration"),
});

export async function createChat(inputs: z.infer<typeof createChatSchema>) {
  try {
    const client = v0ClientManager.getClient();
    const chat = await client.chats.create(inputs);

    // Store files and last chat ID - prefer latestVersion.files if available
    const sessionId = sessionApiKeyStore.getCurrentSessionId();
    if (sessionId) {
      if (chat.latestVersion?.files && chat.latestVersion.files.length > 0) {
        await sessionFileStore.addFilesFromChat(
          sessionId,
          chat.id,
          chat.latestVersion.files,
          undefined,
          true,
        );
      } else if (chat.files && chat.files.length > 0) {
        await sessionFileStore.addFilesFromChat(
          sessionId,
          chat.id,
          chat.files,
          undefined,
          false,
        );
      }
    }

    const fileCount =
      chat.latestVersion?.files?.length || chat.files?.length || 0;
    const fileInfo =
      fileCount > 0
        ? `\n📁 Generated ${fileCount} file(s) - use list_files tool to view them or access via MCP resources`
        : "";

    const result = {
      content: [
        {
          type: "text" as const,
          text: `Successfully created v0 chat with ID: ${chat.id}
Message: ${inputs.message}
${inputs.system ? `System: ${inputs.system}` : ""}
Chat URL: ${chat.url || "Not available"}${fileInfo}`,
        },
      ],
    };

    return {
      result,
      rawResponse: chat,
    };
  } catch (error) {
    const apiKeyError = handleApiKeyError(error);
    if (apiKeyError) return { result: apiKeyError };

    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: `Error creating v0 chat: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
