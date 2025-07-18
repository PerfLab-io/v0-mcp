import { z } from "zod";
import { sessionFileStore } from "@/resources/sessionFileStore";
import { sessionApiKeyStore } from "./client";
import { handleApiKeyError } from "@/lib/error-handler";
import { getChatById } from "./getChatById";

export const listFilesSchema = z.object({
  chatId: z.string().optional().describe("Filter files by specific chat ID"),
  language: z
    .string()
    .optional()
    .describe("Filter files by programming language"),
  includeStats: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include file statistics in response"),
});

export async function listFiles(inputs: z.infer<typeof listFilesSchema>) {
  const sessionId = sessionApiKeyStore.getCurrentSessionId();

  if (!sessionId) {
    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: "Error: No active session found. Please authenticate first.",
          },
        ],
        isError: true,
      },
    };
  }

  try {
    let files = await sessionFileStore.getSessionFiles(sessionId);
    let effectiveChatId = inputs.chatId;

    // If no chatId provided, use the last chat ID if available
    if (!effectiveChatId) {
      effectiveChatId = await sessionFileStore.getLastChatId(sessionId);
    }

    // Apply filters
    if (effectiveChatId) {
      files = files.filter((file) => file.chatId === effectiveChatId);
    }

    // If no files found for the chatId (either provided or last), fetch from v0 API
    if (effectiveChatId && files.length === 0) {
      try {
        // Fetch the full chat info and populate sessionfilestore
        await getChatById({ chatId: effectiveChatId });
        // Re-fetch files after populating from API
        files = await sessionFileStore.getSessionFiles(sessionId);
        files = files.filter((file) => file.chatId === effectiveChatId);
      } catch (fetchError) {
        // If fetching fails, we'll continue with empty results
        console.warn(`Failed to fetch chat ${effectiveChatId} from v0 API:`, fetchError);
      }
    }

    if (inputs.language) {
      files = files.filter(
        (file) =>
          file.file.lang?.toLowerCase() === inputs.language?.toLowerCase(),
      );
    }

    // Format file list
    const fileList = files
      .map((file) => {
        const fileName =
          file.file.meta?.filename ||
          `${file.file.lang}_file_${file.id.slice(-8)}`;
        const lines = file.file.source.split("\n").length;
        const size = file.file.source.length;

        return `📁 ${fileName}
   URI: ${file.uri}
   Language: ${file.file.lang}
   Chat ID: ${file.chatId}
   Lines: ${lines}
   Size: ${size} chars
   Created: ${file.createdAt.toISOString()}
   ${file.messageId ? `Message ID: ${file.messageId}` : ""}`;
      })
      .join("\n\n");

    let response = `Found ${files.length} file(s)`;

    if (effectiveChatId) {
      response += ` for chat ${effectiveChatId}`;
      if (!inputs.chatId) {
        response += " (last interacted chat)";
      }
    }

    if (inputs.language) {
      response += ` in ${inputs.language}`;
    }

    response += ":\n\n";

    if (files.length === 0) {
      response += "No files found matching the criteria.";

      if (!effectiveChatId && !inputs.language) {
        response +=
          "\n\nTo get files, create a chat or message that generates code. Files are automatically saved from V0 responses.";
      }
    } else {
      response += fileList;
    }

    // Add statistics if requested
    if (inputs.includeStats) {
      const stats = await sessionFileStore.getFileStats(sessionId);
      response += `\n\n📊 Session Statistics:
Total Files: ${stats.totalFiles}

By Language:`;

      for (const [lang, count] of Object.entries(stats.byLanguage)) {
        response += `\n  ${lang}: ${count} files`;
      }

      response += "\n\nBy Chat:";
      for (const [chatId, count] of Object.entries(stats.byChatId)) {
        response += `\n  ${chatId}: ${count} files`;
      }
    }

    response +=
      "\n\n💡 Tip: Use MCP resources/read with the URI to access file content directly.";

    const result = {
      content: [
        {
          type: "text" as const,
          text: response,
        },
      ],
    };

    return {
      result,
      rawResponse: {
        files,
        stats: inputs.includeStats
          ? await sessionFileStore.getFileStats(sessionId)
          : undefined,
      },
    };
  } catch (error) {
    const apiKeyError = handleApiKeyError(error);
    if (apiKeyError) return { result: apiKeyError };

    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: `Error listing files: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
