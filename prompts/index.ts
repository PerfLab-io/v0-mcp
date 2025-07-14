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
        description: "Action to perform (list, search, favorite, organize)",
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
    name: "v0_workflow_optimization",
    title: "V0 Workflow Optimization",
    description: "Advanced tips for optimizing your V0 development workflow",
    arguments: [
      {
        name: "use_case",
        description:
          "Primary use case (prototyping, production, learning, etc.)",
        required: false,
      },
    ],
  },
  {
    name: "v0_troubleshooting",
    title: "V0 Troubleshooting",
    description: "Help with common V0 issues and error resolution",
    arguments: [
      {
        name: "issue_type",
        description:
          "Type of issue (api_error, chat_problem, project_issue, etc.)",
        required: false,
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
    case "v0_workflow_optimization":
      return generateWorkflowOptimizationPrompt(args);
    case "v0_troubleshooting":
      return generateTroubleshootingPrompt(args);
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

function generateWorkflowOptimizationPrompt(args: Record<string, any>) {
  const useCase = args.use_case || "development";

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `Advanced V0 Workflow Optimization for ${useCase}

## Optimizing Your V0 Development Workflow

### 1. Tool Usage Patterns:

**Efficient Chat Management:**
- Use create_chat for new concepts/projects
- Use create_message for iterative improvements
- Use find_chats with filters to quickly locate relevant work
- Use favorite_chat to mark active projects

**Optimal Message Crafting:**
- Be specific and detailed in initial messages
- Reference previous work when iterating
- Use clear, actionable language
- Include context about your goals

### 2. ${useCase} Optimization:

${
  useCase === "prototyping"
    ? `
**Prototyping Focus:**
- Use v0-1.5-sm model for quick iterations
- Create multiple chat variants for A/B concepts
- Focus on core functionality before polish
- Use create_message for rapid iterations
`
    : useCase === "production"
    ? `
**Production Focus:**
- Use v0-1.5-lg model for complex, robust code
- Create detailed project documentation
- Implement comprehensive error handling
- Focus on performance and accessibility
`
    : useCase === "learning"
    ? `
**Learning Focus:**
- Ask for explanations in your messages
- Request code comments and documentation
- Create focused chats for specific concepts
- Use thinking mode for detailed reasoning
`
    : `
**General Development:**
- Balance model size with complexity needs
- Organize chats by feature or component
- Use systematic iteration approaches
- Maintain clear project structure
`
}

### 3. Advanced Techniques:

**Multi-Chat Strategy:**
- Create separate chats for different features
- Use consistent naming conventions
- Cross-reference between related chats
- Maintain a "main" chat for integration

**Iteration Optimization:**
- Start broad, then refine specifics
- Test one change at a time
- Provide clear feedback on results
- Build incrementally

**Organization System:**
- Favorite active project chats
- Use descriptive initial messages
- Implement consistent chat privacy settings
- Regular cleanup of completed work

### 4. Quality Improvement:

**Message Quality:**
- Include specific requirements and constraints
- Provide examples when helpful
- Mention edge cases and error scenarios
- Request specific testing approaches

**Code Quality:**
- Ask for TypeScript when appropriate
- Request responsive design considerations
- Include accessibility requirements
- Specify performance expectations

### 5. Workflow Tools Integration:

\`\`\`javascript
// Example workflow automation
async function optimizedV0Workflow() {
  // 1. Find active chats
  const activeChats = await find_chats({ isFavorite: "true" });
  
  // 2. Continue most recent active chat
  const latestChat = activeChats.data[0];
  await create_message({
    chatId: latestChat.id,
    message: "Continue development with [specific feature]"
  });
  
  // 3. Organize completed work
  await favorite_chat({
    chatId: completedChatId,
    isFavorite: false
  });
}
\`\`\`

Optimize your ${useCase} workflow by implementing these strategies systematically!`,
    },
  };
}

function generateTroubleshootingPrompt(args: Record<string, any>) {
  const issueType = args.issue_type || "general";

  return {
    role: "user" as const,
    content: {
      type: "text" as const,
      text: `V0 Troubleshooting Guide for ${issueType} issues

## V0 Troubleshooting Guide

### 1. Common Issue Resolution:

**${issueType} Issues:**
${
  issueType === "api_error"
    ? `
- Check your API key authorization
- Verify OAuth token is valid
- Ensure proper session management
- Review error messages for specific details
`
    : issueType === "chat_problem"
    ? `
- Verify chat ID exists using find_chats
- Check if chat is accessible (privacy settings)
- Ensure proper message formatting
- Try refreshing your session
`
    : issueType === "project_issue"
    ? `
- Verify project exists and is accessible
- Check project permissions and settings
- Ensure proper project association
- Review project configuration
`
    : `
- Start with basic connectivity tests
- Check authentication status
- Review recent error messages
- Try simple operations first
`
}

### 2. Diagnostic Steps:

**Step 1: Basic Connectivity**
\`\`\`json
// Test with get_user_info
{}
\`\`\`

**Step 2: List Resources**
\`\`\`json
// Check available chats
{
  "limit": "5"
}
\`\`\`

**Step 3: Test Specific Functionality**
\`\`\`json
// Create a simple test chat
{
  "message": "Test chat creation - please confirm this works"
}
\`\`\`

### 3. Error Resolution Strategies:

**Authentication Errors:**
- Verify your V0 API key is valid
- Check OAuth authorization flow
- Ensure proper session establishment
- Try re-authenticating if needed

**Chat Access Errors:**
- Use find_chats to verify chat exists
- Check chat privacy settings
- Ensure you have proper permissions
- Try accessing a different chat

**API Response Errors:**
- Check for rate limiting issues
- Verify request format and parameters
- Review error message details
- Try simplified requests

### 4. Common Error Messages:

**"API key is required"**
- Complete OAuth authorization flow
- Ensure Bearer token is properly set
- Check session authentication status

**"Chat not found"**
- Verify chat ID with find_chats
- Check if chat was deleted
- Ensure proper permissions

**"Invalid request"**
- Review parameter formatting
- Check required vs. optional fields
- Validate JSON structure

### 5. Getting Help:

**Information to Gather:**
- Exact error messages
- Steps that led to the issue
- Your current configuration
- Recent changes to your setup

**Debugging Commands:**
\`\`\`bash
# Check MCP server status
curl http://localhost:3000/api/ping

# Verify OAuth endpoints
curl http://localhost:3000/api/.well-known/oauth-authorization-server

# Test protected resource metadata
curl http://localhost:3000/api/.well-known/oauth-protected-resource
\`\`\`

**Recovery Steps:**
1. Start with get_user_info to test basic connectivity
2. Use find_chats to verify access to your data
3. Try creating a simple test chat
4. If issues persist, check OAuth authorization

Need immediate help? Start with the basic connectivity test using get_user_info!`,
    },
  };
}
