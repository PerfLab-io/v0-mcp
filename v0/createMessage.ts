import { z } from "zod";
import { v0Client } from "./client.js";
import { handleApiKeyError } from "../api/error-handler.js";

export const createMessageSchema = z.object({
  chatId: z.string().describe("The ID of the chat to add a message to"),
  message: z.string().describe("The message content to send"),
  modelConfiguration: z
    .object({
      modelId: z.enum(["v0-1.5-sm", "v0-1.5-md", "v0-1.5-lg"]),
      imageGenerations: z.boolean().optional(),
      thinking: z.boolean().optional(),
    })
    .optional()
    .describe("Model configuration for the message"),
});

export async function createMessage(inputs: z.infer<typeof createMessageSchema>) {
  try {
    const message = await v0Client.chats.createMessage({
      chatId: inputs.chatId,
      message: inputs.message,
      modelConfiguration: inputs.modelConfiguration,
    });


    const result = {
      content: [
        {
          type: "text" as const,
          text: `Successfully created message in chat ${inputs.chatId}
Message ID: ${message.id}
Message content: ${inputs.message}
${message.url ? `Message URL: ${message.url}` : ""}
${message.demo ? `Demo: ${message.demo}` : ""}
Model: ${message.modelConfiguration.modelId}`,
        },
      ],
    };

    return {
      result,
      rawResponse: message,
    };
  } catch (error) {
    const apiKeyError = handleApiKeyError(error);
    if (apiKeyError) return { result: apiKeyError };

    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: `Error creating message: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
