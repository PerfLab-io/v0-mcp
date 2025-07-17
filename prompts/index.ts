import { z } from "zod";

// Prompt argument schema
export const promptArgumentSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().optional().default(false),
});

// Prompt schema
export const promptSchema = z.object({
  name: z.string(),
  title: z.string(),
  description: z.string(),
  arguments: z.array(promptArgumentSchema).optional().default([]),
});

// V0 MCP Server Prompts
export const v0Prompts = [
  {
    name: "create_v0_chat",
    title: "Create V0 Chat",
    description: "Guide for creating a new V0 chat with best practices",
    arguments: [
      {
        name: "project_type",
        description: "Type of project (e.g., react, nextjs, vue, etc.)",
        required: false,
      },
      {
        name: "complexity",
        description: "Complexity level (simple, medium, complex)",
        required: false,
      },
    ],
  },
  {
    name: "iterate_v0_chat",
    title: "Iterate on V0 Chat",
    description:
      "Help with continuing and refining an existing V0 conversation",
    arguments: [
      {
        name: "chat_id",
        description: "The ID of the existing chat to continue",
        required: true,
      },
      {
        name: "iteration_type",
        description:
          "Type of iteration (refinement, new_feature, bug_fix, styling)",
        required: false,
      },
    ],
  },
  {
    name: "organize_v0_chats",
    title: "Organize V0 Chats",
    description: "Guide for finding, organizing, and managing V0 chats",
    arguments: [
      {
        name: "action",
        description: "Action to perform (list, search, favorite, delete)",
        required: false,
      },
    ],
  },
  {
    name: "v0_project_setup",
    title: "V0 Project Setup",
    description: "Comprehensive guide for setting up and managing V0 projects",
    arguments: [
      {
        name: "project_name",
        description: "Name for the new project",
        required: false,
      },
      {
        name: "framework",
        description: "Framework to use (react, nextjs, vue, etc.)",
        required: false,
      },
    ],
  },
  {
    name: "v0_chat_delete",
    title: "Delete V0 Chat",
    description: "Guide for deleting a V0 chat",
    arguments: [
      {
        name: "chat_id",
        description: "The ID of the chat to delete",
        required: true,
      },
    ],
  },
];

// Prompt content generators
export async function getPromptContent(
  name: string,
  args: Record<string, any> = {}
) {
  switch (name) {
    case "create_v0_chat":
      return generateCreateChatPrompt(args);
    case "iterate_v0_chat":
      return generateIterateChatPrompt(args);
    case "organize_v0_chats":
      return generateOrganizeChatsPrompt(args);
    case "v0_project_setup":
      return generateProjectSetupPrompt(args);
    case "v0_chat_delete":
      return generateChatDeletePrompt(args);
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

function generateCreateChatPrompt(args: Record<string, any>) {
  const projectType = args.project_type || "web application";
  const complexity = args.complexity || "medium";

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `You are about to create a new V0 chat. Here's a comprehensive guide to get the best results:

## Creating an Effective V0 Chat

### 1. Craft a Clear Initial Message
For a ${complexity} complexity ${projectType}, follow these guidelines:

**Be Specific:**
- Describe exactly what you want to build
- Include specific features and functionality
- Mention the tech stack if you have preferences

**Example for ${projectType}:**
"Create a ${projectType} with the following features:
- [List specific features]
- [Mention design preferences]
- [Include any technical requirements]"

### 2. Use the create_chat Tool
Call the create_chat tool with these parameters:

\`\`\`json
{
  "message": "Your detailed project description here",
  "system": "You are an expert ${projectType} developer. Focus on modern best practices, clean code, and excellent UX.",
  "chatPrivacy": "private",
  "modelConfiguration": {
    "modelId": "${
      complexity === "simple"
        ? "v0-1.5-sm"
        : complexity === "complex"
        ? "v0-1.5-lg"
        : "v0-1.5-md"
    }",
    "thinking": true
  }
}
\`\`\`

### 3. Best Practices:
- Be specific about styling preferences (modern, minimal, colorful, etc.)
- Mention any specific libraries or frameworks you prefer
- Include responsive design requirements
- Specify accessibility needs if important
- Mention any integration requirements

### 4. Follow-up Strategy:
After creating the chat, you can use create_message to iterate and refine the implementation.

Ready to create your V0 chat? Use the create_chat tool with your detailed project description!`,
    },
  };
}

function generateIterateChatPrompt(args: Record<string, any>) {
  const chatId = args.chat_id;
  const iterationType = args.iteration_type || "refinement";

  if (!chatId) {
    return {
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `To iterate on a V0 chat, you need to provide the chat_id. First, use the find_chats tool to list your existing chats and find the one you want to continue.`,
      },
    };
  }

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `You're about to iterate on V0 chat ${chatId}. Here's how to effectively continue your conversation:

## Iterating on V0 Chat: ${iterationType}

### 1. Effective Iteration Strategies

**For ${iterationType}:**
${
  iterationType === "refinement"
    ? `
- Be specific about what needs improvement
- Reference specific components or sections
- Provide clear feedback on what's working vs. not working
- Ask for specific styling or functionality changes
`
    : iterationType === "new_feature"
    ? `
- Clearly describe the new feature
- Explain how it should integrate with existing code
- Provide user stories or use cases
- Consider impact on existing functionality
`
    : iterationType === "bug_fix"
    ? `
- Describe the specific issue or error
- Provide steps to reproduce the problem
- Include any error messages
- Mention expected vs. actual behavior
`
    : iterationType === "styling"
    ? `
