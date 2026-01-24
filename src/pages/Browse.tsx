import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Film, Tv, TrendingUp, Star, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE;

// Available genres from Cinemeta
const GENRES = [
    "Action",
    "Adventure", 
    "Animation",
    "Biography",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Music",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Sport",
    "Thriller",
    "War",
    "Western",
];

type MediaItem = {
    id: string; // IMDb ID (tt1234567)
    title: string;
    overview: string;
    poster: string;
    backdrop: string;
    releaseInfo: string;
    year: string;
    rating: string;
    runtime: string;
    mediaType: "movie" | "series";
    genres: string[];
};

type CatalogResponse = {
    results: MediaItem[];
    hasMore: boolean;
};

type Category = "popular" | "top-rated" | "genre";

function MediaCard({ item }: { item: MediaItem }) {
    const detailPath = item.mediaType === "series" ? `/series/${item.id}` : `/movie/${item.id}`;

    return (
        <Link to={detailPath}>
            <Card className="group relative overflow-hidden border-0 bg-transparent cursor-pointer transition-transform hover:scale-105">
                <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-muted">
                    {item.poster ? (
                        <img
                            src={item.poster}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Film className="size-12 text-muted-foreground" />
                        </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <div className="flex items-center gap-2 text-white/90 text-xs mb-1">
                            {item.rating && (
                                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs px-1.5 py-0">
                                    <Star className="size-3 mr-0.5 fill-yellow-400" />
                                    {item.rating}
                                </Badge>
                            )}
                            {item.year && <span>{item.year}</span>}
                        </div>
                        <h3 className="text-white font-medium text-sm line-clamp-2">{item.title}</h3>
                    </div>
                    {/* Media Type Badge */}
                    <div className="absolute top-2 right-2">
                        <Badge
                            variant="secondary"
                            className={cn(
                                "text-xs px-1.5 py-0.5",
                                item.mediaType === "series"
                                    ? "bg-blue-500/80 text-white"
                                    : "bg-purple-500/80 text-white"
                            )}
                        >
                            {item.mediaType === "series" ? "TV" : "Film"}
                        </Badge>
                    </div>
                </div>
                <div className="mt-2 space-y-0.5 group-hover:opacity-0 transition-opacity">
                    <h3 className="font-medium text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.year || item.releaseInfo}</p>
                </div>
            </Card>
        </Link>
    );
}

function MediaRow({ title, items, loading, icon: Icon }: {
    title: string;
    items: MediaItem[];
    loading: boolean;
    icon?: React.ElementType;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="size-5 text-primary" />}
                <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-4 pb-4">
                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="w-[150px] flex-shrink-0">
                                <Skeleton className="aspect-[2/3] rounded-lg" />
                                <Skeleton className="h-4 w-3/4 mt-2" />
                                <Skeleton className="h-3 w-1/2 mt-1" />
                            </div>
                        ))
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="w-[150px] flex-shrink-0">
                                <MediaCard item={item} />
                            </div>
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

function MediaGrid({ items, loading }: { items: MediaItem[]; loading: boolean }) {
    if (loading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="aspect-[2/3] rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                        <Skeleton className="h-3 w-1/2 mt-1" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
                <MediaCard key={item.id} item={item} />
            ))}
        </div>
    );
}

