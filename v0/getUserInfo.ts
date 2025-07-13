import { z } from "zod";
import { v0Client } from "./client.js";

export const getUserInfoSchema = z.object({});

export async function getUserInfo() {
  try {
    const [user, plan, scopes] = await Promise.all([
      v0Client.user.get(),
      v0Client.user.getPlan().catch(() => null), // Plan might not be available
      v0Client.user.getScopes().catch(() => null), // Scopes might not be available
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
