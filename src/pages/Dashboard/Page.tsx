import { useState, useEffect, useMemo, useCallback } from "react";
import { Play, Download, Film, HardDrive, RefreshCw, Folder, FileVideo, Activity, Library, Plus, Cloud, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useServer } from "@/contexts/ServerContext";
import DirectDownloadCard from "./DirectDownloadCard";
import TorrentCard from "./TorrentCard";
import CachedGroupCard from "./CachedGroupCard";
import ReencodeProgressCard from "./ReencodeProgressCard";
import { formatBytes } from "./utils";
import type { Torrent, CachedFile, CacheStats, DirectDownload } from "./types";

export type ReencodeJob = {
    id: string;
    filename: string;
    resolution: string;
    bitrate: string;
    progress: {
        percent: number;
        time: string;
    };
    status: "processing" | "completed" | "failed" | "canceled";
};

export type GDriveJob = {
    id: string;
    filename: string;
    status: "uploading" | "completed" | "failed" | "canceled";
    progress: number;
    link?: string;
    error?: string;
};

export function Dashboard() {
    const { serverUrl } = useServer();
    const [torrents, setTorrents] = useState<Torrent[]>([]);
    const [cachedFiles, setCachedFiles] = useState<CachedFile[]>([]);
    const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
    const [magnet, setMagnet] = useState("");
    const [inputType, setInputType] = useState<'magnet' | 'direct'>('magnet');
    const [directUrl, setDirectUrl] = useState('');
    const [directDownloads, setDirectDownloads] = useState<DirectDownload[]>([]);
    const [reencodeJobs, setReencodeJobs] = useState<ReencodeJob[]>([]);
    const [gdriveJobs, setGdriveJobs] = useState<GDriveJob[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshingCache, setRefreshingCache] = useState(false);
    const [refreshingDirect, setRefreshingDirect] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);

    const fetchTorrents = useCallback(async () => {
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
    }, [serverUrl]);

    const fetchCachedFiles = useCallback(async () => {
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
    }, [serverUrl]);

    const fetchDirectDownloads = useCallback(async () => {
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
    }, [serverUrl]);

    useEffect(() => {
        const init = async () => {
            setIsInitialLoading(true);
            await Promise.allSettled([
                fetchTorrents(),
                fetchCachedFiles(),
                fetchDirectDownloads()
            ]);
            setIsInitialLoading(false);
        };
        init();

        // SSE for Torrents
        const torrentsSource = new EventSource(`${serverUrl}/api/torrents/stream`);
        torrentsSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setTorrents(data || []);
            } catch (err) {
                // Silently ignore parse errors in production
            }
        };

        // SSE for Direct Downloads
        const directSource = new EventSource(`${serverUrl}/api/direct/stream`);
        directSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setDirectDownloads(data || []);
            } catch (err) {
                // Silently ignore parse errors
            }
        };

        // SSE for Background Tasks (Reencode + GDrive)
        const tasksSource = new EventSource(`${serverUrl}/api/tasks/stream`);
        tasksSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data) {
                    setReencodeJobs(data.reencode || []);
                    setGdriveJobs(data.gdrive || []);
                }
            } catch (err) {
                // Silently ignore parse errors
            }
        };
        tasksSource.onerror = () => {
            // Silently handle errors
        };

        return () => {
            torrentsSource.close();
            directSource.close();
            tasksSource.close();
        };
    }, [serverUrl, fetchTorrents, fetchCachedFiles, fetchDirectDownloads]);

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
            setShowAddForm(false);
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
            setShowAddForm(false);
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

    const handleReencode = async (options: { infoHash?: string, fileIndex?: number, downloadId?: number, resolution: string, bitrate: string }): Promise<boolean> => {
        if (!serverUrl) return false;
        try {
            const res = await fetch(`${serverUrl}/api/reencode`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(options)
            });
            if (!res.ok) throw new Error("Failed to start reencoding");
            // Refresh cache after a short delay or show a toast
            setTimeout(fetchCachedFiles, 2000);
            return true;
        } catch (err) {
            console.error("Reencode error:", err);
            return false;
        }
    };

    const handleMoveToDrive = async (options: { infoHash?: string, fileIndex?: number, downloadId?: number, exportPath?: string }) => {
        if (!serverUrl) return;
        try {
            const res = await fetch(`${serverUrl}/api/gdrive/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(options)
            });
            if (!res.ok) throw new Error("Failed to start GDrive upload");
            alert("Upload to Google Drive started in background!");
        } catch (err) {
            console.error("GDrive upload error:", err);
            alert("Failed to start GDrive upload.");
        }
    };

    const handleCancelTask = async (type: 'reencode' | 'gdrive', id: string) => {
        if (!serverUrl) return;
        try {
            const endpoint = type === 'reencode' ? '/api/reencode/cancel' : '/api/gdrive/cancel';
            await fetch(`${serverUrl}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
        } catch (err) {
            console.error(`Failed to cancel ${type} task:`, err);
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

    const magnetCachedFiles = cachedFiles.filter((f) => f.type === 'magnet' && !!f.infoHash);
    const directCachedFiles = cachedFiles.filter((f) => f.type === 'direct');
    const exportCachedFiles = cachedFiles.filter((f) => f.type === 'export');

    const groupedCache = useMemo(() => {
        return magnetCachedFiles.reduce((acc, file) => {
            const hash = file.infoHash as string;
            if (!acc[hash]) acc[hash] = [];
            acc[hash].push(file);
            return acc;
        }, {} as Record<string, CachedFile[]>);
    }, [magnetCachedFiles]);

    const activeTransfersCount = torrents.length + directDownloads.filter(d => d.status === 'downloading').length + reencodeJobs.filter(j => j.status === 'processing').length + gdriveJobs.filter(j => j.status === 'uploading').length;

    return (
        <TooltipProvider>
            <div className="space-y-8 pb-10">
                {/* Header Section */}
                <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 text-primary">
                                <Activity className="size-5" />
                                <span className="text-sm font-bold uppercase tracking-wider">System Status</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
                            <p className="text-muted-foreground">Manage your stream activity and library.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button 
                                onClick={() => setShowAddForm(!showAddForm)}
                                className={cn("gap-2 shadow-lg shadow-primary/20 transition-all", showAddForm && "bg-muted text-muted-foreground hover:bg-muted")}
                            >
                                {showAddForm ? <RefreshCw className="size-4" /> : <Plus className="size-4" />}
                                {showAddForm ? "Cancel" : "Add Content"}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => {
                                fetchTorrents();
                                fetchCachedFiles();
                                fetchDirectDownloads();
                            }} disabled={refreshing || refreshingCache || refreshingDirect}>
                                <RefreshCw className={cn("size-4", (refreshing || refreshingCache || refreshingDirect) && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    {/* Add Content Form (Collapsible) - Moved Here */}
                    {showAddForm && (
                        <Card className="border-2 border-primary/20 bg-primary/5 animate-in slide-in-from-top-2 duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={inputType === 'magnet' ? 'default' : 'ghost'}
                                        onClick={() => setInputType('magnet')}
                                        className="rounded-full"
                                    >
                                        Magnet Link
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={inputType === 'direct' ? 'default' : 'ghost'}
                                        onClick={() => setInputType('direct')}
                                        className="rounded-full"
                                    >
                                        Direct URL
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {inputType === 'magnet' ? (
                                    <form onSubmit={addMagnet} className="flex flex-col sm:flex-row gap-3">
                                        <Input
                                            placeholder="magnet:?xt=urn:btih:..."
                                            className="bg-background h-11"
                                            value={magnet}
                                            onChange={(e) => setMagnet(e.target.value)}
                                        />
                                        <Button type="submit" size="lg" disabled={loading || !magnet} className="h-11 px-8">
                                            {loading ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Download className="size-4 mr-2" />}
                                            Start Transfer
                                        </Button>
                                    </form>
                                ) : (
                                    <form onSubmit={addDirectDownload} className="flex flex-col sm:flex-row gap-3">
                                        <Input
                                            placeholder="https://example.com/video.mp4"
                                            className="bg-background h-11"
                                            value={directUrl}
                                            onChange={(e) => setDirectUrl(e.target.value)}
                                        />
                                        <Button type="submit" size="lg" disabled={loading || !directUrl} className="h-11 px-8">
                                            {loading ? <RefreshCw className="size-4 animate-spin mr-2" /> : <Activity className="size-4 mr-2" />}
                                            Stream Now
                                        </Button>
                                    </form>
                                )}
                                {error && <p className="text-destructive text-sm mt-3 font-medium">⚠ {error}</p>}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Stats Overview - Simplified */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-card/50">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <HardDrive className="size-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Size</p>
                                {isInitialLoading ? (
                                    <Skeleton className="h-7 w-24 mt-1" />
                                ) : (
                                    <p className="text-xl font-bold">{cacheStats ? formatBytes(cacheStats.totalSize) : '0 B'}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <Library className="size-5" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Files</p>
                                {isInitialLoading ? (
                                    <Skeleton className="h-7 w-12 mt-1" />
                                ) : (
                                    <p className="text-xl font-bold">{cachedFiles.length}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="transfers" className="w-full">
                    <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none px-0 mb-6 gap-6">
                        <TabsTrigger value="transfers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12 text-base font-semibold">
                            Transfers
                            <Badge variant="secondary" className="ml-2 bg-muted">{activeTransfersCount}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="library" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-12 text-base font-semibold">
                            Library
                            <Badge variant="secondary" className="ml-2 bg-muted">{cachedFiles.length}</Badge>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="transfers" className="space-y-8 mt-0 outline-none">
                        {/* Reencode & GDrive Jobs Section */}
                        {(reencodeJobs.length > 0 || gdriveJobs.length > 0) && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <RefreshCw className="size-5 text-primary" />
                                    <h2 className="text-xl font-bold">Background Tasks</h2>
                                </div>
                                <div className="grid gap-3">
                                    {reencodeJobs.map((job) => (
                                        <ReencodeProgressCard key={job.id} job={job} onCancel={() => handleCancelTask('reencode', job.id)} />
                                    ))}
                                    {gdriveJobs.map((job) => (
                                        <Card key={job.id} className="overflow-hidden border-2 hover:border-primary/20 transition-all duration-300">
                                            <CardContent className="p-4 sm:p-5 bg-muted/20">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                                            <Cloud className={cn("size-5", job.status === "uploading" && "animate-bounce")} />
                                                        </div>
                                                        <div className="min-w-0 flex-1 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Badge className={cn(
                                                                    "h-5 text-[10px] font-bold uppercase tracking-wider",
                                                                    job.status === "completed" ? "bg-primary/20 text-primary" : 
                                                                    job.status === "failed" || job.status === "canceled" ? "bg-destructive/20 text-destructive" :
                                                                    "bg-primary text-primary-foreground animate-pulse"
                                                                )}>
                                                                    {job.status === "uploading" ? "GDrive Uploading" : `GDrive ${job.status}`}
                                                                </Badge>
                                                            </div>
                                                            <h4 className="font-bold break-all whitespace-normal leading-tight" title={job.filename}>
                                                                {job.filename}
                                                            </h4>
                                                            {job.link && (
                                                                <a 
                                                                    href={job.link} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-[10px] font-bold text-primary hover:underline block mt-1"
                                                                >
                                                                    VIEW ON DRIVE ↗
                                                                </a>
                                                            )}
                                                            {job.error && (
                                                                <p className="text-[10px] font-bold text-destructive mt-1 uppercase">Error: {job.error}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex flex-col items-end gap-3">
                                                        <div className="flex items-center gap-2">
                                                            {job.status === "uploading" && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="size-8 text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleCancelTask('gdrive', job.id)}
                                                                >
                                                                    <X className="size-4" />
                                                                </Button>
                                                            )}
                                                            <div className="text-2xl font-black tracking-tighter tabular-nums text-primary">
                                                                {job.progress.toFixed(1)}%
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {job.status === "uploading" && (
                                                    <Progress value={job.progress} className="h-1.5 mt-4 bg-muted" />
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Torrents Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="size-5 text-primary" />
                                    <h2 className="text-xl font-bold">Active Torrents</h2>
                                </div>
                                {torrents.length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">Clear All</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Stop all transfers?</AlertDialogTitle>
                                                <AlertDialogDescription>This will remove all active torrent sessions.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={removeAllTorrents}>Remove All</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            
                            {isInitialLoading ? (
                                <div className="grid gap-4">
                                    <Skeleton className="h-48 w-full rounded-xl" />
                                    <Skeleton className="h-48 w-full rounded-xl" />
                                </div>
                            ) : torrents.length === 0 ? (
                                <Empty className="border-dashed py-20 bg-muted/20">
                                    <EmptyMedia variant="icon"><Film /></EmptyMedia>
                                    <EmptyTitle>No active torrents</EmptyTitle>
                                    <EmptyDescription>Add a magnet link to start streaming.</EmptyDescription>
                                </Empty>
                            ) : (
                                <div className="grid gap-4">
                                    {torrents.map((t) => (
                                        <TorrentCard key={t.infoHash} torrent={t} serverUrl={serverUrl} onCopy={copyToClipboard} onRemove={removeTorrent} onReencode={handleReencode} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Direct Transfers Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileVideo className="size-5 text-primary/70" />
                                    <h2 className="text-xl font-bold">Direct Downloads</h2>
                                </div>
                            </div>
                            {isInitialLoading ? (
                                <div className="grid gap-3">
                                    <Skeleton className="h-32 w-full rounded-xl" />
                                    <Skeleton className="h-32 w-full rounded-xl" />
                                </div>
                            ) : directDownloads.length === 0 ? (
                                <Empty className="border-dashed py-12 bg-muted/20">
                                    <EmptyTitle className="text-sm">No direct downloads</EmptyTitle>
                                </Empty>
                            ) : (
                                <div className="grid gap-3">
                                    {directDownloads.map((dl) => (
                                        <DirectDownloadCard key={dl.id} download={dl} onReencode={handleReencode} onMoveToDrive={handleMoveToDrive} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </TabsContent>

                    <TabsContent value="library" className="space-y-8 mt-0 outline-none">
                        {/* Magnet Cache Section */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Folder className="size-5 text-primary/70" />
                                    <h2 className="text-xl font-bold">Cached Videos</h2>
                                </div>
                                {Object.keys(groupedCache).length > 0 && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">Purge Cache</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Purge all cached files?</AlertDialogTitle>
                                                <AlertDialogDescription>This will free up disk space by deleting all downloaded videos.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={removeAllCache}>Purge All</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                            {isInitialLoading ? (
                                <div className="grid gap-4">
                                    <Skeleton className="h-40 w-full rounded-xl" />
                                    <Skeleton className="h-40 w-full rounded-xl" />
                                </div>
                            ) : Object.keys(groupedCache).length === 0 ? (
                                <Empty className="py-20 bg-muted/20 border-dashed">
                                    <EmptyMedia variant="icon"><HardDrive /></EmptyMedia>
                                    <EmptyTitle>Library is empty</EmptyTitle>
                                    <EmptyDescription>Completed downloads will appear here.</EmptyDescription>
                                </Empty>
                            ) : (
                                <div className="grid gap-4">
                                    {Object.entries(groupedCache).map(([infoHash, files]) => (
                                        <CachedGroupCard key={infoHash} infoHash={infoHash} files={files} onDelete={deleteCachedFolder} onCopy={copyToClipboard} serverUrl={serverUrl} onMoveToDrive={handleMoveToDrive} />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Export Cache Section */}
                        {exportCachedFiles.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Download className="size-5 text-primary/70" />
                                    <h2 className="text-xl font-bold">Exported Videos (MP4)</h2>
                                </div>
                                <div className="grid gap-3">
                                    {exportCachedFiles.map((file, idx) => (
                                        <Card key={`${file.path}-${idx}`} className="group hover:border-primary/50 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold truncate">{file.name}</h4>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="text-[10px] uppercase">READY</Badge>
                                                            <span>{formatBytes(file.size || 0)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    onClick={() => handleMoveToDrive({ exportPath: file.path })}
                                                                >
                                                                    <Cloud className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Move to Drive</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    onClick={() => window.open(`${serverUrl}${file.streamUrl}`, '_blank')}
                                                                    disabled={!serverUrl}
                                                                >
                                                                    <Download className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Download MP4</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Direct Cache Section */}
                        {(isInitialLoading || directCachedFiles.length > 0) && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <FileVideo className="size-5 text-primary/70" />
                                    <h2 className="text-xl font-bold">Direct Stream Cache</h2>
                                </div>
                                {isInitialLoading ? (
                                    <div className="grid gap-3">
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                        <Skeleton className="h-28 w-full rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {directCachedFiles.map((file, idx) => (
                                            <Card key={`${file.path}-${idx}`} className="group hover:border-primary/50 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-semibold truncate">{file.name}</h4>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                            <Badge variant="outline" className="text-[10px] uppercase">{file.status}</Badge>
                                                            <span>{formatBytes(file.size || 0)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    onClick={() => window.open(`${serverUrl}/stream/direct/${file.downloadId}?download=true`, '_blank')}
                                                                    disabled={!serverUrl}
                                                                >
                                                                    <Download className="size-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Download</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button 
                                                                    size="icon" 
                                                                    className="size-8"
                                                                    onClick={() => window.location.href = `/watch?directId=${file.downloadId}`}
                                                                >
                                                                    <Play className="size-3.5 fill-current" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Play</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </TooltipProvider >
    );
}

export default Dashboard;
