import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Trash2, FileVideo } from "lucide-react";
import type { CachedFile } from "./types";
import { formatBytes } from "./utils";

type Props = {
    infoHash: string;
    files: CachedFile[];
    onDelete: (hash: string) => void;
    onCopy: (url: string) => void;
    serverUrl: string | null;
};

export default function CachedGroupCard({ infoHash, files, onDelete, onCopy, serverUrl }: Props) {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const copyStreamUrl = (fileIndex: number) => {
        if (!serverUrl) return;
        onCopy(`${serverUrl}/stream/${infoHash}/${fileIndex}`);
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                        <CardTitle className="text-base font-mono truncate" title={infoHash}>
                            {infoHash.substring(0, 16)}...
                        </CardTitle>
                        <CardDescription>
                            {files.length} video{files.length !== 1 ? 's' : ''} • {formatBytes(totalSize)}
                        </CardDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Cached Files?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all cached files for this torrent. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(infoHash)}>
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="space-y-1">
                    {files.map((file, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1 md:items-start">
                                <FileVideo className="size-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1 space-y-2 md:space-y-0">
                                    <div className="text-sm font-medium truncate">{file.name}</div>
                                    <div className="text-xs text-muted-foreground">{formatBytes(file.size || 0)}</div>
                                </div>
                            </div>
                            <div className="hidden md:flex gap-2">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => copyStreamUrl(file.fileIndex ?? 0)}
                                            disabled={!serverUrl}
                                        >
                                            <Copy className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy Stream URL</TooltipContent>
                                </Tooltip>
                                <Button
                                    size="sm"
                                    disabled={!file.canPlay || !file.downloadId}
                                    onClick={() => window.location.href = `/watch?directId=${file.downloadId}`}
                                    className="gap-1.5"
                                >
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
