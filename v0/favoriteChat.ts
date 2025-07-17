import { z } from "zod";
import { v0ClientManager } from "./client";
import { handleApiKeyError } from "@/app/api/[[...route]]/error-handler";

export const favoriteChatSchema = z.object({
  chatId: z.string().describe("The ID of the chat to favorite/unfavorite"),
  isFavorite: z
    .boolean()
    .describe("Whether to favorite (true) or unfavorite (false) the chat"),
});

export async function favoriteChat(inputs: z.infer<typeof favoriteChatSchema>) {
  try {
    const client = v0ClientManager.getClient();
    const result = await client.chats.favorite({
      chatId: inputs.chatId,
      isFavorite: inputs.isFavorite,
    });

    const toolResult = {
      content: [
        {
          type: "text" as const,
          text: `Successfully ${
            inputs.isFavorite ? "favorited" : "unfavorited"
          } chat ${inputs.chatId}
Chat ID: ${result.id}
Favorite status: ${result.favorited ? "Favorited" : "Not favorited"}`,
        },
      ],
    };

    return {
      result: toolResult,
      rawResponse: result,
    };
  } catch (error) {
    const apiKeyError = handleApiKeyError(error);
    if (apiKeyError) return { result: apiKeyError };

    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: `Error ${
              inputs.isFavorite ? "favoriting" : "unfavoriting"
            } chat: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
