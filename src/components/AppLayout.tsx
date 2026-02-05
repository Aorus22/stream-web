import { Link, useLocation } from "react-router-dom";
import {
    Compass,
    Search,
    Download,
    LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useServer } from "@/contexts/ServerContext";
import { useNavigate } from "react-router-dom";

type NavItem = {
    icon: React.ElementType;
    label: string;
    href: string;
};

const navItems: NavItem[] = [
    { icon: Compass, label: "Discover", href: "/" },
    { icon: Search, label: "Torrent Search", href: "/search" },
    { icon: Download, label: "My Torrents", href: "/dashboard" },
];

// Logo SVG Component
function AppLogo({ className }: { className?: string }) {
    return (
        <div className={cn("relative", className)}>
            <svg viewBox="0 0 512 512" className="w-full h-full">
                <defs>
                    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="100%" stopColor="#6D28D9" />
                    </linearGradient>
                    <linearGradient id="playGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.95" />
                    </linearGradient>
                </defs>
                <rect width="512" height="512" rx="120" fill="url(#logoGradient)" />
                <path d="M200 140 L200 372 L360 256 Z" fill="url(#playGradient)" />
                <g fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.3">
                    <path d="M140 380 Q180 360 200 380" />
                    <path d="M130 400 Q170 370 210 400" />
                </g>
            </svg>
        </div>
    );
}

export function Sidebar() {
    const location = useLocation();
    const { setServerUrl } = useServer();
    const navigate = useNavigate();

    const handleDisconnect = () => {
        setServerUrl(null);
        navigate("/login");
    };

    return (
        <TooltipProvider delayDuration={0}>
            <aside className="fixed left-0 top-0 z-40 h-screen w-16 flex flex-col bg-background/80 backdrop-blur-xl border-r border-border">
                {/* Logo */}
                <div className="flex h-16 items-center justify-center border-b border-border">
                    <Link to="/" className="flex items-center justify-center p-2">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-primary/20">
                            <AppLogo />
                        </div>
                    </Link>
                </div>

                {/* Main Navigation */}
                <nav className="flex-1 flex flex-col items-center gap-2 py-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href ||
                            (item.href !== "/" && location.pathname.startsWith(item.href));

                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "size-11 rounded-xl transition-all duration-200",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                        asChild
                                    >
                                        <Link to={item.href}>
                                            <item.icon className="size-5" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" sideOffset={10}>
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>

                {/* Bottom - Disconnect & Theme Switcher */}
                <div className="flex flex-col items-center gap-2 py-4 border-t border-border">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
                                onClick={handleDisconnect}
                            >
                                <LogOut className="size-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}>
                            Disconnect
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="size-11 flex items-center justify-center">
                                <ThemeSwitcher />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}>
                            Toggle Theme
                        </TooltipContent>
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
    const { serverUrl, isConnected } = useServer();
    const location = useLocation();

    const getDisplayUrl = () => {
        if (!serverUrl) return null;
        try {
            const url = new URL(serverUrl);
            return `${url.hostname}${url.port ? ':' + url.port : ''}`;
        } catch {
            return serverUrl;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <Sidebar />
            <main className="pl-16">
                {children}
            </main>
            {serverUrl && location.pathname !== '/watch' && (
                <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-md rounded-full border border-border shadow-lg">
                    <div className={cn(
                        "w-2 h-2 rounded-full animate-pulse",
                        isConnected ? "bg-success" : "bg-destructive"
                    )} />
                    <span className="text-xs font-medium text-foreground">
                        {getDisplayUrl()}
                    </span>
                </div>
            )}
        </div>
    );
}

export default AppLayout;
