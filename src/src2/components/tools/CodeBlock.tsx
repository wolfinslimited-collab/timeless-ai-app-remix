import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  language?: string;
  children: string;
  className?: string;
}

const CodeBlock = ({ language, children, className }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Language display name mapping
  const getDisplayLanguage = (lang: string | undefined): string => {
    if (!lang) return "code";
    const langMap: Record<string, string> = {
      js: "JavaScript",
      javascript: "JavaScript",
      ts: "TypeScript",
      typescript: "TypeScript",
      tsx: "TSX",
      jsx: "JSX",
      py: "Python",
      python: "Python",
      rb: "Ruby",
      ruby: "Ruby",
      go: "Go",
      rs: "Rust",
      rust: "Rust",
      java: "Java",
      cpp: "C++",
      c: "C",
      cs: "C#",
      csharp: "C#",
      php: "PHP",
      swift: "Swift",
      kotlin: "Kotlin",
      sql: "SQL",
      bash: "Bash",
      sh: "Shell",
      shell: "Shell",
      zsh: "Zsh",
      powershell: "PowerShell",
      json: "JSON",
      yaml: "YAML",
      yml: "YAML",
      xml: "XML",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      sass: "Sass",
      less: "Less",
      md: "Markdown",
      markdown: "Markdown",
      graphql: "GraphQL",
      dockerfile: "Dockerfile",
      docker: "Docker",
    };
    return langMap[lang.toLowerCase()] || lang.toUpperCase();
  };

  return (
    <div className={cn("relative group my-3 rounded-lg overflow-hidden", className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 text-xs text-zinc-400">
        <span className="font-medium">{getDisplayLanguage(language)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      
      {/* Code content */}
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.8125rem",
          lineHeight: "1.5",
          background: "#1e1e1e",
          borderRadius: 0,
        }}
        wrapLines
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
