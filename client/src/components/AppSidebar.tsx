import { Link } from "wouter";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronDown, 
  Crown, 
  Code2, 
  BookOpen, 
  Settings, 
  GraduationCap, 
  Image, 
  FileSearch, 
  Wand2, 
  Download, 
  FileText, 
  Users 
} from "lucide-react";
import type { User, UserCommunity } from "@shared/schema";

interface AppSidebarProps {
  location: string;
  user: User | null;
  userCommunityMemberships: UserCommunity[];
  navRef: React.RefObject<HTMLDivElement>;
  linkRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  underline: { left: number; width: number; opacity: number; gradient: string };
  isActiveRoute: (path: string) => boolean;
  positionTo: (el?: HTMLElement | null, path?: string) => void;
  handleOpenIntroduction: () => void;
  toast: any;
}

// ============================================================
// SIDEBAR STYLING - Edit this constant to change the header/nav background
// ============================================================
export const SIDEBAR_BACKGROUND = "bg-gray-900/70 backdrop-blur-sm";
export const COLLECTIONS_SIDEBAR_BACKGROUND = "bg-[#1c1c1c]/95 backdrop-blur-md";
// Examples:
// "bg-slate-900" - solid dark slate
// "bg-indigo-900/80 backdrop-blur-sm" - indigo tint with blur
// "bg-black/90 backdrop-blur-md" - near black with blur
// "bg-gradient-to-r from-gray-900 to-slate-900" - gradient
// ============================================================