- Be specific about design changes
- Reference color schemes, layouts, spacing
- Mention responsive behavior
- Include accessibility considerations
`
    : `
- Be clear about your goals
- Provide specific feedback
- Reference existing components when relevant
- Explain the desired outcome
`
}

### 2. Use the create_message Tool
\`\`\`json
{
  "chatId": "${chatId}",
  "message": "Your specific iteration request here - be detailed and clear about what you want to change or add",
  "modelConfiguration": {
    "thinking": true
  }
}
\`\`\`

### 3. Iteration Best Practices:
- Reference specific parts of the existing code
- Be clear about priorities (functionality vs. styling vs. performance)
- Test one change at a time for complex modifications
- Provide feedback on what's working well
- Ask for explanations if you want to understand the changes

### 4. Common Iteration Patterns:
- "Can you add [feature] to the [component]?"
- "The [element] should be [change] instead of [current state]"
- "I'm getting [error] when [action], can you fix this?"
- "Make the design more [adjective] by [specific changes]"

Ready to iterate? Use the create_message tool with your specific improvement request!`,
    },
  };
}

function generateOrganizeChatsPrompt(args: Record<string, any>) {
  const action = args.action || "organize";

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `Here's how to effectively organize and manage your V0 chats:

## V0 Chat Organization Guide

### 1. Available Actions:

**List All Chats:**
\`\`\`json
{
  "limit": "20",
  "offset": "0"
}
\`\`\`

**Find Favorite Chats:**
\`\`\`json
{
  "isFavorite": "true",
  "limit": "10"
}
\`\`\`

**Search with Pagination:**
\`\`\`json
{
  "limit": "10",
  "offset": "10"
}
\`\`\`

### 2. Organizing Strategies:

**Favorite Important Chats:**
Use the favorite_chat tool to mark your best or most important chats:
\`\`\`json
{
  "chatId": "your-chat-id",
  "isFavorite": true
}
\`\`\`

**Find Specific Projects:**
- Look for chats by examining titles and update dates
- Use favorites for your active projects
- Check privacy settings for team vs. personal projects

### 3. Management Workflow:

1. **Regular Review:** Use find_chats weekly to review your chats
2. **Favorite Key Projects:** Mark important chats as favorites
3. **Archive Pattern:** Unfavorite completed projects
4. **Pagination:** Use limit/offset for large chat collections

### 4. Best Practices:
- Favorite chats you're actively working on
- Use descriptive initial messages for easier identification
- Regularly review and unfavorite completed projects
- Use privacy settings appropriately for team collaboration

${
  action === "list"
    ? "Start by using the find_chats tool to see all your chats."
    : action === "search"
    ? "Use find_chats with specific filters to find what you need."
    : action === "favorite"
    ? "Use favorite_chat to mark important chats."
    : "Begin with find_chats to see your current chat organization."
}`,
    },
  };
}

function generateProjectSetupPrompt(args: Record<string, any>) {
  const projectName = args.project_name || "My V0 Project";
  const framework = args.framework || "React";

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `Complete guide for setting up a V0 project: "${projectName}"

## V0 Project Setup Guide

### 1. Create Your Project
Use the create_project tool to establish your project:

\`\`\`json
{
  "name": "${projectName}",
  "description": "A ${framework} project built with V0 - describe your project's purpose and key features here",
  "instructions": "Development guidelines: use ${framework} best practices, focus on clean code, ensure responsive design, prioritize user experience"
}
\`\`\`

### 2. Project Organization Strategy:

**For ${framework} Projects:**
- Use modern ${framework} patterns and hooks
- Implement responsive design from the start
- Follow accessibility best practices
- Use TypeScript for better development experience
- Implement proper component structure

### 3. Initial Chat Creation:
After creating the project, start your first chat:

\`\`\`json
{
  "message": "Create a ${framework} application for ${projectName}. [Include detailed requirements, features, and design preferences]",
  "projectId": "your-project-id-from-creation",
  "system": "You are an expert ${framework} developer working on ${projectName}. Focus on modern best practices, clean architecture, and excellent user experience.",
  "modelConfiguration": {
    "modelId": "v0-1.5-md",
    "thinking": true
  }
}
\`\`\`

### 4. Development Workflow:

1. **Setup Phase:** Create project and initial chat
2. **Core Development:** Use create_message to build features
3. **Iteration Phase:** Refine and improve with targeted messages
4. **Organization:** Favorite important chats, organize by feature

### 5. Project Best Practices:

**Planning:**
- Define clear project scope and requirements
- Plan component architecture before coding
- Consider data flow and state management early

**Development:**
- Create focused chats for specific features
- Use descriptive messages for better tracking
- Iterate incrementally rather than big changes

**Management:**
- Use project association for related chats
- Favorite milestone chats for quick reference
- Document decisions in chat messages

Ready to start? Begin by using the create_project tool with your project details!`,
    },
  };
}

function generateChatDeletePrompt(args: Record<string, any>) {
  const chatId = args.chat_id;

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `You are about to delete a V0 chat. Here's a comprehensive guide to get the best results:

## V0 Chat Deletion Guide

### 1. Deleting a Chat:

**Delete Chat:**
\`\`\`json
{
  "chatId": "${chatId}"
}
\`\`\`

### 2. Deletion Best Practices:
- Confirm deletion with user
- Provide confirmation before deletion
- Use descriptive messages for deletion
- Ensure proper permissions for deletion

Ready to delete? Use the delete_chat tool with the chat_id of the chat you want to delete!`,
    },
  };
}
