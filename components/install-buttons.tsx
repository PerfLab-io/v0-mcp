"use client";

import { Button } from "@/components/ui/button";
import { Copy, Terminal, Code, ExternalLink } from "lucide-react";

interface InstallButtonsProps {
  mcpUrl: string;
  dottedPatternZinc: { backgroundImage: string };
}

export default function InstallButtons({
  mcpUrl,
  dottedPatternZinc,
}: InstallButtonsProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCursorInstall = () => {
    const config = {
      url: mcpUrl,
      description: "v0.dev MCP Server",
    };

    const base64Config = btoa(JSON.stringify(config));
    const cursorUrl = `cursor://anysphere.cursor-deeplink/mcp/install?name=v0-registry&config=${base64Config}`;

    window.open(cursorUrl, "_blank");
  };

  const handleVSCodeInstall = () => {
    const obj = {
      label: "v0-mcp",
      type: "http",
      uri: mcpUrl,
      headers: {
        "Content-Type": "application/json",
      },
      version: "1.0.0",
    };
    const mcpUrl_vscode = `vscode:mcp/install?${encodeURIComponent(
      JSON.stringify(obj),
    )}`;
    window.open(mcpUrl_vscode, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto mb-12">
      <h3 className="text-2xl font-bold text-center mb-8 font-mono">
        Quick Install
      </h3>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cursor Button */}
        <div className="relative">
          <div
            className="absolute top-1 left-1 w-full h-full rounded-lg"
            style={dottedPatternZinc}
          ></div>
          <button
            onClick={handleCursorInstall}
            className="relative bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-4 px-6 rounded-lg w-full"
          >
            <div className="flex items-center justify-center gap-3">
              <Code className="h-5 w-5" />
              <span className="text-lg">Install for Cursor</span>
              <ExternalLink className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-xs opacity-80 mt-1">Click to install</div>
          </button>
        </div>

        {/* VSCode Button */}
        <div className="relative">
          <div
            className="absolute top-1 left-1 w-full h-full rounded-lg"
            style={dottedPatternZinc}
          ></div>
          <button
            onClick={handleVSCodeInstall}
            className="relative bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-4 px-6 rounded-lg w-full"
          >
            <div className="flex items-center justify-center gap-3">
              <Terminal className="h-5 w-5" />
              <span className="text-lg">Install for VS Code</span>
              <ExternalLink className="h-4 w-4 opacity-70" />
            </div>
            <div className="text-xs opacity-80 mt-1">Click to install</div>
          </button>
        </div>
      </div>

      {/* Claude Code Manual Instructions with copy functionality */}
      <div className="mt-8 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
        <div className="bg-black border border-gray-600 rounded p-3 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-300">Run in terminal:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  `claude mcp add --transport http v0-mcp ${mcpUrl}`,
                )
              }
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="text-gray-400 leading-relaxed">
            {`claude mcp add --transport http v0-mcp ${mcpUrl}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
