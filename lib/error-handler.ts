export function handleApiKeyError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.includes("V0_API_KEY") ||
      error.message.includes("API key") ||
      error.message.includes("No API key"))
  ) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Error: No API key available. This should not happen if OAuth flow is working correctly. Please ensure the client is properly authorized.",
        },
      ],
      isError: true,
    };
  }

  return null;
}

export function createErrorResponse(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message,
      },
    ],
    isError: true,
  };
}
