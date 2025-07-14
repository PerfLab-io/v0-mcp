import { z } from "zod";
import { v0Client } from "./client";

export const createProjectSchema = z.object({
  name: z.string().describe("The project name"),
  description: z.string().optional().describe("Project description"),
  icon: z.string().optional().describe("Project icon"),
  environmentVariables: z
    .array(
      z.object({
        key: z.string().describe("Environment variable key"),
        value: z.string().describe("Environment variable value"),
      })
    )
    .optional()
    .describe("Environment variables"),
  instructions: z.string().optional().describe("Project instructions"),
});

export async function createProject(
  inputs: z.infer<typeof createProjectSchema>
) {
  try {
    const project = await v0Client.projects.create(inputs);

    const result = {
      content: [
        {
          type: "text" as const,
          text: `Successfully created v0 project:
ID: ${project.id}
Name: ${project.name}
${inputs.description ? `Description: ${inputs.description}` : ""}
Created: ${new Date().toISOString()}
URL: ${
            project.vercelProjectId
              ? `https://vercel.com/projects/${project.vercelProjectId}`
              : "Not available"
          }`,
        },
      ],
    };

    return {
      result,
      rawResponse: project,
    };
  } catch (error) {
    return {
      result: {
        content: [
          {
            type: "text" as const,
            text: `Error creating v0 project: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        isError: true,
      },
    };
  }
}
