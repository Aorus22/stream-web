import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Trash2, FileVideo, Folder, Play, Download, Cloud } from "lucide-react";
import type { CachedFile } from "./types";
import { formatBytes } from "./utils";

type Props = {
    infoHash: string;
    files: CachedFile[];
    onDelete: (hash: string) => void;
    onCopy: (url: string) => void;
    onMoveToDrive: (options: { infoHash?: string, fileIndex?: number, downloadId?: number }) => void;
    serverUrl: string | null;
};

export default function CachedGroupCard({ infoHash, files, onDelete, onCopy, onMoveToDrive, serverUrl }: Props) {
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const copyStreamUrl = (fileIndex: number) => {
        if (!serverUrl) return;
        onCopy(`${serverUrl}/stream/${infoHash}/${fileIndex}`);
    };

    const downloadFile = (fileIndex: number) => {
        if (!serverUrl) return;
        window.open(`${serverUrl}/stream/${infoHash}/${fileIndex}?download=true`, '_blank');
    };

    return (
        <Card className="overflow-hidden group hover:border-primary/30 transition-all border-2">
            <CardHeader className="p-4 sm:p-5 bg-muted/20 border-b pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                            <Folder className="size-5 fill-current" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                            <CardTitle className="text-lg font-bold break-all whitespace-normal leading-tight" title={infoHash}>
                                {files[0]?.name.split('.')[0] || infoHash}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                                {files.length} Item{files.length !== 1 ? 's' : ''}
                                <span className="opacity-30">•</span>
                                {formatBytes(totalSize)}
                            </CardDescription>
                        </div>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 size-8">
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Library Item?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete all cached files for this content.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(infoHash)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    Delete Folder
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
                <div className="space-y-1">
                    {files.map((file, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-2.5 hover:bg-muted/50 rounded-lg group/file transition-colors"
                        >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <FileVideo className="size-4 text-muted-foreground group-hover/file:text-primary transition-colors flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold truncate group-hover/file:text-primary transition-colors">{file.name}</div>
                                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{formatBytes(file.size || 0)}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 opacity-0 group-hover/file:opacity-100"
                                            onClick={() => copyStreamUrl(file.fileIndex ?? 0)}
                                            disabled={!serverUrl}
                                        >
                                            <Copy className="size-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy Stream URL</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 opacity-0 group-hover/file:opacity-100"
                                            onClick={() => onMoveToDrive({ infoHash, fileIndex: file.fileIndex })}
                                        >
                                            <Cloud className="size-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Move to Drive</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 opacity-0 group-hover/file:opacity-100"
                                            onClick={() => downloadFile(file.fileIndex ?? 0)}
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
                                            variant="secondary"
                                            disabled={!file.canPlay || !file.downloadId}
                                            onClick={() => window.location.href = `/watch?directId=${file.downloadId}`}
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
                </div>
            </CardContent>
        </Card>
    );
}
