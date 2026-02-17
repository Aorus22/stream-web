import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, ChevronLeft, HardDrive, Users, Copy, Download, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MediaInfo, TorrentResult, EpisodeInfo } from "./types";

type TorrentPanelProps = {
    detail: MediaInfo;
    show: boolean;
    onClose: () => void;
    providers: string[];
    selectedProvider: string;
    onProviderChange: (value: string) => void;
    torrentQuery: string;
    setTorrentQuery: (value: string) => void;
    searchTorrents: (query?: string, episode?: EpisodeInfo) => void;
    searchingTorrents: boolean;
    torrentResults: TorrentResult[];
    addingTorrent: string | null;
    copyMagnet: (magnet: string) => void;
    addTorrent: (magnet: string) => void;
    copiedMagnet: string | null;
    selectedEpisode?: EpisodeInfo | null;
};

export default function TorrentPanel({
    detail,
    show,
    onClose,
    providers,
    selectedProvider,
    onProviderChange,
    torrentQuery,
    setTorrentQuery,
    searchTorrents,
    searchingTorrents,
    torrentResults,
    addingTorrent,
    addTorrent,
    copyMagnet,
    copiedMagnet,
    selectedEpisode,
}: TorrentPanelProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-background/95 backdrop-blur-md border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 flex-shrink-0"
                            onClick={onClose}
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <div className="min-w-0">
                            <h3 className="font-semibold truncate">
                                {selectedEpisode
                                    ? `S${selectedEpisode.season}E${selectedEpisode.episode} ${selectedEpisode.title}`
                                    : detail.title
                                }
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">{torrentQuery}</p>
                        </div>
                    </div>
                    <Select value={selectedProvider || ""} onValueChange={(v) => onProviderChange(v)}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Choose" />
                        </SelectTrigger>
                        <SelectContent>
                            {providers.map((p) => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="p-4 border-b border-white/10">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        searchTorrents(torrentQuery);
                    }} className="flex gap-2">
                        <Input
                            value={torrentQuery}
                            onChange={(e) => setTorrentQuery(e.target.value)}
                            placeholder="Search query..."
                            className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={searchingTorrents}>
                            {searchingTorrents ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Search className="size-4" />
                            )}
                        </Button>
                    </form>
                </div>

                <div className="flex-1 overflow-y-auto h-[calc(100vh-180px)] w-full">
                    <div className="flex flex-col gap-3 p-4 w-full">
                        {!selectedProvider ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Search className="size-12 mx-auto mb-4 opacity-20" />
                                <p>Select a provider first</p>
                                <p className="text-xs mt-1">Choose a torrent provider from the dropdown above</p>
                            </div>
                        ) : searchingTorrents ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <Loader2 className="size-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Searching torrents...</p>
                            </div>
                        ) : torrentResults.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Search className="size-12 mx-auto mb-4 opacity-20" />
                                <p>No torrents found</p>
                                <p className="text-xs mt-1">Try a different search query</p>
                            </div>
                        ) : (
                            torrentResults.map((torrent, index) => (
                                <Card key={index} className="p-4 space-y-3 hover:bg-muted/50 transition-colors w-full relative">
                                    <h4 className="text-sm font-medium leading-normal line-clamp-2 break-words pr-2">
                                        {torrent.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="text-xs gap-1">
                                            <HardDrive className="size-3" />
                                            {torrent.size}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-600/30">
                                            <Users className="size-3" />
                                            {torrent.seeders}
                                        </Badge>
                                        {torrent.category && (
                                            <Badge variant="secondary" className="text-xs">
                                                {torrent.category}
                                            </Badge>
                                        )}
                                    </div>
                                    {torrent.magnet && (
                                        <div className="flex gap-2 pt-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 gap-1.5"
                                                onClick={() => copyMagnet(torrent.magnet)}
                                            >
                                                {copiedMagnet === torrent.magnet ? (
                                                    <>
                                                        <Check className="size-3" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="size-3" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 gap-1.5"
                                                onClick={() => addTorrent(torrent.magnet)}
                                                disabled={addingTorrent === torrent.magnet}
                                            >
                                                {addingTorrent === torrent.magnet ? (
                                                    <Loader2 className="size-3 animate-spin" />
                                                ) : (
                                                    <Download className="size-3" />
                                                )}
                                                Add
                                            </Button>
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
