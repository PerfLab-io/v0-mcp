# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that exposes v0.dev APIs through the Streamable HTTP pattern. It's built with Hono framework and deployed on Vercel.

## Development Commands

- **Start development server**: `npm run start` (uses `vercel dev`)
- **Deploy**: `npm run deploy` (uses `vercel`)
- **Install dependencies**: `npm install` (or use `pnpm install` since pnpm-lock.yaml exists)

## Architecture Overview

### MCP Server Implementation

- **Pattern**: Streamable HTTP pattern (based on MCP reference implementation)
- **Framework**: Hono (instead of Express used in reference)
- **Runtime**: Edge runtime for optimal performance
- **Deployment**: Vercel serverless functions

### Core Services

- **Primary Service**: v0-sdk integration for AI-powered development tools
- **Authentication**: Environment variable based (`V0_API_KEY`)
- **Telemetry**: OpenTelemetry (OTEL) for usage pattern analytics

### Project Structure

- `api/index.ts`: Main API entry point and MCP server implementation
- `vercel.json`: Vercel deployment configuration with API routing
- `tsconfig.json`: TypeScript configuration with strict settings
- `package.json`: Dependencies and scripts

### Key Technical Details

- API mounted at `/api` base path with Vercel rewrites
- Session management using Map for active transports
- Support for POST (session init/continue), GET (SSE streams), DELETE (terminate)
- Uses Hono's context-based routing instead of Express middleware

### v0-sdk Integration

The server exposes v0.dev capabilities through MCP tools:

#### Available v0-sdk APIs

- **Chat Operations**: Create AI chats, generate code snippets, manage conversations
- **Project Management**: Create/find projects, Vercel integrations
- **User Management**: Retrieve user info, billing details, scopes

#### Authentication

- Requires `V0_API_KEY` environment variable
- Obtain key from https://v0.dev/chat/settings/keys

### Development Notes

- Uses pnpm as package manager (pnpm-lock.yaml present)
- TypeScript strict mode with ESNext target
- Edge runtime configuration for serverless deployment
- Based on MCP reference server but adapted for Hono framework
- Includes OTEL telemetry for usage analytics and intelligence gathering

## Important Notes
- Use pnpm for package management
- AVOID superfluous comments, only add comments when better context is needed for complex operations
- Ask what PRP(s) should we be focusing for the session

### **Required Reading on Session Start**
**ALWAYS** read these files at the beginning of each session to understand current status:

1. **Latest Changelog**: `agentic-context/changelogs/changelog-[MOST-RECENT-DATE].md`
2. **Latest Learnings**: `agentic-context/learnings/learnings-[MOST-RECENT-DATE].md`
3. **PRP documents**: `agentic-context/PRPs/*`
4. **Ad-hoc plannings**: `agentic-context/ad-hoc-planning/*.md` - Where the agent was instructed ad-hoc, aka: without PRP / PRD. Normally for smaller tasks or tasks that are generated as a 'side-quest' from the main goal at hand. Those should always require user aproval before proceeding.

### **Documentation Requirements**
**AFTER SUCCESSFULLY COMPLETING ANY TASK**, you MUST:

1. **Update/Create Changelog**: `agentic-context/changelogs/changelog-YYYY-MM-DD-HHMMSS.md`
   - Document what was implemented, changed, or fixed
   - Include code examples and technical details
   - Note any architectural decisions or patterns established
   - Record build/deployment outcomes

2. **Update/Create Learnings**: `agentic-context/learnings/learnings-YYYY-MM-DD-HHMMSS.md`
   - Capture insights, challenges overcome, and solutions discovered
   - Document any API discoveries or technical breakthroughs
   - Note patterns that worked well or should be avoided
   - Include strategic recommendations for future development

### **File Naming Conventions for changelogs and learnings**
**CRITICAL**: Use date-time format to avoid conflicts when multiple sessions occur on the same day:
- Format: `YYYY-MM-DD-HHMMSS` (e.g., `2025-07-26-143022`)
- Location: `agentic-context/changelogs/` and `agentic-context/learnings/` directories
- Always check for existing files and increment appropriately
