import { z } from "zod";
import { v0Client } from "./client.js";
import { handleApiKeyError } from "../api/error-handler.js";

export const findChatsSchema = z.object({
  limit: z.string().optional().describe("Maximum number of chats to return"),
  offset: z.string().optional().describe("Number of chats to skip for pagination"),
  isFavorite: z.string().optional().describe("Filter by favorite status (true/false)"),
});

export async function findChats(inputs: z.infer<typeof findChatsSchema>) {
  try {
    const chats = await v0Client.chats.find({
      limit: inputs.limit,
      offset: inputs.offset,
      isFavorite: inputs.isFavorite,
    });

    const chatList = chats.data.map(chat => 
      `- Chat ID: ${chat.id}
  Title: ${chat.title || "Untitled"}
  Privacy: ${chat.privacy}
  Favorite: ${chat.favorite ? "Yes" : "No"}
  Updated: ${chat.updatedAt}
  ${chat.latestVersion ? `Latest Version: ${chat.latestVersion.id} (${chat.latestVersion.status})` : ""}`
    ).join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${chats.data.length} chats:

${chatList}

Total results: ${chats.data.length}
${inputs.limit ? `Limit: ${inputs.limit}` : ""}
${inputs.offset ? `Offset: ${inputs.offset}` : ""}
${inputs.isFavorite ? `Filtered by favorite: ${inputs.isFavorite}` : ""}`,
        },
      ],
    };
  } catch (error) {
    const apiKeyError = handleApiKeyError(error);
    if (apiKeyError) return apiKeyError;
    
    return {
      content: [
        {
          type: "text" as const,
          text: `Error finding chats: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
      isError: true,
    };
  }
}