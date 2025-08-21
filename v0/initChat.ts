import { z } from "zod";
import { sessionApiKeyStore, v0ClientManager } from "./client";
import { handleApiKeyError } from "@/lib/error-handler";
import { sessionFileStore } from "@/resources/sessionFileStore";

const fileInputSchema = z
  .object({
    name: z.string().describe("The name of the file"),
    content: z.string().optional().describe("The content of the file"),
    url: z.string().optional().describe("The URL of the file"),
  })
  .refine(
    (data) => (data.content && !data.url) || (!data.content && data.url),
    {
      message: "File must have either content or url, but not both",
    },
  );

export const initChatSchema = z.object({
  files: z
    .array(fileInputSchema)
    .describe("Array of files to initialize the chat with"),
  chatPrivacy: z
    .enum(["public", "private", "team-edit", "team", "unlisted"])
    .optional()
    .describe("Chat privacy setting"),
  projectId: z
    .string()
    .optional()
    .describe("Project ID to associate with the chat"),
});

export async function initChat(inputs: z.infer<typeof initChatSchema>) {
  try {
    const client = v0ClientManager.getClient();

    // Transform the files to match the v0 SDK format
    const files = inputs.files.map((file) => ({
      name: file.name,
      ...(file.content ? { content: file.content } : { url: file.url! }),
    }));

    const chat = await client.chats.init({
      type: "files",
      files,
      chatPrivacy: inputs.chatPrivacy,
      projectId: inputs.projectId,
    } as any);

    // Store files in session file store - prefer latestVersion.files if available
    const sessionId = sessionApiKeyStore.getCurrentSessionId();

    if (sessionId) {
      if (chat.latestVersion?.files && chat.latestVersion.files.length > 0) {
        await sessionFileStore.addFilesFromChat(
          sessionId,
          chat.id,
          chat.latestVersion.files,
          chat.id,
          true,
        );
      } else if (chat.files && chat.files.length > 0) {
        await sessionFileStore.addFilesFromChat(
          sessionId,
          chat.id,
          chat.files,
          chat.id,
          false,
        );
      }
    }

    // Format the response - prefer latestVersion.files if available
    const filesInfo = chat.latestVersion?.files
      ? chat.latestVersion.files
          .map(
            (file) =>
              `  - ${file.name} (${file.content?.length || 0} chars, locked: ${file.locked})`,
          )
          .join("\n")
      : chat.files
          ?.map(
            (file) =>
              `  - ${file.lang} file (${file.source?.length || 0} chars)`,
          )
          .join("\n") || "No files available";

    const result = {
      content: [
        {
          type: "text" as const,
          text: `Chat initialized successfully!

ID: ${chat.id}
Title: ${chat.name || "Untitled"}
Privacy: ${chat.privacy}
Chat URL: ${chat.webUrl}
Demo URL: ${chat.latestVersion?.demoUrl}
Shareable: ${chat.shareable ? "Yes" : "No"}
Updated: ${chat.updatedAt}

Files:
${filesInfo}

Total Files: ${chat.latestVersion?.files?.length || chat.files?.length || 0}
Messages: ${chat.messages?.length || 0}

💡 Tip: Use list_files with chatId "${chat.id}" to see the extracted files.`,
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
            text: `Error initializing chat: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
