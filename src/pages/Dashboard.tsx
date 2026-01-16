import { useState, useEffect } from "react";
import { Play, Trash2, Download, Copy, Film, Zap, Users, HardDrive, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeSwitcher } from "@/components/theme-switcher";

const API_BASE = import.meta.env.VITE_API_BASE;

type TorrentFile = {
    name: string;
    length: number;
    progress: number;
    piecesReady: number;
    piecesTotal: number;
};

type Torrent = {
    infoHash: string;
    name: string;
    totalLength: number;
    downloaded: number;
    downloadSpeed: number;
    progress: number;
    peers: number;
    files: TorrentFile[];
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export function Dashboard() {
    const [torrents, setTorrents] = useState<Torrent[]>([]);
    const [magnet, setMagnet] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchTorrents = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/torrents`);
            const data = await res.json();
            setTorrents(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchTorrents();
        const interval = setInterval(fetchTorrents, 2000);
        return () => clearInterval(interval);
    }, []);

    const addMagnet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!magnet) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_BASE}/api/add`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `magnet=${encodeURIComponent(magnet)}`
            });

            if (!res.ok) throw new Error("Failed to add torrent");

            setMagnet("");
            fetchTorrents();
        } catch (err) {
            setError("Invalid magnet link or server error");
        } finally {
            setLoading(false);
        }
    };

    const removeTorrent = async (hash: string) => {
        await fetch(`${API_BASE}/api/remove/${hash}`, { method: "DELETE" });
        fetchTorrents();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
                                <Film className="size-8 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">TorrentStream</h1>
                                <p className="text-muted-foreground text-sm md:text-base">Fast, seekable torrent streaming</p>
                            </div>
                        </div>
                        <ThemeSwitcher />
                    </div>

                    {/* Add Torrent Card */}
                    <Card className="border-dashed border-2 hover:border-primary/50 transition-colors">
                        <CardContent className="pt-6">
                            <form onSubmit={addMagnet} className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Input
                                        type="text"
                                        placeholder="Paste Magnet Link here..."
                                        className="h-12 text-base pl-4 pr-4"
                                        value={magnet}
                                        onChange={(e) => setMagnet(e.target.value)}
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={loading || !magnet}
                                    className="h-12 px-8 gap-2"
                                >
                                    {loading ? (
                                        <div className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <Download className="size-5" />
                                    )}
                                    Add Torrent
                                </Button>
                            </form>
                            {error && (
                                <p className="text-destructive text-sm mt-3 flex items-center gap-2">
                                    <span className="size-1.5 bg-destructive rounded-full" />
                                    {error}
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Torrents Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-primary rounded-full" />
                            <h2 className="text-xl font-semibold">Active Torrents</h2>
                            <Badge variant="secondary" className="ml-auto">
                                {torrents.length} {torrents.length === 1 ? 'torrent' : 'torrents'}
                            </Badge>
                        </div>

                        {torrents.length === 0 ? (
                            <Empty className="border rounded-2xl py-16 min-h-[300px]">
                                <EmptyMedia variant="icon">
                                    <Film />
                                </EmptyMedia>
                                <EmptyTitle>No active torrents</EmptyTitle>
                                <EmptyDescription>
                                    Add a magnet link above to start streaming
                                </EmptyDescription>
                            </Empty>
                        ) : (
                            <div className="grid gap-4">
                                {torrents.map((t) => (
                                    <Card key={t.infoHash} className="overflow-hidden group hover:ring-1 hover:ring-primary/20 transition-all">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <CardTitle className="truncate text-lg">
                                                        {t.name || "Fetching metadata..."}
                                                    </CardTitle>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="outline" className="gap-1.5 font-mono text-xs">
                                                            <HardDrive className="size-3" />
                                                            {formatBytes(t.totalLength)}
                                                        </Badge>
                                                        <Badge variant="outline" className="gap-1.5 font-mono text-xs text-green-600 border-green-600/30">
                                                            <Zap className="size-3" />
                                                            {formatBytes(t.downloadSpeed)}/s
                                                        </Badge>
                                                        <Badge variant="outline" className="gap-1.5 font-mono text-xs text-blue-600 border-blue-600/30">
                                                            <Users className="size-3" />
                                                            {t.peers} peers
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <CardAction className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold tabular-nums">
                                                            {t.progress.toFixed(1)}%
                                                        </div>
                                                        <CardDescription>completed</CardDescription>
                                                    </div>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remove Torrent?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will stop streaming and remove this torrent from the list.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => removeTorrent(t.infoHash)}>
                                                                    Remove
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </CardAction>
                                            </div>
                                            <Progress value={t.progress} className="h-1.5 mt-2" />
                                        </CardHeader>

                                        <CardContent className="pt-0">
                                            <div className="space-y-1">
                                                {t.files.map((f, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg group/file transition-colors"
                                                    >
                                                        <div className="flex-1 min-w-0 pr-4 space-y-1">
                                                            <div className="text-sm font-medium truncate">{f.name}</div>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span>{formatBytes(f.length)}</span>
                                                                <span className="text-muted-foreground/50">•</span>
                                                                <span className="tabular-nums">{f.progress.toFixed(1)}% ready</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={() => copyToClipboard(`${API_BASE}/stream/${t.infoHash}/${i}`)}
                                                                    >
                                                                        <Copy className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copy Stream URL</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon-sm"
                                                                        onClick={() => window.open(`${API_BASE}/stream/${t.infoHash}/${i}`, '_blank')}
                                                                    >
                                                                        <ExternalLink className="size-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Open in New Tab</TooltipContent>
                                                            </Tooltip>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => window.location.href = `/watch?infoHash=${t.infoHash}&fileIndex=${i}`}
                                                                className="gap-1.5"
                                                            >
                                                                <Play className="size-4" fill="currentColor" />
                                                                Play
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </TooltipProvider >
    );
}

export default Dashboard;
