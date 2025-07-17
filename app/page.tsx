import { Code, Zap, Database, Sparkles } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import AnimatedAscii from "@/components/animated-ascii";
import InstallButtons from "@/components/install-buttons";

export default async function MCPLandingPage() {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const host = headersList.get("host") || "localhost:3000";
  const mcpUrl = `${protocol}://${host}/api/mcp`;

  // Helper function to create dotted patterns
  const createDottedPattern = (color: string) => ({
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' x='0' y='0' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='2' y='1' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='4' y='2' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='6' y='3' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='1' y='4' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='3' y='5' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='5' y='6' fill='${encodeURIComponent(
      color,
    )}'/%3E%3Crect width='1' height='1' x='7' y='7' fill='${encodeURIComponent(
      color,
    )}'/%3E%3C/svg%3E")`,
  });

  // Dotted pattern styles
  const dottedPatternZinc = createDottedPattern("hsl(240 3.8% 55.2%)");
  const dottedPatternGray = createDottedPattern("#374151");

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
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='2' y='1' fill='${encodeURIComponent(
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='4' y='2' fill='${encodeURIComponent(
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='6' y='3' fill='${encodeURIComponent(
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='1' y='4' fill='${encodeURIComponent(
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='3' y='5' fill='${encodeURIComponent(
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='5' y='6' fill='${encodeURIComponent(
                  feature.borderColor,
                )}'/%3E%3Crect width='1' height='1' x='7' y='7' fill='${encodeURIComponent(
                  feature.borderColor,
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
            <AnimatedAscii />

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
          <InstallButtons
            mcpUrl={mcpUrl}
            dottedPatternZinc={dottedPatternZinc}
          />
        </div>
      </section>

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
