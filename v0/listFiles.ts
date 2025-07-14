import { z } from "zod";
import { sessionFileStore } from "@/resources/sessionFileStore";
import { sessionApiKeyStore } from "./client";
import { handleApiKeyError } from "@/app/api/[[...route]]/error-handler";

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
    let files = sessionFileStore.getSessionFiles(sessionId);

    // Apply filters
    if (inputs.chatId) {
      files = files.filter((file) => file.chatId === inputs.chatId);
    }

    if (inputs.language) {
      files = files.filter(
        (file) =>
          file.file.lang?.toLowerCase() === inputs.language?.toLowerCase()
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

    if (inputs.chatId) {
      response += ` for chat ${inputs.chatId}`;
    }

    if (inputs.language) {
      response += ` in ${inputs.language}`;
    }

    response += ":\n\n";

    if (files.length === 0) {
      response += "No files found matching the criteria.";

      if (!inputs.chatId && !inputs.language) {
        response +=
          "\n\nTo get files, create a chat or message that generates code. Files are automatically saved from V0 responses.";
      }
    } else {
      response += fileList;
    }

    // Add statistics if requested
    if (inputs.includeStats) {
      const stats = sessionFileStore.getFileStats(sessionId);
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
          ? sessionFileStore.getFileStats(sessionId)
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
