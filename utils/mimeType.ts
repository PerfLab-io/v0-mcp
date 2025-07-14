export function getMimeType(language: string): string {
  const mimeTypes: Record<string, string> = {
    javascript: "text/javascript",
    typescript: "text/typescript",
    jsx: "text/jsx",
    tsx: "text/tsx",
    html: "text/html",
    css: "text/css",
    json: "application/json",
    python: "text/x-python",
    java: "text/x-java-source",
    cpp: "text/x-c++src",
    c: "text/x-csrc",
    rust: "text/x-rust",
    go: "text/x-go",
    php: "text/x-php",
    ruby: "text/x-ruby",
    shell: "text/x-shellscript",
    bash: "text/x-shellscript",
    sql: "text/x-sql",
    xml: "text/xml",
    yaml: "text/yaml",
    yml: "text/yaml",
    markdown: "text/markdown",
    md: "text/markdown",
  };

  return mimeTypes[language.toLowerCase()] || "text/plain";
}
