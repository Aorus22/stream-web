import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, FileVideo, HardDrive } from "lucide-react";
import { useDownloadProgress } from "@/hooks/useDownloadProgress";
import type { DirectDownload } from "./types";
import { formatBytes } from "./utils";
import { cn } from "@/lib/utils";

type Props = {
    download: DirectDownload;
};

export default function DirectDownloadCard({ download }: Props) {
    const live = useDownloadProgress(download.id);
    const progress = live?.progress ?? download.progress ?? 0;
    const downloadedBytes = live?.downloadedBytes ?? download.downloadedBytes ?? 0;
    const totalBytes = live?.totalBytes ?? download.totalBytes ?? 0;
    const status = (live?.status ?? download.status) as DirectDownload["status"];

    const isCompleted = status === "completed" || status === "on_demand";

    return (
        <Card className="overflow-hidden border-2 hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-4 sm:p-5 bg-muted/20">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <FileVideo className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    "h-5 text-[10px] font-bold uppercase tracking-wider",
                                    isCompleted ? "bg-primary/20 text-primary" : "bg-primary text-primary-foreground animate-pulse"
                                )}>
                                    {status}
                                </Badge>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">
                                    ID: {download.id}
                                </span>
                            </div>
                            <h4 className="font-bold break-all whitespace-normal leading-tight" title={download.filename}>
                                {download.filename}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-muted-foreground">
                                <span className="flex items-center gap-1"><HardDrive className="size-3" /> {formatBytes(downloadedBytes)}</span>
                                <span className="opacity-30">/</span>
                                <span>{formatBytes(totalBytes)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-2xl font-black tracking-tighter tabular-nums text-primary">
                            {progress.toFixed(1)}%
                        </div>
                        {isCompleted && (
                            <Button
                                size="sm"
                                onClick={() => window.location.href = `/watch?directId=${download.id}`}
                                className="h-8 gap-2 px-4 font-bold shadow-lg shadow-primary/20"
                            >
                                <Play className="size-3 fill-current" />
                                Play
                            </Button>
                        )}
                    </div>
                </div>
                {!isCompleted && (
                    <Progress value={progress} className="h-1.5 mt-4 bg-muted" />
                )}
            </CardContent>
        </Card>
    );
}
