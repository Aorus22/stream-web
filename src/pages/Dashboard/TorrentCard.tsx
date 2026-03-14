import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Copy, Trash2, Zap, Users, FileVideo, HardDrive, Download, DownloadCloud } from "lucide-react";
import type { Torrent } from "./types";
import { formatBytes } from "./utils";
import { cn } from "@/lib/utils";

type Props = {
    torrent: Torrent;
    serverUrl: string | null;
    onCopy: (value: string) => void;
    onRemove: (hash: string) => void;
};

export default function TorrentCard({ torrent, serverUrl, onCopy, onRemove }: Props) {
    const copyStreamUrl = (index: number) => {
        if (!serverUrl) return;
        onCopy(`${serverUrl}/stream/${torrent.infoHash}/${index}`);
    };

    const downloadFile = (index: number) => {
        if (!serverUrl) return;
        window.open(`${serverUrl}/stream/${torrent.infoHash}/${index}?download=true`, '_blank');
    };

    const isCompleted = torrent.progress >= 100;

    return (
        <Card className="overflow-hidden border-2 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 sm:p-5 bg-muted/30 pb-4">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className={cn(
                                "h-5 text-[10px] font-bold uppercase tracking-wider",
                                isCompleted ? "bg-primary/20 text-primary hover:bg-primary/30" : "bg-primary text-primary-foreground animate-pulse"
                            )}>
                                {isCompleted ? "Completed" : "Streaming"}
                            </Badge>
                            <span className="text-xs font-mono text-muted-foreground tabular-nums">
                                {torrent.infoHash.slice(0, 8)}
                            </span>
                        </div>
                        <CardTitle className="text-lg font-bold leading-tight break-all whitespace-normal" title={torrent.name}>
                            {torrent.name || "Fetching metadata..."}
                        </CardTitle>
                        
                        <div className="flex flex-wrap items-center gap-4 pt-1">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <HardDrive className="size-3.5" />
                                {formatBytes(torrent.totalLength)}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Zap className="size-3.5" />
                                {formatBytes(torrent.downloadSpeed)}/s
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <Users className="size-3.5" />
                                {torrent.peers} Peers
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-black tracking-tighter tabular-nums text-primary">
                                {torrent.progress.toFixed(1)}%
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8" onClick={() => onCopy(torrent.magnetUri)}>
                                        <Copy className="size-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy Magnet</TooltipContent>
                            </Tooltip>
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8 text-destructive hover:bg-destructive/10">
                                        <Trash2 className="size-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Remove transfer?</AlertDialogTitle>
                                        <AlertDialogDescription>This will stop streaming this torrent.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onRemove(torrent.infoHash)}>Remove</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
                <Progress value={torrent.progress} className="h-1.5 mt-4 bg-muted" />
            </CardHeader>

            <CardContent className="p-2 sm:p-3 space-y-1">
                {torrent.files.map((file, i) => (
                    <div
                        key={i}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-lg group transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="size-8 rounded bg-background flex items-center justify-center border group-hover:border-primary/30 transition-colors">
                                <FileVideo className="size-4 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{file.name}</div>
                                <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    <span>{formatBytes(file.length)}</span>
                                    <span className="opacity-30">•</span>
                                    <span className="text-primary">{file.progress.toFixed(0)}% Ready</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 ml-4">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyStreamUrl(i)}>
                                        <Copy className="size-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Stream URL</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => downloadFile(i)}
                                    >
                                        {file.progress >= 100 ? (
                                            <Download className="size-4" />
                                        ) : (
                                            <DownloadCloud className="size-4" />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {file.progress >= 100 ? "Download" : "Start Download Torrent"}
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="icon"
                                        variant={file.progress > 0 ? "default" : "secondary"}
                                        onClick={() => window.location.href = `/watch?infoHash=${torrent.infoHash}&fileIndex=${i}`}
                                        className="size-8 shadow-sm"
                                    >
                                        <Play className="size-3.5 fill-current" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Play</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
