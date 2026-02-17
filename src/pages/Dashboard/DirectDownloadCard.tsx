import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play } from "lucide-react";
import { useDownloadProgress } from "@/hooks/useDownloadProgress";
import type { DirectDownload } from "./types";
import { formatBytes } from "./utils";

type Props = {
    download: DirectDownload;
};

export default function DirectDownloadCard({ download }: Props) {
    const live = useDownloadProgress(download.id);
    const progress = live?.progress ?? download.progress ?? 0;
    const downloadedBytes = live?.downloadedBytes ?? download.downloadedBytes ?? 0;
    const totalBytes = live?.totalBytes ?? download.totalBytes ?? 0;
    const status = (live?.status ?? download.status) as DirectDownload["status"];

    return (
        <Card>
            <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-medium truncate">{download.filename}</div>
                        <div className="text-xs text-muted-foreground truncate">{status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                        {(status === "completed" || status === "on_demand") && (
                            <Button
                                size="sm"
                                onClick={() => window.location.href = `/watch?directId=${download.id}`}
                                className="gap-1.5"
                            >
                                <Play className="size-4" fill="currentColor" />
                                Play
                            </Button>
                        )}
                    </div>
                </div>
                <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}</span>
                        <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} />
                </div>
            </CardContent>
        </Card>
    );
}
