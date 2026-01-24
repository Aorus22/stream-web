import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
    ArrowLeft,
    Play,
    Heart,
    Share2,
    Plus,
    Star,
    Clock,
    Calendar,
    Tv,
    ChevronLeft,
    ChevronRight,
    Search,
    Loader2,
    ExternalLink,
    Download,
    HardDrive,
    Users,
    Check,
    Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.VITE_API_BASE;

type TrailerInfo = {
    source: string;
    type: string;
};

type EpisodeInfo = {
    id: string;
    title: string;
    season: number;
    episode: number;
    released: string;
    thumbnail: string;
    overview: string;
};

type MediaInfo = {
    id: string; // IMDb ID
    title: string;
    overview: string;
    poster: string;
    backdrop: string;
    logo: string;
    releaseInfo: string;
    year: string;
    rating: string;
    runtime: string;
    genres: string[];
    cast: string[];
    director: string[];
    writer: string[];
    mediaType: "movie" | "series";
    trailers: TrailerInfo[];
    episodes: EpisodeInfo[];
};

type TorrentResult = {
    name: string;
    magnet: string;
    size: string;
    seeders: string;
    leechers: string;
    category: string;
    uploadedBy: string;
    dateUploaded: string;
};

function formatDate(dateStr: string): string {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
}