export function AppSidebar({
  location,
  user,
  userCommunityMemberships,
  navRef,
  linkRefs,
  underline,
  isActiveRoute,
  positionTo,
  handleOpenIntroduction,
  toast,
}: AppSidebarProps) {
  const setLinkRef = (key: string) => (el: HTMLDivElement | null) => {
    linkRefs.current[key] = el;
  };

  const typedUser = user as User;

  return (
    <div className="flex items-center space-x-4 md:space-x-8">
      <Link href="/" className="flex items-center space-x-2 md:space-x-3 hover:opacity-80 transition-opacity">
        <div className="relative mr-2">
          <div className="absolute inset-0 bg-orange-100/20 rounded-lg blur-lg"></div>
          <div className="w-10 h-10">
            <div className="absolute inset-[3px] bg-transparent rounded-[16px] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20"></div>
              <img 
                src="/ATRIUM2 090725.png" 
                alt="PromptAtrium Logo" 
                className="w-8 h-8 object-contain relative z-10"
              />
            </div>
          </div>
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-b from-orange-400 to-purple-200 to-orange-400 bg-clip-text text-transparent">PromptAtrium</h1>
      </Link>

      <nav 
        ref={navRef}
        className="hidden md:flex items-center space-x-1 relative"
        onMouseLeave={() => {
          const activeKey = location.startsWith('/community') ? '/community' 
            : location.startsWith('/library') ? '/library'
            : location.startsWith('/marketplace') ? '/marketplace' 
            : location.startsWith('/admin') ? '/admin' 
            : '/';
          positionTo(linkRefs.current[activeKey], activeKey);
        }}
      >
        <div 
          ref={setLinkRef('/')}
          onMouseEnter={(e) => positionTo(e.currentTarget as HTMLElement, '/')}
        >
          <Link 
            href="/" 
            className={isActiveRoute("/") ? "text-bold text-cyan-200 px-4 py-2 rounded-md bg-transparent border border-transparent inline-block" : "text-gray-300 px-4 py-2 rounded-md transition-colors duration-200 inline-block"} 
            data-testid="nav-dashboard"
          >
            Dashboard
          </Link>
        </div>
        <div 
          ref={setLinkRef('/library')}
          onMouseEnter={(e) => positionTo(e.currentTarget as HTMLElement, '/library')}
        >
          <Link 
            href="/library" 
            className={isActiveRoute("/library") ? "nav-gradient-library px-4 py-2 rounded-md bg-cyan-400/10 border border-transparent inline-block whitespace-nowrap" : "text-gray-300 px-4 py-2 rounded-md transition-all duration-200 inline-block hover:bg-cyan-400/00 whitespace-nowrap"} 
            data-testid="nav-library"
          >
            My Library
          </Link>
        </div>
        <div 
          ref={setLinkRef('/marketplace')}
          onMouseEnter={(e) => positionTo(e.currentTarget as HTMLElement, '/marketplace')}
        >
          <Link 
            href="/marketplace" 
            className={isActiveRoute("/marketplace") ? "nav-gradient-marketplace px-4 py-2 rounded-md bg-purple-400/10 border border-transparent inline-block whitespace-nowrap" : "text-gray-300 px-4 py-2 rounded-md transition-all duration-200 inline-block hover:bg-purple-400/00 whitespace-nowrap"} 
            data-testid="nav-marketplace"
          >
            Marketplace
          </Link>
        </div>
        <div 
          ref={setLinkRef('/community')}
          onMouseEnter={(e) => positionTo(e.currentTarget as HTMLElement, '/community')}
        >
          <Link 
            href="/community" 
            className={isActiveRoute("/community") ? "nav-gradient-community px-4 py-2 rounded-md bg-cyan-400/10 border border-transparent inline-block" : "text-gray-300 px-4 py-2 rounded-md transition-all duration-200 inline-block hover:bg-cyan-400/00"} 
            data-testid="nav-community"
          >
            Community
          </Link>
        </div>

        {(typedUser?.role === "super_admin" || typedUser?.role === "community_admin" || typedUser?.role === "developer" || userCommunityMemberships.some(m => m.role === "admin")) && (
          <div 
            ref={setLinkRef('/admin')}
            onMouseEnter={(e) => positionTo(e.currentTarget as HTMLElement, '/admin')}
          >
            <Link 
              href="/admin" 
              className={isActiveRoute("/admin") ? "text-yellow-400 px-4 py-2 rounded-md bg-yellow-400/10 border border-yellow-400/30 flex items-center gap-1" : "text-yellow-400 hover:text-yellow-300 px-4 py-2 rounded-md transition-colors flex items-center gap-1"} 
              data-testid="nav-admin"
            >
              <Crown className="h-4 w-4" />
              Admin
            </Link>
          </div>
        )}

        {typedUser?.role === "developer" && (
          <div 
            ref={setLinkRef('/dev')}
            onMouseEnter={(e) => positionTo(e.currentTarget as HTMLElement, '/dev')}
          >
            <Link 
              href="/dev" 
              className={isActiveRoute("/dev") ? "text-cyan-400 px-4 py-2 rounded-md bg-cyan-400/10 border border-cyan-400/30 flex items-center gap-1" : "text-cyan-400 hover:text-cyan-300 px-4 py-2 rounded-md transition-colors flex items-center gap-1"} 
              data-testid="nav-dev"
            >
              <Code2 className="h-4 w-4" />
              Dev
            </Link>
          </div>
        )}

        {/* Animated Underline */}
        <div 
          data-testid="nav-underline"
          style={{ 
            left: `${underline.left}px`, 
            width: `${underline.width}px`, 
            opacity: underline.opacity,
            background: underline.gradient === 'library' 
              ? 'linear-gradient(135deg, #028ec6 0%, #9175ff 30%, #9175ff 70%, #028ec6 100%)'
              : underline.gradient === 'marketplace'
              ? 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #8b5cf6 100%)'
              : underline.gradient === 'community'
              ? 'linear-gradient(135deg, #ffc800 0%, #ff7300 50%, #ffc802 100%)'
              : underline.gradient === 'admin'
              ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
              : 'linear-gradient(to right, rgb(103 232 249), rgb(103 232 249), rgb(103 232 249))'
          }}
          className="absolute bottom-0 h-0.5 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-[left,width,opacity,background] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
      </nav>

      <div className="hidden md:flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-300 hover:text-cyan-400 transition-colors px-4 py-2 rounded-md flex items-center gap-1 text-[16px] bg-transparent border-none outline-none focus:outline-none" data-testid="nav-resources">
              Resources
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" data-testid="dropdown-resources">
            <DropdownMenuItem onClick={handleOpenIntroduction} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Account Setup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/prompting-guides" className="flex items-center cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                Prompting Guides
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ai-services" className="flex items-center cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                AI Services
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Learning Resources will be available soon!" })} className="cursor-pointer">
              <GraduationCap className="mr-2 h-4 w-4" />
              Learning Resources
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Assets will be available soon!" })} className="cursor-pointer">
              <Image className="mr-2 h-4 w-4" />
              Assets
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/install-guide" className="flex items-center cursor-pointer">
                <Download className="mr-2 h-4 w-4" />
                Install Guide
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/getting-started" className="flex items-center cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                Getting Started
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/docs/sub-communities" className="flex items-center cursor-pointer">
                <Users className="mr-2 h-4 w-4" />
                Sub-Communities Guide
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-gray-300 hover:text-cyan-400 transition-colors px-4 py-2 rounded-md flex items-center gap-1 text-[16px] bg-transparent border-none outline-none focus:outline-none" data-testid="nav-tools">
              Tools
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" data-testid="dropdown-tools">
            <DropdownMenuItem asChild>
              <Link href="/tools/aspect-ratio-calculator" className="flex items-center cursor-pointer">
                <Image className="mr-2 h-4 w-4" />
                Aspect Ratio Calculator
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/tools/metadata-analyzer" className="flex items-center cursor-pointer">
                <FileSearch className="mr-2 h-4 w-4" />
                Metadata Analyzer
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/tools/quick-prompter" className="flex items-center cursor-pointer">
                <Wand2 className="mr-2 h-4 w-4" />
                Quick Prompter
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/codex" className="flex items-center cursor-pointer">
                <BookOpen className="mr-2 h-4 w-4" />
                Wordsmith Codex
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
