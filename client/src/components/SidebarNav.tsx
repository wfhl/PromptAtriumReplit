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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useMarketplaceEnabled } from "@/config/features";

interface SidebarNavProps {
  location: string;
  onCreateCollection?: () => void;
}

// ============================================================
// SIDEBAR STYLING - Edit these constants to control sidebar backgrounds
// ============================================================

// Controls the OUTER sidebar container (the entire sidebar panel including logo, collections, user menu)
export const SIDEBAR_CONTAINER_BACKGROUND =
  "bg-gradient-to-br from-purple-900/10 to-gray-900/30 backdrop-blur-md";

// Controls the INNER navigation sections (Navigate, Tools, Resources)
export const SIDEBAR_NAV_BACKGROUND =
  "bg-gradient-to-br from-gray-900/10 to-purple-900/10 backdrop-blur-md";

export function SidebarNav({ location }: SidebarNavProps) {
  const MARKETPLACE_ENABLED = useMarketplaceEnabled();
  const [, setLocation] = useLocation();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 },
  };

  return (
    <motion.div
      className={cn("flex flex-col h-full", SIDEBAR_NAV_BACKGROUND)}
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
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
          variants={itemVariants}
        />
        <NavItem
          label="My Library"
          icon={<Library className="h-4 w-4" />}
          active={location === "/library"}
          onClick={() => setLocation("/library")}
          variants={itemVariants}
        />
        <NavItem
          label="Community"
          icon={<Users className="h-4 w-4" />}
          active={location === "/community"}
          onClick={() => setLocation("/community")}
          variants={itemVariants}
        />
        {MARKETPLACE_ENABLED && (
          <NavItem
            label="Marketplace"
            icon={<DollarSign className="h-4 w-4" />}
            active={location === "/marketplace"}
            onClick={() => setLocation("/marketplace")}
            variants={itemVariants}
          />
        )}
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
          variants={itemVariants}
        />
        <NavItem
          label="Wordsmith Codex"
          icon={<BookOpen className="h-4 w-4" />}
          active={location === "/codex"}
          onClick={() => setLocation("/codex")}
          variants={itemVariants}
        />
        <NavItem
          label="Metadata Analyzer"
          icon={<FileSearch className="h-4 w-4" />}
          active={location === "/tools/metadata-analyzer"}
          onClick={() => setLocation("/tools/metadata-analyzer")}
          variants={itemVariants}
        />
        <NavItem
          label="Aspect Ratio"
          icon={<Image className="h-4 w-4" />}
          active={location === "/tools/aspect-ratio-calculator"}
          onClick={() => setLocation("/tools/aspect-ratio-calculator")}
          variants={itemVariants}
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
          variants={itemVariants}
        />
        <NavItem
          label="AI Services"
          icon={<Sparkles className="h-4 w-4" />}
          active={location === "/ai-services"}
          onClick={() => setLocation("/ai-services")}
          variants={itemVariants}
        />
        <NavItem
          label="Getting Started"
          icon={<GraduationCap className="h-4 w-4" />}
          active={location === "/getting-started"}
          onClick={() => setLocation("/getting-started")}
          variants={itemVariants}
        />
        <NavItem
          label="Install Guide"
          icon={<Download className="h-4 w-4" />}
          active={location === "/install-guide"}
          onClick={() => setLocation("/install-guide")}
          variants={itemVariants}
        />
      </div>
    </motion.div>
  );
}

// Nav Item Component
interface NavItemProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  variants?: any;
}

function NavItem({ label, icon, active, onClick, variants }: NavItemProps) {
  return (
    <motion.button
      onClick={onClick}
      variants={variants}
      whileHover={{ scale: 1.02, x: 5 }}
      whileTap={{ scale: 0.98 }}
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
    </motion.button>
  );
}
