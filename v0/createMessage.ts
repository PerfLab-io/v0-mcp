import { z } from "zod";
import { v0ClientManager } from "./client";
import { handleApiKeyError } from "@/app/api/[[...route]]/error-handler";

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

export async function createMessage(
  inputs: z.infer<typeof createMessageSchema>
) {
  try {
    const client = v0ClientManager.getClient();
    const message = await client.chats.sendMessage({
      chatId: inputs.chatId,
      message: inputs.message,
      modelConfiguration: inputs.modelConfiguration,
    });

    const fileInfo =
      message.files && message.files.length > 0
        ? `\n📁 Generated ${message.files.length} file(s) - use list_files tool to view them`
        : "";

    const result = {
      content: [
        {
          type: "text" as const,
          text: `Successfully created message in chat ${inputs.chatId}
Message ID: ${message.id}
Message content: ${inputs.message}
${message.url ? `Message URL: ${message.url}` : ""}
${message.demo ? `Demo: ${message.demo}` : ""}
Model: ${message.modelConfiguration.modelId}${fileInfo}`,
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
