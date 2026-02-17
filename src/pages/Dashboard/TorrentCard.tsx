import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Copy, Trash2 } from "lucide-react";
import type { Torrent } from "./types";
import { formatBytes } from "./utils";

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
    return (
        <Card className="overflow-hidden group transition-all">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="min-w-0 w-full md:flex-1 space-y-2">
                        <CardTitle className="text-lg leading-tight break-words" title={torrent.name}>
                            {torrent.name || "Fetching metadata..."}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="gap-1.5 font-mono text-xs">
                                {formatBytes(torrent.totalLength)}
                            </Badge>
                            <Badge variant="outline" className="gap-1.5 font-mono text-xs text-green-600 border-green-600/30">
                                {formatBytes(torrent.downloadSpeed)}/s
                            </Badge>
                            <Badge variant="outline" className="gap-1.5 font-mono text-xs text-blue-600 border-blue-600/30">
                                {torrent.peers} peers
                            </Badge>
                        </div>
                    </div>
                    <CardAction className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="text-right">
                            <div className="text-2xl font-bold tabular-nums">
                                {torrent.progress.toFixed(1)}%
                            </div>
                            <CardDescription>completed</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-primary"
                                            onClick={() => onCopy(torrent.magnetUri)}
                                        >
                                            <Copy className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy Magnet Link</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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
                                        <AlertDialogAction onClick={() => onRemove(torrent.infoHash)}>
                                            Remove
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </CardAction>
                </div>
                <Progress value={torrent.progress} className="h-1.5 mt-2" />
            </CardHeader>

            <CardContent className="pt-0">
                <div className="space-y-1">
                    {torrent.files.map((file, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg group/file transition-colors"
                        >
                            <div className="flex-1 min-w-0 space-y-2 md:space-y-1">
                                <div className="text-sm font-medium truncate">{file.name}</div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatBytes(file.length)}</span>
                                    <span className="text-muted-foreground/50">•</span>
                                    <span className="tabular-nums">{file.progress.toFixed(1)}% ready</span>
                                </div>
                                <div className="flex gap-2 md:hidden pt-1 justify-end">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => copyStreamUrl(i)}
                                                disabled={!serverUrl}
                                            >
                                                <Copy className="size-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Copy Stream URL</TooltipContent>
                                    </Tooltip>
                                    <Button
                                        size="sm"
                                        onClick={() => window.location.href = `/watch?infoHash=${torrent.infoHash}&fileIndex=${i}`}
                                        className="gap-1.5"
                                    >
                                        <Play className="size-4" fill="currentColor" />
                                        Play
                                    </Button>
                                </div>
                            </div>
                            <div className="hidden md:flex gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => copyStreamUrl(i)}
                                            disabled={!serverUrl}
                                        >
                                            <Copy className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy Stream URL</TooltipContent>
                                </Tooltip>
                                <Button
                                    size="sm"
                                    onClick={() => window.location.href = `/watch?infoHash=${torrent.infoHash}&fileIndex=${i}`}
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
    );
}
