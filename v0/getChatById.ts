import { z } from "zod";
import { sessionApiKeyStore, v0ClientManager } from "./client";
import { handleApiKeyError } from "@/lib/error-handler";
import { sessionFileStore } from "@/resources/sessionFileStore";

export const getChatByIdSchema = z.object({
  chatId: z.string().describe("The ID of the chat to retrieve"),
});

export async function getChatById(inputs: z.infer<typeof getChatByIdSchema>) {
  try {
    const client = v0ClientManager.getClient();
    const chat = await client.chats.getById({
      chatId: inputs.chatId,
    });

    // Populate sessionfilestore with files from the chat
    const sessionId = sessionApiKeyStore.getCurrentSessionId();

    // Try to use latestVersion.files first (new structure), fallback to chat.files
    if (sessionId) {
      if (chat.latestVersion?.files && chat.latestVersion.files.length > 0) {
        // Use the new latestVersion.files structure
        const validFiles = chat.latestVersion.files.filter(
          (file) => file.content && file.content.length > 0,
        );

        if (validFiles.length > 0) {
          await sessionFileStore.addFilesFromChat(
            sessionId,
            inputs.chatId,
            validFiles,
            inputs.chatId,
            true, // isLatestVersion flag
          );
        }
      } else if (chat.files && chat.files.length > 0) {
        // Fallback to old structure
        const files = chat.files.filter(
          (file) => file.source && file.source.length > 0,
        );

        if (files.length > 0) {
          await sessionFileStore.addFilesFromChat(
            sessionId,
            inputs.chatId,
            files,
            inputs.chatId,
            false, // not from latestVersion
          );
        }
      }
    }

    // Format the chat information - prefer latestVersion.files
    const versionsInfo = chat.latestVersion?.files
      ? chat.latestVersion.files
          .map(
            (file) =>
              `  - File Name: ${file.name}
    Locked: ${file.locked ? "Yes" : "No"}
    Chars: ${file.content.length}`,
          )
          .join("\n")
      : chat.files
          ?.map(
            (file) =>
              `  - File Name: ${file.lang}
    Chars: ${file.source.length}`,
          )
          .join("\n") || "No versions available";

    const result = {
      content: [
        {
          type: "text" as const,
          text: `Chat Details:

ID: ${chat.id}
Name: ${chat.name || "Untitled"}
Privacy: ${chat.privacy}
Favorite: ${chat.favorite ? "Yes" : "No"}
Updated: ${chat.updatedAt}
Chat URL: ${chat.webUrl}
Demo URL: ${chat.latestVersion?.demoUrl}

Versions:
${versionsInfo}

Total Files Extracted: ${chat.latestVersion?.files?.length || chat.files?.length || 0}`,
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
            text: `Error retrieving chat: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
