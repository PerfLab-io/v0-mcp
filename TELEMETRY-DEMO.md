# MCP Transport Telemetry - Demo Data

This document shows the telemetry events that will be collected when clients interact with the MCP server.

## Example Telemetry Events

### 1. Streaming Capabilities Detection

**Event**: `mcp_streaming_capabilities`

```json
{
  "sessionId": "abc123...",
  "supportsStreaming": true,
  "acceptHeader": "text/event-stream",
  "clientName": "claude-desktop",
  "clientVersion": "1.2.3",
  "clientString": "claude-desktop/1.2.3"
}
```

### 2. Transport Usage - Streaming

**Event**: `mcp_transport_usage`

```json
{
  "sessionId": "abc123...",
  "method": "logging/setLevel",
  "transportType": "streaming",
  "clientName": "claude-desktop",
  "clientVersion": "1.2.3",
  "clientString": "claude-desktop/1.2.3",
  "supportsStreaming": true
}
```

### 3. Transport Usage - Regular HTTP

**Event**: `mcp_transport_usage`

```json
{
  "sessionId": "def456...",
  "method": "tools/call",
  "transportType": "regular",
  "clientName": "curl",
  "clientVersion": "8.4.0",
  "clientString": "curl/8.4.0",
  "supportsStreaming": false
}
```

## Client Detection Examples

### MCP Clients

- **Claude Desktop**: `Claude Desktop/1.2.3` → `claude-desktop/1.2.3`
- **Cline**: `Cline/2.1.0` → `cline/2.1.0`
- **VS Code**: `Visual Studio Code/1.85.0` → `visual-studio-code/1.85.0`
- **Generic MCP**: `MCPClient/1.0.0` → `mcpclient/1.0.0`

### Development Tools

- **Node.js**: `Node.js/18.17.0` → `node.js/18.17.0`
- **Python**: `Python/3.11.0` → `python/3.11.0`
- **curl**: `curl/8.4.0` → `curl/8.4.0`

### Browsers

- **Chrome**: `Mozilla/5.0 ... Chrome/120.0.0.0` → `chrome/120.0.0.0`
- **Firefox**: `Mozilla/5.0 ... Firefox/120.0` → `firefox/120.0`
- **Safari**: `Mozilla/5.0 ... Safari/537.36` → `safari/537.36`

## Analytics Insights

This telemetry will help understand:

1. **Streaming Adoption**:
   - Which clients support streaming vs regular HTTP
   - Streaming usage patterns by client type

2. **Client Distribution**:
   - Most popular MCP clients and their versions
   - Browser vs native client usage

3. **Feature Usage**:
   - Which MCP methods are used most with streaming
   - Transport preference by method type

4. **Client Evolution**:
   - Version adoption rates
   - Migration patterns between transport types

## Privacy & Security

- Session IDs are truncated to 32 characters
- No sensitive data is collected
- Client versions help with compatibility decisions
- All data goes to Vercel Analytics (anonymous aggregation)
