"use client";

import { Button } from "@/components/ui/button";
import {
  Copy,
  Terminal,
  Code,
  Zap,
  Database,
  Cpu,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MCPLandingPage() {
  const [animationFrame, setAnimationFrame] = useState(0);
  const [secondaryFrame, setSecondaryFrame] = useState(0);
  const protocol = window.location.protocol;
  const host = window.location.host;
  const mcpUrl = `${protocol}://${host}/api/mcp`;

  // Helper function to create dotted patterns
  const createDottedPattern = (color: string) => ({
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' x='0' y='0' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='2' y='1' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='4' y='2' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='6' y='3' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='1' y='4' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='3' y='5' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='5' y='6' fill='${encodeURIComponent(
      color
    )}'/%3E%3Crect width='1' height='1' x='7' y='7' fill='${encodeURIComponent(
      color
    )}'/%3E%3C/svg%3E")`,
  });

  // 5fps animation for hero ASCII art
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame((prev) => (prev + 1) % 4);
    }, 200); // 5fps = 200ms per frame

    return () => clearInterval(interval);
  }, []);

  // Secondary animation for code section
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondaryFrame((prev) => (prev + 1) % 3);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const asciiFrames = [
    `    ██╗   ██╗ ██████╗     ███╗   ███╗ ██████╗██████╗ 
    ██║   ██║██╔═████╗    ████╗ ████║██╔════╝██╔══██╗
    ██║   ██║██║██╔██║    ██╔████╔██║██║     ██████╔╝
    ╚██╗ ██╔╝████╔╝██║    ██║╚██╔╝██║██║     ██╔═══╝ 
     ╚████╔╝ ╚██████╔╝    ██║ ╚═╝ ██║╚██████╗██║     
      ╚═══╝   ╚═════╝     ╚═╝     ╚═╝ ╚═════╝╚═╝     `,
    `    ▓▓╗   ▓▓╗ ▓▓▓▓▓▓╗     ▓▓▓╗   ▓▓▓╗ ▓▓▓▓▓▓╗▓▓▓▓▓▓╗ 
    ▓▓║   ▓▓║▓▓╔═▓▓▓▓╗    ▓▓▓▓╗ ▓▓▓▓║▓▓╔════╝▓▓╔══▓▓╗
    ▓▓║   ▓▓║▓▓║▓▓╔▓▓║    ▓▓╔▓▓▓▓╔▓▓║▓▓║     ▓▓▓▓▓▓╔╝
    ╚▓▓╗ ▓▓╔╝▓▓▓▓╔╝▓▓║    ▓▓║╚▓▓╔╝▓▓║▓▓║     ▓▓╔═══╝ 
     ╚▓▓▓▓╔╝ ╚▓▓▓▓▓▓╔╝    ▓▓║ ╚═╝ ▓▓║╚▓▓▓▓▓▓╗▓▓║     
      ╚═══╝   ╚═════╝     ╚═╝     ╚═╝ ╚═════╝╚═╝     `,
    `    ░░╗   ░░╗ ░░░░░░╗     ░░░╗   ░░░╗ ░░░░░░╗░░░░░░╗ 
    ░░║   ░░║░░╔═░░░░╗    ░░░░╗ ░░░░║░░╔════╝░░╔══░░╗
    ░░║   ░░║░░║░░╔░░║    ░░╔░░░░╔░░║░░║     ░░░░░░╔╝
    ╚░░╗ ░░╔╝░░░░╔╝░░║    ░░║╚░░╔╝░░║░░║     ░░╔═══╝ 
     ╚░░░░╔╝ ╚░░░░░░╔╝    ░░║ ╚═╝ ░░║╚░░░░░░╗░░║     
      ╚═══╝   ╚═════╝     ╚═╝     ╚═╝ ╚═════╝╚═╝     `,
    `    ▒▒╗   ▒▒╗ ▒▒▒▒▒▒╗     ▒▒▒╗   ▒▒▒╗ ▒▒▒▒▒▒╗▒▒▒▒▒▒╗ 
    ▒▒║   ▒▒║▒▒╔═▒▒▒▒╗    ▒▒▒▒╗ ▒▒▒▒║▒▒╔════╝▒▒╔══▒▒╗
    ▒▒║   ▒▒║▒▒║▒▒╔▒▒║    ▒▒╔▒▒▒▒╔▒▒║▒▒║     ▒▒▒▒▒▒╔╝
    ╚▒▒╗ ▒▒╔╝▒▒▒▒╔╝▒▒║    ▒▒║╚▒▒╔╝▒▒║▒▒║     ▒▒╔═══╝ 
     ╚▒▒▒▒╔╝ ╚▒▒▒▒▒▒╔╝    ▒▒║ ╚═╝ ▒▒║╚▒▒▒▒▒▒╗▒▒║     
      ╚═══╝   ╚═════╝     ╚═╝     ╚═╝ ╚═════╝╚═╝     `,
  ];

  const handleCursorInstall = () => {
    // For Cursor, we'll use the deeplink format with base64 encoded config
    const config = {
      url: mcpUrl,
      description: "v0.dev MCP Server",
    };

    const base64Config = btoa(JSON.stringify(config));
    const cursorUrl = `cursor://anysphere.cursor-deeplink/mcp/install?name=v0-registry&config=${base64Config}`;

    window.open(cursorUrl, "_blank");
  };

  const handleVSCodeInstall = () => {
    // For VSCode, we'll use the MCP URL handler with HTTP transport
    const obj = {
      label: "v0-mcp",
      type: "http",
      uri: mcpUrl,
      headers: {
        "Content-Type": "application/json",
      },
      version: "1.0.0",
    };
    const mcpUrl = `vscode:mcp/install?${encodeURIComponent(
      JSON.stringify(obj)
    )}`;
    window.open(mcpUrl, "_blank");
  };

  // Dotted pattern styles
  const dottedPatternZinc = createDottedPattern("hsl(240 3.8% 55.2%)");
  const dottedPatternGreen = createDottedPattern("#15803d");
  const dottedPatternGray = createDottedPattern("#374151");
  const dottedPatternPink = createDottedPattern("#be185d");
  const dottedPatternPurple = createDottedPattern("#7c3aed");
  const dottedPatternOrange = createDottedPattern("#ea580c");

  const serverFeatures = [
    {
      icon: Code,
      title: "V0 Chat Tools",
      description:
        "Create chats, send messages, and manage conversations. Generate components and iterate on designs with AI-powered development tools directly in your coding environment.",
      bgColor: "bg-blue-500",
      borderColor: "#2563eb",
    },
    {
      icon: Database,
      title: "File Resources",
      description:
        "Access generated files from V0 chats as MCP resources. Browse, read, and integrate code files with session-based caching and smart file management across lambda instances.",
      bgColor: "bg-green-500",
      borderColor: "#16a34a",
    },
    {
      icon: Sparkles,
      title: "Smart Prompts",
      description:
        "Pre-configured prompt templates for V0 development workflows. Get contextual assistance for component creation, design system integration, and development best practices.",
      bgColor: "bg-purple-500",
      borderColor: "#7c3aed",
    },
    {
      icon: Zap,
      title: "Session Management",
      description:
        "Persistent sessions with KV storage backing. Track chat history, manage API keys securely, and maintain context across different AI coding sessions with OAuth2 authentication.",
      bgColor: "bg-orange-500",
      borderColor: "#ea580c",
    },
  ].map((feature, index) => (
    <div key={index} className="relative rounded-lg p-1">
      {/* Outer border with dotted pattern - 6px border, 8px radius */}
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          border: "10px solid transparent",
          borderRadius: "8px",
          backgroundImage: `${dottedPatternGray.backgroundImage}`,
          backgroundClip: "border-box",
          WebkitMask:
            "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          maskComposite: "exclude",
        }}
      ></div>

      {/* Inner content with proper radius calculation: 8px - 6px = 2px */}
      <div
        className="relative bg-gray-900 p-6 m-1.5 transform transition-all duration-300 hover:scale-102"
        style={{ borderRadius: "2px" }}
      >
        <div className="flex items-start gap-4">
          {/* Icon container with proper sizing and radius */}
          <div className="relative rounded-lg" style={{ borderRadius: "8px" }}>
            {/* Icon border with dotted pattern - 4px border, 6px radius */}
            <div
              className="absolute inset-0"
              style={{
                border: "4px solid transparent",
                borderRadius: "6px",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' x='0' y='0' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='2' y='1' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='4' y='2' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='6' y='3' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='1' y='4' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='3' y='5' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='5' y='6' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3Crect width='1' height='1' x='7' y='7' fill='${encodeURIComponent(
                  feature.borderColor
                )}'/%3E%3C/svg%3E")`,
                backgroundClip: "border-box",
                WebkitMask:
                  "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
                maskComposite: "exclude",
              }}
            ></div>

            {/* Icon background with proper radius calculation: 6px - 4px = 2px, increased size to prevent cutoff */}
            <div
              className={`relative w-16 h-16 ${feature.bgColor} flex items-center justify-center flex-shrink-0 mt-1 m-1`}
              style={{ borderRadius: "2px" }}
            >
              <feature.icon className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-white font-mono">
              {feature.title}
            </h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        </div>
      </div>
    </div>
  ));

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden flex flex-col justify-center">
      {/* Square pixel background pattern
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='2' height='2' x='0' y='0' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='4' y='2' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='8' y='4' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='12' y='6' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='16' y='8' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='2' y='10' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='6' y='12' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='10' y='14' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='14' y='16' fill='%23ffffff'/%3E%3Crect width='2' height='2' x='18' y='18' fill='%23ffffff'/%3E%3C/svg%3E")`,
        }}
      ></div> */}

      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-yellow-400 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-cyan-400 animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-1.5 h-1.5 bg-pink-400 animate-pulse"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-green-400 animate-bounce"></div>
        <div className="absolute bottom-60 right-1/3 w-2 h-2 bg-purple-400 animate-pulse"></div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden w-full flex-1 flex flex-col">
        <div className="relative container px-4 py-20 mx-auto flex flex-col items-center justify-center flex-1">
          <div className="text-center mb-8">
            {/* Animated ASCII Art */}
            <div className="font-mono text-sm sm:text-base md:text-lg text-gray-400 mb-8 leading-tight flex justify-center">
              <pre className="text-center transition-all duration-200">
                {asciiFrames[animationFrame]}
              </pre>
            </div>

            {/* <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Model Context Protocol
            </h1> */}
            <p className="text-xl md:text-2xl text-gray-300 mb-4 font-mono">
              Bring V0 anywhere you code
            </p>
            <p className="text-gray-400 max-w-2xl mx-auto mb-12">
              Connect your AI coding assistants directly to V0's to build and
              iterate faster.
            </p>

            {/* Sparkle animation */}
            <div className="flex justify-center mb-4">
              <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
            </div>
          </div>

          {/* Installation Buttons */}
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
                  <div className="text-xs opacity-80 mt-1">
                    Click to install
                  </div>
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
                  <div className="text-xs opacity-80 mt-1">
                    Click to install
                  </div>
                </button>
              </div>
            </div>

            {/* Claude Code Manual Instructions */}
            <div className="mt-8 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Cpu className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">
                  Claude Code (Manual Setup)
                </span>
              </div>
              <div className="bg-black border border-gray-600 rounded p-3 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Run in terminal:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `claude mcp add --transport http v0-mcp ${mcpUrl}`
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

          {/* Animated Code Section 
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div
                className="absolute top-1 left-1 w-full h-full rounded-lg"
                style={dottedPatternGray}
              ></div>
              <div className="relative bg-gray-900 border-2 border-gray-700 rounded-lg p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white font-mono">
                    MCP Server Status
                  </h3>
                  <div className="flex gap-2">
                    <div
                      className={`w-3 h-3 ${
                        secondaryFrame === 0 ? "bg-green-400" : "bg-gray-600"
                      } animate-pulse`}
                    ></div>
                    <div
                      className={`w-3 h-3 ${
                        secondaryFrame === 1 ? "bg-yellow-400" : "bg-gray-600"
                      } animate-pulse`}
                    ></div>
                    <div
                      className={`w-3 h-3 ${
                        secondaryFrame === 2 ? "bg-blue-400" : "bg-gray-600"
                      } animate-pulse`}
                    ></div>
                  </div>
                </div>

                <div className="bg-black border border-gray-600 rounded p-4 font-mono text-sm">
                  <div className="text-green-400 mb-2">
                    ✓ Connected to V0 Registry
                  </div>
                  <div className="text-blue-400 mb-2">
                    ✓ HTTP Transport Active
                  </div>
                  <div className="text-yellow-400 mb-2">
                    ✓ Component Discovery Ready
                  </div>
                  <div className="text-gray-400">
                    {secondaryFrame === 0 && "→ Fetching component metadata..."}
                    {secondaryFrame === 1 && "→ Syncing design tokens..."}
                    {secondaryFrame === 2 && "→ Ready for AI integration!"}
                  </div>
                </div>
              </div>
            </div>
          </div>*/}
        </div>
      </section>

      {/* What is MCP Section
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-mono">
              What is Model Context Protocol?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="relative">
                <div
                  className="absolute top-1 left-1 w-full h-full rounded-lg"
                  style={dottedPatternGray}
                ></div>
                <div className="relative bg-gray-900 border-2 border-gray-700 rounded-lg p-6 transform transition-all duration-300 hover:scale-105">
                  <Database className="h-8 w-8 text-cyan-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-3 text-white font-mono">
                    Standardized Integration
                  </h3>
                  <p className="text-gray-400">
                    MCP provides a standardized way for AI assistants to
                    securely access external data sources, tools, and services.
                    No more custom integrations for each tool.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div
                  className="absolute top-1 left-1 w-full h-full rounded-lg"
                  style={dottedPatternGray}
                ></div>
                <div className="relative bg-gray-900 border-2 border-gray-700 rounded-lg p-6 transform transition-all duration-300 hover:scale-105">
                  <Zap className="h-8 w-8 text-yellow-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-3 text-white font-mono">
                    Real-time Context
                  </h3>
                  <p className="text-gray-400">
                    Give your AI coding assistant live access to your design
                    system, component registry, and development tools for more
                    accurate and contextual responses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}

      {/* Features with Retro Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-mono">
              Server Capabilities
            </h2>
            <div className="space-y-6">{serverFeatures}</div>
          </div>
        </div>
      </section>

      {/* CTA Section 
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 font-mono">
              Ready to enhance your AI coding workflow?
            </h2>
            <p className="text-gray-400 mb-8">
              Get started with the V0 MCP server and give your AI assistants the
              context they need to build better, faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <div className="relative">
                <div
                  className="absolute top-1 left-1 w-full h-full rounded-lg"
                  style={dottedPatternZinc}
                ></div>
                <button
                  className="relative bg-white hover:bg-gray-200 text-black font-bold py-4 px-8 rounded-lg transform transition-all duration-150 hover:scale-105 active:scale-95 hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
                  onClick={() =>
                    window.open(
                      "https://modelcontextprotocol.io/introduction",
                      "_blank"
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    Learn about MCP <ArrowRight className="h-4 w-4" />
                  </div>
                </button>
              </div>
              <div className="relative">
                <div
                  className="absolute top-1 left-1 w-full h-full rounded-lg"
                  style={dottedPatternZinc}
                ></div>
                <button
                  className="relative bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg border-2 border-gray-600 transform transition-all duration-150 hover:scale-105 active:scale-95 hover:translate-x-0.5 hover:translate-y-0.5 active:translate-x-1 active:translate-y-1"
                  onClick={() =>
                    window.open("https://v0.dev/docs/faqs", "_blank")
                  }
                >
                  <div className="flex items-center gap-2">
                    V0 Documentation <ExternalLink className="h-4 w-4" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>*/}

      {/* Footer */}
      <footer className="border-t-2 border-gray-800 py-8 bg-black">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0 font-mono">
              Built by{" "}
              <Link
                href="https://twitter.com/WebTwitr"
                className="text-gray-400 hover:text-white transition-colors"
              >
                @WebTwitr
              </Link>{" "}
              Designed with{" "}
              <Link
                href="https://v0.dev"
                className="text-gray-400 hover:text-white transition-colors font-mono"
              >
                V0
              </Link>
            </div>
            <div className="flex gap-6 text-sm">
              <Link
                href="https://modelcontextprotocol.io"
                className="text-gray-400 hover:text-white transition-colors font-mono"
              >
                MCP Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
