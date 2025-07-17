import { z } from "zod";
import { v0ClientManager } from "./client";

export const getUserInfoSchema = z.object({});

export async function getUserInfo() {
  try {
    const client = v0ClientManager.getClient();
    const [user, plan, scopes] = await Promise.all([
      client.user.get(),
      client.user.getPlan().catch(() => null), // Plan might not be available
      client.user.getScopes().catch(() => null), // Scopes might not be available
    ]);

    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      plan,
      scopes: scopes || [],
    };

    const result = {
      content: [
        {
          type: "text" as const,
          text: `v0 User Information:
${JSON.stringify(userInfo, null, 2)}`,
        },
      ],
    };

    return {
      result,
      rawResponse: { user, plan, scopes },
    };
  } catch (error) {
    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: `Error retrieving v0 user info: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
