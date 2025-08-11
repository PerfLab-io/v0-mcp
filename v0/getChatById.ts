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
    if (sessionId && chat.files) {
      const files = chat.files.filter(file => file.source && file.source.length > 0);
      
      if (files.length > 0) {
        await sessionFileStore.addFilesFromChat(
          sessionId,
          inputs.chatId,
          files,
          inputs.chatId, // messageId
        );
      }
    }

    // Format the chat information
    const versionsInfo =
      chat.files
        ?.map(
          (file) =>
            `  - File Name: ${file.lang}
    Content: ${file.source}`,
        )
        .join("\n") || "No versions available";

    const result = {
      content: [
        {
          type: "text" as const,
          text: `Chat Details:

ID: ${chat.id}
Title: ${chat.title || "Untitled"}
Privacy: ${chat.privacy}
Favorite: ${chat.favorite ? "Yes" : "No"}
Updated: ${chat.updatedAt}

Versions:
${versionsInfo}

Total Files Extracted: ${chat.latestVersion?.files?.length || 0}`,
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
