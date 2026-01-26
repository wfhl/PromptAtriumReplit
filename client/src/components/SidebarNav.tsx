import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Library,
  Users,
  DollarSign,
  Wand2,
  BookOpen,
  FileSearch,
  Image,
  Sparkles,
  GraduationCap,
  Download,
  FolderPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavProps {
  location: string;
  onCreateCollection?: () => void;
}

// ============================================================
// SIDEBAR STYLING - Edit these constants to control sidebar backgrounds
// ============================================================

// Controls the OUTER sidebar container (the entire sidebar panel including logo, collections, user menu)
export const SIDEBAR_CONTAINER_BACKGROUND = "bg-[#1c1c1c]/95 backdrop-blur-md";
// Examples:
// "bg-slate-900" - solid dark slate
// "bg-[#1a1a2e]/95 backdrop-blur-md" - deep purple-tinted dark
// "bg-black/90 backdrop-blur-md" - near black with blur

// Controls the INNER navigation sections (Navigate, Tools, Resources)
export const SIDEBAR_NAV_BACKGROUND = "bg-transparent";
// Examples:
// "bg-transparent" - no background, inherits from container
// "bg-white/5" - subtle light overlay
// "bg-gradient-to-br from-purple-900/10 to-gray-900/30" - gradient tint
// "bg-indigo-900/20 rounded-lg" - colored section with rounded corners

export function SidebarNav({ location, onCreateCollection }: SidebarNavProps) {
  const [, setLocation] = useLocation();

  return (
    <div className={cn("flex flex-col h-full", SIDEBAR_NAV_BACKGROUND)}>
      {/* Navigation Section */}
      <div className="mb-4">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#444] block mb-3 px-2">
          Navigate
        </span>

        <NavItem
          label="Dashboard"
          icon={<Home className="h-4 w-4" />}
          active={location === "/"}
          onClick={() => setLocation("/")}
        />
        <NavItem
          label="My Library"
          icon={<Library className="h-4 w-4" />}
          active={location === "/library"}
          onClick={() => setLocation("/library")}
        />
        <NavItem
          label="Community"
          icon={<Users className="h-4 w-4" />}
          active={location === "/community"}
          onClick={() => setLocation("/community")}
        />
        <NavItem
          label="Marketplace"
          icon={<DollarSign className="h-4 w-4" />}
          active={location === "/marketplace"}
          onClick={() => setLocation("/marketplace")}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.02] shadow-[0_1px_0_rgba(0,0,0,0.5)] mx-2 mb-4" />

      {/* Tools Section */}
      <div className="mb-4">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#444] block mb-3 px-2">
          Tools
        </span>

        <NavItem
          label="Quick Prompter"
          icon={<Wand2 className="h-4 w-4" />}
          active={location === "/tools/quick-prompter"}
          onClick={() => setLocation("/tools/quick-prompter")}
        />
        <NavItem
          label="Wordsmith Codex"
          icon={<BookOpen className="h-4 w-4" />}
          active={location === "/codex"}
          onClick={() => setLocation("/codex")}
        />
        <NavItem
          label="Metadata Analyzer"
          icon={<FileSearch className="h-4 w-4" />}
          active={location === "/tools/metadata-analyzer"}
          onClick={() => setLocation("/tools/metadata-analyzer")}
        />
        <NavItem
          label="Aspect Ratio"
          icon={<Image className="h-4 w-4" />}
          active={location === "/tools/aspect-ratio-calculator"}
          onClick={() => setLocation("/tools/aspect-ratio-calculator")}
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.02] shadow-[0_1px_0_rgba(0,0,0,0.5)] mx-2 mb-4" />

      {/* Resources Section */}
      <div className="mb-4">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-[#444] block mb-3 px-2">
          Resources
        </span>

        <NavItem
          label="Prompting Guides"
          icon={<BookOpen className="h-4 w-4" />}
          active={location === "/prompting-guides"}
          onClick={() => setLocation("/prompting-guides")}
        />
        <NavItem
          label="AI Services"
          icon={<Sparkles className="h-4 w-4" />}
          active={location === "/ai-services"}
          onClick={() => setLocation("/ai-services")}
        />
        <NavItem
          label="Getting Started"
          icon={<GraduationCap className="h-4 w-4" />}
          active={location === "/getting-started"}
          onClick={() => setLocation("/getting-started")}
        />
        <NavItem
          label="Install Guide"
          icon={<Download className="h-4 w-4" />}
          active={location === "/install-guide"}
          onClick={() => setLocation("/install-guide")}
        />
      </div>
    </div>
  );
}

// Nav Item Component
interface NavItemProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}

function NavItem({ label, icon, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-md transition-all duration-200",
        "text-[#888] hover:text-white hover:bg-white/5",
        active && [
          "text-white bg-white/[0.05]",
          "shadow-[inset_1px_1px_3px_rgba(0,0,0,0.4)]",
        ],
      )}
    >
      {icon && (
        <span
          className={cn(
            "transition-colors duration-200",
            active ? "text-white" : "text-[#666]",
          )}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
    </button>
  );
}
