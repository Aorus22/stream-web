import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCw } from "lucide-react";

type Props = {
    infoHash?: string;
    fileIndex?: number;
    downloadId?: number;
    onReencode: (options: { infoHash?: string, fileIndex?: number, downloadId?: number, resolution: string, bitrate: string }) => Promise<boolean>;
    trigger?: React.ReactNode;
};

export default function ReencodeDialog({ infoHash, fileIndex, downloadId, onReencode, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resolution, setResolution] = useState("1280x720");
    const [bitrate, setBitrate] = useState("2000k");

    const handleStart = async () => {
        setLoading(true);
        const success = await onReencode({ infoHash, fileIndex, downloadId, resolution, bitrate });
        setLoading(false);
        if (success) {
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="size-8">
                        <RotateCw className="size-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Reencode to MP4</DialogTitle>
                    <DialogDescription>
                        Convert this video to a compatible MP4 format with custom quality.
                        The result will appear in your Library.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="resolution" className="text-right">
                            Resolution
                        </Label>
                        <Select value={resolution} onValueChange={setResolution}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select resolution" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1920x1080">1080p (Full HD)</SelectItem>
                                <SelectItem value="1280x720">720p (HD)</SelectItem>
                                <SelectItem value="854x480">480p (SD)</SelectItem>
                                <SelectItem value="640x360">360p</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="bitrate" className="text-right">
                            Bitrate
                        </Label>
                        <Select value={bitrate} onValueChange={setBitrate}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select bitrate" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="4000k">4000 kbps (High)</SelectItem>
                                <SelectItem value="2000k">2000 kbps (Medium)</SelectItem>
                                <SelectItem value="1000k">1000 kbps (Low)</SelectItem>
                                <SelectItem value="500k">500 kbps (Very Low)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleStart} disabled={loading}>
                        {loading ? <RotateCw className="size-4 animate-spin mr-2" /> : <RotateCw className="size-4 mr-2" />}
                        Start Reencode
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