export function MediaDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Get type from URL path (e.g., /movie/tt123 -> "movie", /series/tt123 -> "series")
    const type = location.pathname.split('/')[1]; // "movie", "series", or "tv"

    const [detail, setDetail] = useState<MediaInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // TV specific state
    const [selectedSeason, setSelectedSeason] = useState(1);
    const [episodeSearch, setEpisodeSearch] = useState("");

    // Torrent panel state
    const [showTorrentPanel, setShowTorrentPanel] = useState(false);
    const [torrentResults, setTorrentResults] = useState<TorrentResult[]>([]);
    const [searchingTorrents, setSearchingTorrents] = useState(false);
    const [torrentQuery, setTorrentQuery] = useState("");
    const [selectedEpisode, setSelectedEpisode] = useState<EpisodeInfo | null>(null);
    const [providers, setProviders] = useState<string[]>([]);
    const [selectedProvider, setSelectedProvider] = useState("");
    const [addingTorrent, setAddingTorrent] = useState<string | null>(null);
    const [copiedMagnet, setCopiedMagnet] = useState<string | null>(null);

    // Fetch providers on mount
    useEffect(() => {
        fetch(`${API_BASE}/api/providers`)
            .then(res => res.json())
            .then(data => {
                setProviders(data || []);
                if (data && data.length > 0) {
                    const saved = localStorage.getItem('selectedProvider');
                    setSelectedProvider(saved && data.includes(saved) ? saved : data[0]);
                }
            })
            .catch(console.error);
    }, []);

    // Fetch media detail
    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            setError("");
            
            // Determine endpoint based on type
            const mediaType = type === "series" || type === "tv" ? "series" : "movie";
            
            console.log("Fetching:", `${API_BASE}/api/catalog/${mediaType}/${id}`);
            
            try {
                const res = await fetch(`${API_BASE}/api/catalog/${mediaType}/${id}`);
                if (!res.ok) throw new Error(`Failed to fetch details: ${res.status}`);
                const data: MediaInfo = await res.json();
                console.log("Received data:", data);
                setDetail(data);
            } catch (err) {
                setError("Failed to load media details");
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDetail();
        }
    }, [type, id]);

    // Get unique seasons from episodes
    const seasons = useMemo(() => {
        if (!detail?.episodes) return [];
        const seasonSet = new Set(detail.episodes.map(ep => ep.season));
        return Array.from(seasonSet).filter(s => s > 0).sort((a, b) => a - b);
    }, [detail?.episodes]);

    // Set default season when detail loads
    useEffect(() => {
        if (seasons.length > 0 && !seasons.includes(selectedSeason)) {
            setSelectedSeason(seasons[0]);
        }
    }, [seasons, selectedSeason]);

    // Filter episodes by selected season and search
    const filteredEpisodes = useMemo(() => {
        if (!detail?.episodes) return [];
        return detail.episodes
            .filter(ep => ep.season === selectedSeason)
            .filter(ep => 
                ep.title.toLowerCase().includes(episodeSearch.toLowerCase()) ||
                ep.overview?.toLowerCase().includes(episodeSearch.toLowerCase())
            )
            .sort((a, b) => a.episode - b.episode);
    }, [detail?.episodes, selectedSeason, episodeSearch]);

    // Search torrents for this media
    const searchTorrents = async (query?: string, episode?: EpisodeInfo) => {
        if (!detail || !selectedProvider) return;
        
        const searchQuery = query || (detail.mediaType === "series" 
            ? `${detail.title} S${String(selectedSeason).padStart(2, '0')}` 
            : `${detail.title} ${detail.year || ""}`);
        
        setTorrentQuery(searchQuery);
        setSelectedEpisode(episode || null);
        setShowTorrentPanel(true);
        setSearchingTorrents(true);
        setTorrentResults([]);

        try {
            const res = await fetch(
                `${API_BASE}/api/search?provider=${selectedProvider}&query=${encodeURIComponent(searchQuery.trim())}`
            );
            const data = await res.json();
            // Ensure data is an array
            setTorrentResults(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to search torrents:", err);
            setTorrentResults([]);
        } finally {
            setSearchingTorrents(false);
        }
    };

    // Add torrent to client
    const addTorrent = async (magnet: string) => {
        setAddingTorrent(magnet);
        try {
            const res = await fetch(`${API_BASE}/api/add`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `magnet=${encodeURIComponent(magnet)}`
            });
            if (!res.ok) throw new Error("Failed to add torrent");
            // Navigate to dashboard to see the torrent
            navigate("/dashboard");
        } catch (err) {
            console.error("Failed to add torrent:", err);
        } finally {
            setAddingTorrent(null);
        }
    };

    // Copy magnet link
    const copyMagnet = (magnet: string) => {
        navigator.clipboard.writeText(magnet);
        setCopiedMagnet(magnet);
        setTimeout(() => setCopiedMagnet(null), 2000);
    };

    // Open trailer
    const openTrailer = () => {
        if (!detail?.trailers?.length) return;
        const trailer = detail.trailers.find(t => t.type === "Trailer") || detail.trailers[0];
        if (trailer?.source) {
            window.open(`https://www.youtube.com/watch?v=${trailer.source}`, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="relative h-[70vh]">
                    <Skeleton className="absolute inset-0" />
                </div>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-destructive">{error || "Not found"}</p>
                    <Button onClick={() => navigate(-1)}>Go Back</Button>
                </div>
            </div>
        );
    }

    const isSeries = detail.mediaType === "series";

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section with Backdrop */}
            <div className="relative min-h-[85vh]">
                {/* Background Image with Blur */}
                <div className="absolute inset-0">
                    {detail.backdrop ? (
                        <img
                            src={detail.backdrop}
                            alt={detail.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
                    )}
                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                </div>

                {/* Navigation */}
                <div className="absolute top-0 left-0 right-0 z-20 p-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="bg-background/20 backdrop-blur-sm hover:bg-background/40"
                        >
                            <ArrowLeft className="size-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="bg-background/20 backdrop-blur-sm hover:bg-background/40"
                            >
                                <Heart className="size-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="bg-background/20 backdrop-blur-sm hover:bg-background/40"
                            >
                                <Share2 className="size-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 pt-24 px-4 pb-8">
                    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
                        {/* Left Side - Info */}
                        <div className="flex-1 space-y-6">
                            {/* Logo or Title */}
                            {detail.logo ? (
                                <img 
                                    src={detail.logo} 
                                    alt={detail.title}
                                    className="max-w-md max-h-32 object-contain"
                                />
                            ) : (
                                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
                                    {detail.title}
                                </h1>
                            )}

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-4 text-white/90">
                                {detail.runtime && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="size-4" />
                                        <span>{detail.runtime}</span>
                                    </div>
                                )}
                                {(detail.year || detail.releaseInfo) && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="size-4" />
                                        <span>{detail.year || detail.releaseInfo}</span>
                                    </div>
                                )}
                                {detail.rating && (
                                    <div className="flex items-center gap-1.5">
                                        <Badge
                                            variant="secondary"
                                            className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                        >
                                            <Star className="size-3.5 mr-1 fill-yellow-400" />
                                            {detail.rating}
                                        </Badge>
                                        <span className="text-white/60 text-sm">IMDb</span>
                                    </div>
                                )}
                                {isSeries && seasons.length > 0 && (
                                    <Badge variant="outline" className="border-white/30 text-white/90">
                                        {seasons.length} Season{seasons.length > 1 ? "s" : ""}
                                    </Badge>
                                )}
                            </div>

                            {/* Genres */}
                            {detail.genres && detail.genres.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs uppercase tracking-wider text-white/50">
                                        Genres
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.genres.map((genre, i) => (
                                            <Badge
                                                key={i}
                                                variant="outline"
                                                className="border-white/20 text-white/80 hover:bg-white/10"
                                            >
                                                {genre}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Cast */}
                            {detail.cast && detail.cast.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs uppercase tracking-wider text-white/50">
                                        Cast
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.cast.slice(0, 6).map((member, i) => (
                                            <Badge
                                                key={i}
                                                variant="secondary"
                                                className="bg-white/10 text-white/90 hover:bg-white/20"
                                            >
                                                {member}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Summary */}
                            {detail.overview && (
                                <div className="space-y-2">
                                    <h3 className="text-xs uppercase tracking-wider text-white/50">
                                        Summary
                                    </h3>
                                    <p className="text-white/80 leading-relaxed max-w-2xl">
                                        {detail.overview}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                >
                                    <Plus className="size-4" />
                                    Add to Library
                                </Button>
                                {detail.trailers && detail.trailers.length > 0 && (
                                    <Button
                                        variant="outline"
                                        className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                        onClick={openTrailer}
                                    >
                                        <Play className="size-4" />
                                        Trailer
                                    </Button>
                                )}
                                <Button
                                    onClick={() => searchTorrents()}
                                    disabled={searchingTorrents || !selectedProvider}
                                    className="gap-2 bg-primary hover:bg-primary/90"
                                >
                                    {searchingTorrents ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        <Search className="size-4" />
                                    )}
                                    Find Torrents
                                </Button>
                                {detail.id && (
                                    <Button
                                        variant="outline"
                                        className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                                        onClick={() => window.open(`https://www.imdb.com/title/${detail.id}`, '_blank')}
                                    >
                                        <ExternalLink className="size-4" />
                                        IMDb
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Right Side - Episodes Panel (TV Only) */}
                        {isSeries && seasons.length > 0 && (
                            <div className="lg:w-[400px] bg-background/80 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
                                {/* Season Selector */}
                                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        disabled={seasons.indexOf(selectedSeason) <= 0}
                                        onClick={() => {
                                            const idx = seasons.indexOf(selectedSeason);
                                            if (idx > 0) setSelectedSeason(seasons[idx - 1]);
                                        }}
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>

                                    <Select
                                        value={String(selectedSeason)}
                                        onValueChange={(v) => setSelectedSeason(Number(v))}
                                    >
                                        <SelectTrigger className="flex-1 bg-transparent border-white/20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {seasons.map((season) => (
                                                <SelectItem
                                                    key={season}
                                                    value={String(season)}
                                                >
                                                    Season {season}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        disabled={seasons.indexOf(selectedSeason) >= seasons.length - 1}
                                        onClick={() => {
                                            const idx = seasons.indexOf(selectedSeason);
                                            if (idx < seasons.length - 1) setSelectedSeason(seasons[idx + 1]);
                                        }}
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>

                                {/* Episode Search */}
                                <div className="p-4 border-b border-white/10">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                        <Input
                                            placeholder="search videos"
                                            value={episodeSearch}
                                            onChange={(e) => setEpisodeSearch(e.target.value)}
                                            className="pl-9 bg-transparent border-white/20"
                                        />
                                    </div>
                                </div>

                                {/* Episodes List */}
                                <ScrollArea className="h-[400px]">
                                    <div className="p-2 space-y-1">
                                        {filteredEpisodes.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground">
                                                No episodes found
                                            </div>
                                        ) : (
                                            filteredEpisodes.map((episode) => (
                                                <div
                                                    key={episode.id}
                                                    className="flex gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                                                    onClick={() => {
                                                        const query = `${detail.title} S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')}`;
                                                        searchTorrents(query, episode);
                                                    }}
                                                >
                                                    {/* Episode Thumbnail */}
                                                    <div className="relative w-24 h-14 rounded overflow-hidden bg-muted flex-shrink-0">
                                                        {episode.thumbnail ? (
                                                            <img
                                                                src={episode.thumbnail}
                                                                alt={episode.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Tv className="size-6 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        {/* Play Overlay */}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Play className="size-6 text-white fill-white" />
                                                        </div>
                                                    </div>

                                                    {/* Episode Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-medium truncate">
                                                            {episode.episode}. {episode.title}
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(episode.released)}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Torrent Panel - Slide in from right */}
            {showTorrentPanel && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowTorrentPanel(false)}
                    />
                    
                    {/* Panel */}
                    <div className="relative w-full max-w-md bg-background/95 backdrop-blur-md border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 flex-shrink-0"
                                    onClick={() => setShowTorrentPanel(false)}
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
                            <Select value={selectedProvider} onValueChange={(v) => {
                                setSelectedProvider(v);
                                localStorage.setItem('selectedProvider', v);
                            }}>
                                <SelectTrigger className="w-[120px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search Bar */}
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

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto h-[calc(100vh-180px)] w-full">
                            <div className="flex flex-col gap-3 p-4 w-full">
                                {searchingTorrents ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Loader2 className="size-8 animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground">Searching torrents...</p>
                                    </div>
                                ) : !Array.isArray(torrentResults) || torrentResults.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Search className="size-12 mx-auto mb-4 opacity-20" />
                                        <p>No torrents found</p>
                                        <p className="text-xs mt-1">Try a different search query</p>
                                    </div>
                                ) : (
                                    torrentResults.map((torrent, i) => (
                                        <Card key={i} className="p-4 space-y-3 hover:bg-muted/50 transition-colors w-full relative">
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
                                                            <Check className="size-3" />
                                                        ) : (
                                                            <Copy className="size-3" />
                                                        )}
                                                        Copy
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
            )}

            {/* Cast Section (for movies or additional cast display) */}
            {detail.cast && detail.cast.length > 6 && (
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <h2 className="text-xl font-semibold mb-4">Full Cast</h2>
                    <ScrollArea className="w-full">
                        <div className="flex gap-4 pb-4">
                            {detail.cast.map((member, i) => (
                                <div
                                    key={i}
                                    className="w-[100px] flex-shrink-0 text-center"
                                >
                                    <div className="w-16 h-16 mx-auto rounded-full overflow-hidden bg-muted mb-2 flex items-center justify-center">
                                        <span className="text-xl text-muted-foreground">
                                            {member.charAt(0)}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium truncate">{member}</p>
                                </div>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </div>
            )}

            {/* Director & Writer */}
            {(detail.director?.length > 0 || detail.writer?.length > 0) && (
                <div className="max-w-7xl mx-auto px-4 py-8 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {detail.director && detail.director.length > 0 && (
                            <div>
                                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                                    Director
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {detail.director.map((d, i) => (
                                        <Badge key={i} variant="outline">{d}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        {detail.writer && detail.writer.length > 0 && (
                            <div>
                                <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">
                                    Writer
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {detail.writer.map((w, i) => (
                                        <Badge key={i} variant="outline">{w}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MediaDetail;