export function Browse() {
    const [activeTab, setActiveTab] = useState<"movies" | "series">("movies");
    const [category, setCategory] = useState<Category>("popular");
    const [selectedGenre, setSelectedGenre] = useState<string>("Animation");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [popularMovies, setPopularMovies] = useState<MediaItem[]>([]);
    const [topRatedMovies, setTopRatedMovies] = useState<MediaItem[]>([]);
    const [popularSeries, setPopularSeries] = useState<MediaItem[]>([]);
    const [topRatedSeries, setTopRatedSeries] = useState<MediaItem[]>([]);

    const [categoryItems, setCategoryItems] = useState<MediaItem[]>([]);
    const [categorySkip, setCategorySkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [categoryLoading, setCategoryLoading] = useState(false);

    const [loadingMovies, setLoadingMovies] = useState(true);
    const [loadingSeries, setLoadingSeries] = useState(true);

    // Fetch initial data for home view
    useEffect(() => {
        const fetchMovies = async () => {
            setLoadingMovies(true);
            try {
                const [popular, topRated] = await Promise.all([
                    fetch(`${API_BASE}/api/catalog/movies`).then(r => r.json()),
                    fetch(`${API_BASE}/api/catalog/movies/top-rated`).then(r => r.json()),
                ]);
                setPopularMovies(popular.results || []);
                setTopRatedMovies(topRated.results || []);
            } catch (err) {
                console.error("Failed to fetch movies:", err);
            } finally {
                setLoadingMovies(false);
            }
        };

        const fetchSeries = async () => {
            setLoadingSeries(true);
            try {
                const [popular, topRated] = await Promise.all([
                    fetch(`${API_BASE}/api/catalog/series`).then(r => r.json()),
                    fetch(`${API_BASE}/api/catalog/series/top-rated`).then(r => r.json()),
                ]);
                setPopularSeries(popular.results || []);
                setTopRatedSeries(topRated.results || []);
            } catch (err) {
                console.error("Failed to fetch series:", err);
            } finally {
                setLoadingSeries(false);
            }
        };

        fetchMovies();
        fetchSeries();
    }, []);

    // Fetch category items when category changes
    useEffect(() => {
        const fetchCategory = async () => {
            setCategoryLoading(true);
            const mediaType = activeTab;
            
            let url: string;
            if (category === "genre") {
                // Use selected genre
                url = `${API_BASE}/api/catalog/${mediaType}/genre/${selectedGenre}?skip=${categorySkip}`;
            } else if (category === "top-rated") {
                url = `${API_BASE}/api/catalog/${mediaType}/top-rated?skip=${categorySkip}`;
            } else {
                url = `${API_BASE}/api/catalog/${mediaType}?skip=${categorySkip}`;
            }
                
            try {
                const res = await fetch(url);
                const data: CatalogResponse = await res.json();
                setCategoryItems(data.results || []);
                setHasMore(data.hasMore);
            } catch (err) {
                console.error("Failed to fetch category:", err);
            } finally {
                setCategoryLoading(false);
            }
        };

        fetchCategory();
    }, [category, activeTab, categorySkip, selectedGenre]);

    // Re-run search when activeTab changes
    useEffect(() => {
        if (hasSearched && searchQuery) {
            const performSearch = async () => {
                setIsSearching(true);
                setSearchResults([]);
                try {
                    const mediaType = activeTab;
                    const res = await fetch(
                        `${API_BASE}/api/catalog/${mediaType}/search?q=${encodeURIComponent(searchQuery)}`
                    );
                    const data: CatalogResponse = await res.json();
                    setSearchResults(data.results || []);
                } catch (err) {
                    console.error("Failed to search:", err);
                } finally {
                    setIsSearching(false);
                }
            };
            performSearch();
        }
    }, [activeTab]);

    // Search handler
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setSearchResults([]);
        try {
            const mediaType = activeTab;
            console.log("Searching:", `${API_BASE}/api/catalog/${mediaType}/search?q=${encodeURIComponent(searchQuery)}`);
            const res = await fetch(
                `${API_BASE}/api/catalog/${mediaType}/search?q=${encodeURIComponent(searchQuery)}`
            );
            const data: CatalogResponse = await res.json();
            console.log("Search results:", data);
            setSearchResults(data.results || []);
        } catch (err) {
            console.error("Failed to search:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery("");
        setSearchResults([]);
        setHasSearched(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-4">
                    {/* Search Bar - Centered like Stremio */}
                    <form onSubmit={handleSearch} className="w-full max-w-xl">
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search movies, TV shows..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-10 h-10 bg-muted/50 border-0 rounded-full"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <span className="sr-only">Clear</span>
                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
                <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "movies" | "series"); setCategorySkip(0); }}>
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <TabsList className="bg-muted/50">
                            <TabsTrigger value="movies" className="gap-2">
                                <Film className="size-4" />
                                Movies
                            </TabsTrigger>
                            <TabsTrigger value="series" className="gap-2">
                                <Tv className="size-4" />
                                TV Series
                            </TabsTrigger>
                        </TabsList>

                        {/* Category Filter - Only show when not searching */}
                        {!searchQuery && !hasSearched && (
                            <div className="flex gap-2 flex-wrap items-center">
                                <Button
                                    variant={category === "popular" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => { setCategory("popular"); setCategorySkip(0); }}
                                    className="gap-1.5"
                                >
                                    <TrendingUp className="size-4" />
                                    Popular
                                </Button>
                                <Button
                                    variant={category === "top-rated" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => { setCategory("top-rated"); setCategorySkip(0); }}
                                    className="gap-1.5"
                                >
                                    <Star className="size-4 fill-current" />
                                    Top Rated
                                </Button>
                                
                                {/* Genre Dropdown */}
                                <div className="flex items-center gap-1">
                                    <Select 
                                        value={selectedGenre} 
                                        onValueChange={(value) => {
                                            setSelectedGenre(value);
                                            setCategory("genre");
                                            setCategorySkip(0);
                                        }}
                                    >
                                        <SelectTrigger className={cn(
                                            "w-[140px] h-8",
                                            category === "genre" ? "border-primary" : ""
                                        )}>
                                            <Filter className="size-4 mr-1" />
                                            <SelectValue placeholder="Genre" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GENRES.map((genre) => (
                                                <SelectItem key={genre} value={genre}>
                                                    {genre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Search Results Header */}
                    {(searchQuery || hasSearched) && (
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">
                                {isSearching ? "Searching..." : `Search results for "${searchQuery}"`}
                            </h2>
                            <Button variant="ghost" size="sm" onClick={clearSearch}>
                                Clear
                            </Button>
                        </div>
                    )}

                    <TabsContent value="movies" className="space-y-8">
                        {(searchQuery || hasSearched) ? (
                            /* Search Results Grid */
                            isSearching ? (
                                <MediaGrid items={[]} loading={true} />
                            ) : searchResults.length > 0 ? (
                                <MediaGrid items={searchResults} loading={false} />
                            ) : hasSearched ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No results found for "{searchQuery}" in Movies</p>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>Press Enter to search</p>
                                </div>
                            )
                        ) : (
                            /* Browse Content */
                            <>
                                {/* Featured Grid */}
                                <MediaGrid items={categoryItems} loading={categoryLoading} />

                                {/* Pagination */}
                                <div className="flex items-center justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={categorySkip <= 0}
                                        onClick={() => setCategorySkip(s => Math.max(0, s - 20))}
                                    >
                                        <ChevronLeft className="size-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {Math.floor(categorySkip / 20) + 1}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!hasMore}
                                        onClick={() => setCategorySkip(s => s + 20)}
                                    >
                                        Next
                                        <ChevronRight className="size-4 ml-1" />
                                    </Button>
                                </div>

                                {/* Horizontal Scrolling Rows */}
                                <MediaRow
                                    title="Popular Movies"
                                    items={popularMovies}
                                    loading={loadingMovies}
                                    icon={TrendingUp}
                                />
                                <MediaRow
                                    title="Top Rated Movies"
                                    items={topRatedMovies}
                                    loading={loadingMovies}
                                    icon={Star}
                                />
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="series" className="space-y-8">
                        {(searchQuery || hasSearched) ? (
                            /* Search Results Grid */
                            isSearching ? (
                                <MediaGrid items={[]} loading={true} />
                            ) : searchResults.length > 0 ? (
                                <MediaGrid items={searchResults} loading={false} />
                            ) : hasSearched ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No results found for "{searchQuery}" in TV Series</p>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>Press Enter to search</p>
                                </div>
                            )
                        ) : (
                            /* Browse Content */
                            <>
                                {/* Featured Grid */}
                                <MediaGrid items={categoryItems} loading={categoryLoading} />

                                {/* Pagination */}
                                <div className="flex items-center justify-center gap-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={categorySkip <= 0}
                                        onClick={() => setCategorySkip(s => Math.max(0, s - 20))}
                                    >
                                        <ChevronLeft className="size-4 mr-1" />
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {Math.floor(categorySkip / 20) + 1}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!hasMore}
                                        onClick={() => setCategorySkip(s => s + 20)}
                                    >
                                        Next
                                        <ChevronRight className="size-4 ml-1" />
                                    </Button>
                                </div>

                                {/* Horizontal Scrolling Rows */}
                                <MediaRow
                                    title="Popular TV Series"
                                    items={popularSeries}
                                    loading={loadingSeries}
                                    icon={TrendingUp}
                                />
                                <MediaRow
                                    title="Top Rated TV Series"
                                    items={topRatedSeries}
                                    loading={loadingSeries}
                                    icon={Star}
                                />
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

export default Browse;
