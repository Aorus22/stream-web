import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Settings, X } from "lucide-react";
import type { ReencodeJob } from "./Page";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
    job: ReencodeJob;
    onCancel?: () => void;
};

export default function ReencodeProgressCard({ job, onCancel }: Props) {
    const isCompleted = job.status === "completed";
    const isFailed = job.status === "failed";
    const isCanceled = job.status === "canceled";

    return (
        <Card className="overflow-hidden border-2 hover:border-primary/20 transition-all duration-300">
            <CardContent className="p-4 sm:p-5 bg-muted/20">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Settings className={cn("size-5", job.status === "processing" && "animate-spin")} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    "h-5 text-[10px] font-bold uppercase tracking-wider",
                                    isCompleted ? "bg-primary/20 text-primary" : 
                                    isFailed || isCanceled ? "bg-destructive/20 text-destructive" :
                                    "bg-primary text-primary-foreground animate-pulse"
                                )}>
                                    {job.status}
                                </Badge>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tabular-nums">
                                    {job.resolution} @ {job.bitrate}
                                </span>
                            </div>
                            <h4 className="font-bold break-all whitespace-normal leading-tight" title={job.filename}>
                                {job.filename}
                            </h4>
                            {job.progress.time && (
                                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
                                    Current Position: {job.progress.time}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-2">
                            {job.status === "processing" && onCancel && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="size-8 text-destructive hover:bg-destructive/10"
                                    onClick={onCancel}
                                >
                                    <X className="size-4" />
                                </Button>
                            )}
                            <div className="text-2xl font-black tracking-tighter tabular-nums text-primary">
                                {(job.progress?.percent || 0).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>
                {!isCompleted && !isFailed && !isCanceled && (
                    <Progress value={job.progress?.percent || 0} className="h-1.5 mt-4 bg-muted" />
                )}
            </CardContent>
        </Card>
    );
}
