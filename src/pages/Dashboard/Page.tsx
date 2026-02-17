import { useState, useEffect } from "react";
import { Play, Trash2, Download, Copy, Film, HardDrive, RefreshCw, Folder, FileVideo } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
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
import { useServer } from "@/contexts/ServerContext";
import DirectDownloadCard from "./DirectDownloadCard";
import TorrentCard from "./TorrentCard";
import CachedGroupCard from "./CachedGroupCard";
import { formatBytes } from "./utils";
import type { Torrent, CachedFile, CacheStats, DirectDownload } from "./types";

export function Dashboard() {
    const { serverUrl } = useServer();
    const [torrents, setTorrents] = useState<Torrent[]>([]);
    const [cachedFiles, setCachedFiles] = useState<CachedFile[]>([]);
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [magnet, setMagnet] = useState("");
    const [inputType, setInputType] = useState<'magnet' | 'direct'>('magnet');
    const [directUrl, setDirectUrl] = useState('');
    const [directDownloads, setDirectDownloads] = useState<DirectDownload[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshingCache, setRefreshingCache] = useState(false);
    const [refreshingDirect, setRefreshingDirect] = useState(false);
    const [error, setError] = useState("");

    const fetchTorrents = async () => {
        if (!serverUrl) return;
        setRefreshing(true);
        try {
            const res = await fetch(`${serverUrl}/api/torrents`);
            const data = await res.json();
            setTorrents(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setRefreshing(false);
        }
    };

    const fetchCachedFiles = async () => {
        if (!serverUrl) return;
        setRefreshingCache(true);
        try {
            const [filesRes, statsRes] = await Promise.all([
                fetch(`${serverUrl}/api/cache`),
                fetch(`${serverUrl}/api/cache/stats`)
            ]);
            const files = await filesRes.json();
            const stats = await statsRes.json();
            setCachedFiles(files || []);
            setCacheStats(stats);
        } catch (err) {
            console.error("Failed to fetch cache:", err);
        } finally {
            setRefreshingCache(false);
        }
    };

    const fetchDirectDownloads = async () => {
        if (!serverUrl) return;
        setRefreshingDirect(true);
        try {
            const res = await fetch(`${serverUrl}/api/direct`);
            const data = await res.json();
            setDirectDownloads(data || []);
        } catch (err) {
            console.error("Failed to fetch direct downloads:", err);
        } finally {
            setRefreshingDirect(false);
        }
    };

    useEffect(() => {
        fetchTorrents();
        fetchCachedFiles();
        fetchDirectDownloads();
    }, []);

    const addMagnet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!magnet || !serverUrl) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${serverUrl}/api/add`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `magnet=${encodeURIComponent(magnet)}`
            });

            if (!res.ok) throw new Error("Failed to add torrent");

            setMagnet("");
            fetchTorrents();
        } catch {
            setError("Invalid magnet link or server error");
        } finally {
            setLoading(false);
        }
    };

    const addDirectDownload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!directUrl || !serverUrl) return;
        setLoading(true);
        setError("");

        try {
            const res = await fetch(`${serverUrl}/api/direct/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: directUrl, mode: "ondemand" })
            });

            if (!res.ok) throw new Error("Failed to add direct download");

            setDirectUrl("");
            fetchDirectDownloads();
            fetchCachedFiles();
        } catch {
            setError("Invalid direct URL or server error");
        } finally {
            setLoading(false);
        }
    };

    const removeTorrent = async (hash: string) => {
        if (!serverUrl) return;
        await fetch(`${serverUrl}/api/remove/${hash}`, { method: "DELETE" });
        fetchTorrents();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const deleteCachedFolder = async (infoHash: string) => {
        if (!serverUrl) return;
        try {
            await fetch(`${serverUrl}/api/cache/${infoHash}`, { method: "DELETE" });
            fetchCachedFiles();
        } catch (err) {
            console.error("Failed to delete cache:", err);
        }
    };

    const removeAllTorrents = async () => {
        if (!serverUrl) return;
        try {
            await fetch(`${serverUrl}/api/torrents/all`, { method: "DELETE" });
            fetchTorrents();
        } catch (err) {
            console.error("Failed to remove all torrents:", err);
        }
    };

    const removeAllCache = async () => {
        if (!serverUrl) return;
        try {
            await fetch(`${serverUrl}/api/cache/all`, { method: "DELETE" });
            fetchCachedFiles();
        } catch {
            console.error("Failed to remove all cache");
        }
    };

    // Group cached files by infoHash
    const magnetCachedFiles = cachedFiles.filter((f) => f.type === 'magnet' && !!f.infoHash);
    const directCachedFiles = cachedFiles.filter((f) => f.type === 'direct');

    const groupedCache = magnetCachedFiles.reduce((acc, file) => {
        const hash = file.infoHash as string;
        if (!acc[hash]) {
            acc[hash] = [];
        }
        acc[hash].push(file);
        return acc;
    }, {} as Record<string, CachedFile[]>);

    return (
        <TooltipProvider>
            <div className="space-y-6">

                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl ring-1 ring-primary/20">
                        <Film className="size-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground text-xs md:text-sm">Manage your torrents</p>
                    </div>
                </div>

                <Card className="border-dashed border-2 transition-colors pt-0">
                    <CardContent className="pt-4">
                        <div className="flex gap-2 mb-3">
                            <Button
                                type="button"
                                variant={inputType === 'magnet' ? 'default' : 'outline'}
                                onClick={() => setInputType('magnet')}
                            >
                                Magnet URL
                            </Button>
                            <Button
                                type="button"
                                variant={inputType === 'direct' ? 'default' : 'outline'}
                                onClick={() => setInputType('direct')}
                            >
                                Direct Link
                            </Button>
                        </div>

                        {inputType === 'magnet' ? (
                            <form onSubmit={addMagnet} className="flex flex-col gap-3">
                                <Input
                                    type="text"
                                    placeholder="Paste Magnet Link here..."
                                    className="h-12 text-base"
                                    value={magnet}
                                    onChange={(e) => setMagnet(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={loading || !magnet}
                                    className="w-full h-12 gap-2"
                                >
                                    {loading ? (
                                        <div className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <Download className="size-5" />
                                    )}
                                    Add Torrent
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={addDirectDownload} className="flex flex-col gap-3">
                                <Input
                                    type="text"
                                    placeholder="Paste direct video URL here..."
                                    className="h-12 text-base"
                                    value={directUrl}
                                    onChange={(e) => setDirectUrl(e.target.value)}
                                />
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={loading || !directUrl}
                                    className="w-full h-12 gap-2"
                                >
                                    {loading ? (
                                        <div className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <Download className="size-5" />
                                    )}
                                    Stream (On-demand)
                                </Button>
                            </form>
                        )}
                        {error && (
                            <p className="text-destructive text-sm mt-3 flex items-center gap-2">
                                <span className="size-1.5 bg-destructive rounded-full" />
                                {error}
                            </p>
                        )}
                    </CardContent>
                </Card>

                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-primary rounded-full" />
                                <div>
                                    <h2 className="text-xl font-semibold">Active Torrents</h2>
                                    <Badge variant="secondary" className="mt-1">
                                        {torrents.length} {torrents.length === 1 ? 'torrent' : 'torrents'}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {torrents.length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                                                Clear All
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remove All Torrents?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will stop and remove all active torrents.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={removeAllTorrents}>
                                                    Remove All
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={fetchTorrents}
                                    disabled={refreshing}
                                    className="h-8 w-8"
                                >
                                    <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                                </Button>
                            </div>
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
                                    <TorrentCard
                                        key={t.infoHash}
                                        torrent={t}
                                        serverUrl={serverUrl}
                                        onCopy={copyToClipboard}
                                        onRemove={removeTorrent}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-blue-500 rounded-full" />
                                <div>
                                    <h2 className="text-xl font-semibold">Direct Downloads</h2>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="secondary" className="gap-1.5">
                                            <FileVideo className="size-3" />
                                            {directDownloads.length} items
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchDirectDownloads}
                                    className="gap-2"
                                >
                                    <RefreshCw className={cn("size-4", refreshingDirect ? "animate-spin" : "")} />
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                        if (!serverUrl) return;
                                        await fetch(`${serverUrl}/api/direct/all`, { method: "DELETE" });
                                        fetchDirectDownloads();
                                        fetchCachedFiles();
                                    }}
                                    className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                                >
                                    <Trash2 className="size-4" />
                                    Clear All
                                </Button>
                            </div>
                        </div>

                        {directDownloads.length === 0 ? (
                            <Empty>
                                <EmptyMedia>
                                    <FileVideo className="size-8" />
                                </EmptyMedia>
                                <EmptyTitle>No direct downloads</EmptyTitle>
                                <EmptyDescription>Add a direct link above to download.</EmptyDescription>
                            </Empty>
                        ) : (
                            <div className="grid gap-3">
                                {directDownloads.map((dl) => (
                                    <DirectDownloadCard key={dl.id} download={dl} />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-green-500 rounded-full" />
                                <div>
                                    <h2 className="text-xl font-semibold">Cached Videos</h2>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="secondary" className="gap-1.5">
                                            <HardDrive className="size-3" />
                                            {cacheStats ? formatBytes(cacheStats.totalSize) : '0 B'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {Object.keys(groupedCache).length} folders
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {Object.keys(groupedCache).length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                                                Clear All
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Clear All Cache?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently delete all cached video files to free up disk space.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={removeAllCache}>
                                                    Clear All
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={fetchCachedFiles}
                                    disabled={refreshingCache}
                                    className="h-8 w-8"
                                >
                                    <RefreshCw className={cn("size-4", refreshingCache && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        {Object.keys(groupedCache).length === 0 ? (
                            <Empty className="border rounded-2xl py-12 min-h-[200px]">
                                <EmptyMedia variant="icon">
                                    <Folder />
                                </EmptyMedia>
                                <EmptyTitle>No cached videos</EmptyTitle>
                                <EmptyDescription>
                                    Downloaded video files will appear here
                                </EmptyDescription>
                            </Empty>
                        ) : (
                            <div className="grid gap-4">
                                {Object.entries(groupedCache).map(([infoHash, files]) => (
                                    <CachedGroupCard
                                        key={infoHash}
                                        infoHash={infoHash}
                                        files={files}
                                        onDelete={deleteCachedFolder}
                                        onCopy={copyToClipboard}
                                        serverUrl={serverUrl}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-1 bg-purple-500 rounded-full" />
                                <div>
                                    <h2 className="text-xl font-semibold">Direct Cached Files</h2>
                                    <div className="flex gap-2 mt-1">
                                        <Badge variant="secondary" className="gap-1.5">
                                            <HardDrive className="size-3" />
                                            {directCachedFiles.length} files
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {directCachedFiles.length === 0 ? (
                            <Empty className="border rounded-2xl py-12 min-h-[160px]">
                                <EmptyMedia variant="icon">
                                    <FileVideo />
                                </EmptyMedia>
                                <EmptyTitle>No direct cached files</EmptyTitle>
                                <EmptyDescription>Completed direct downloads will appear here.</EmptyDescription>
                            </Empty>
                        ) : (
                            <div className="grid gap-3">
                                {directCachedFiles.map((file, idx) => (
                                    <Card key={`${file.path}-${idx}`}>
                                        <CardContent className="pt-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{file.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline">{file.status || 'unknown'}</Badge>
                                                        <span className="text-xs text-muted-foreground">{formatBytes(file.size || 0)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {file.streamUrl && serverUrl && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => copyToClipboard(`${serverUrl}${file.streamUrl}`)}
                                                            disabled={!serverUrl}
                                                        >
                                                                    <Copy className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copy Stream URL</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        disabled={!file.canPlay || !file.downloadId}
                                                        onClick={() => window.location.href = `/watch?directId=${file.downloadId}`}
                                                        className="gap-1.5"
                                                    >
                                                        <Play className="size-4" fill="currentColor" />
                                                        Play
                                                    </Button>
                                                </div>
                                            </div>
                                            {typeof file.progress === 'number' && file.status === 'downloading' && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>{(file.progress || 0).toFixed(1)}%</span>
                                                    </div>
                                                    <Progress value={file.progress || 0} />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
            </div>
        </TooltipProvider >
    );
}

export default Dashboard;
