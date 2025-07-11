import { z } from "zod";
import { v0Client } from "./client.js";
import { handleApiKeyError } from "../api/error-handler.js";

export const favoriteChatSchema = z.object({
  chatId: z.string().describe("The ID of the chat to favorite/unfavorite"),
  isFavorite: z.boolean().describe("Whether to favorite (true) or unfavorite (false) the chat"),
});

export async function favoriteChat(inputs: z.infer<typeof favoriteChatSchema>) {
  try {
    const result = await v0Client.chats.favorite({
      chatId: inputs.chatId,
      isFavorite: inputs.isFavorite,
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully ${inputs.isFavorite ? "favorited" : "unfavorited"} chat ${inputs.chatId}
Chat ID: ${result.id}
Favorite status: ${result.favorited ? "Favorited" : "Not favorited"}`,
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
          text: `Error ${inputs.isFavorite ? "favoriting" : "unfavoriting"} chat: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
      isError: true,
    };
  }
}