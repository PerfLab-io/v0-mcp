# v0.dev MCP Server

An MCP (Model Context Protocol) server that exposes v0.dev APIs for AI-powered development tools with real-time streaming support.

## Features

- ✨ **Streaming Chat Creation**: Real-time streaming of v0.dev chat responses via SSE
- 🔧 Direct v0.dev API integration for chat creation
- 📝 Project management capabilities
- 👤 User info and billing access
- 🚀 Manual session management with SSE streaming
- 🔄 Real-time updates for better user experience

## Setup

```bash
npm install
npm run start
```

## Available Tools

- **create_chat**: Create v0.dev chats with streaming responses (calls v0.dev API directly)
- **get_user_info**: Retrieve user account information
- **create_project**: Create new v0.dev projects

## Streaming Experience

When using `create_chat`, you'll receive:

1. Immediate acknowledgment that the request started
2. Real-time streaming updates via SSE as the v0.dev API processes your request
3. Final completion status with chat ID and URL

**Note**: Uses manual streamable HTTP implementation with enhanced SSE for optimal streaming performance.
