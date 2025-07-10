export function handleApiKeyError(error: unknown) {
  if (error instanceof Error && error.message.includes("V0_API_KEY")) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Error: V0_API_KEY environment variable is required. Please set your v0.dev API key in the environment variables.",
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