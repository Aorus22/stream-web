import { Link, useLocation } from "react-router-dom";
import { 
    Compass, 
    Film, 
    Search, 
    Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "@/components/theme-switcher";

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

export function Sidebar() {
    const location = useLocation();

    return (
        <TooltipProvider delayDuration={0}>
            <aside className="fixed left-0 top-0 z-40 h-screen w-16 flex flex-col bg-background/95 backdrop-blur-sm border-r">
                {/* Logo */}
                <div className="flex h-16 items-center justify-center border-b">
                    <Link to="/" className="flex items-center justify-center">
                        <div className="p-2 bg-primary rounded-lg">
                            <Film className="size-5 text-primary-foreground" />
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
                                            "size-10 rounded-xl transition-colors",
                                            isActive 
                                                ? "bg-primary/10 text-primary" 
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
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

                {/* Bottom - Theme Switcher */}
                <div className="flex flex-col items-center gap-2 py-4 border-t">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div>
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
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="pl-16">
                {children}
            </main>
        </div>
    );
}

export default AppLayout;
