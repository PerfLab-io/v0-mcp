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