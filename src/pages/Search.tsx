import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, Download, Loader2, HardDrive, Users, Database, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServer } from "@/contexts/ServerContext";

type SearchResult = {
  name: string;
  magnet: string;
  poster: string;
  category: string;
  type: string;
  language: string;
  size: string;
  uploadedBy: string;
  downloads: string;
  lastChecked: string;
  dateUploaded: string;
  seeders: string;
  leechers: string;
  url: string;
};

export function Search() {
    const { serverUrl } = useServer();
    const [searchParams] = useSearchParams();
    const [providers, setProviders] = useState<string[]>([]);
    const [selectedProvider, setSelectedProvider] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);
    const [copiedMagnet, setCopiedMagnet] = useState<string | null>(null);
    const [initialSearchDone, setInitialSearchDone] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        if (!serverUrl) return;

        const urlQuery = searchParams.get('q');
        const savedProvider = localStorage.getItem('selectedProvider');
        const savedQuery = localStorage.getItem('searchQuery');
        const savedResults = localStorage.getItem('searchResults');

        fetch(`${serverUrl}/api/providers`)
            .then(res => res.json())
            .then(data => {
                setProviders(data || []);
                const providerToUse = savedProvider && (data || []).includes(savedProvider) ? savedProvider : (data && data.length > 0 ? data[0] : "");
                setSelectedProvider(providerToUse);
                
                // If there's a URL query param, use it and trigger search
                if (urlQuery) {
                    setQuery(urlQuery);
                    setInitialSearchDone(false);
                } else if (savedQuery) {
                    setQuery(savedQuery);
                }
            });

        if (!urlQuery && savedResults) {
            try {
                setResults(JSON.parse(savedResults));
            } catch (e) {
                console.error("Failed to parse saved results", e);
            }
        }
    }, [searchParams, serverUrl]);

    // Save provider to localStorage whenever it changes
    useEffect(() => {
        if (selectedProvider) {
            localStorage.setItem('selectedProvider', selectedProvider);
        }
    }, [selectedProvider]);

    // Save query and results to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('searchQuery', query);
    }, [query]);

    useEffect(() => {
        localStorage.setItem('searchResults', JSON.stringify(results));
    }, [results]);

    // Auto-search when URL query param is provided
    useEffect(() => {
        const urlQuery = searchParams.get('q');
        if (urlQuery && selectedProvider && !initialSearchDone && query === urlQuery) {
            setInitialSearchDone(true);
            performSearch();
        }
    }, [query, selectedProvider, initialSearchDone, searchParams]);

    const performSearch = async () => {
        if (!query || !selectedProvider || !serverUrl) return;

        setLoading(true);
        setResults([]);
        try {
            const res = await fetch(`${serverUrl}/api/search?provider=${selectedProvider}&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (Array.isArray(data)) {
                setResults(data);
            } else {
                console.error("Search API returned non-array:", data);
                setResults([]);
            }
        } catch (err) {
            console.error(err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        performSearch();
    };

    const addTorrent = async (magnet: string) => {
        if (!serverUrl) return;
        setAdding(magnet);
        try {
            await fetch(`${serverUrl}/api/add`, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `magnet=${encodeURIComponent(magnet)}`
            });
            // Optional: navigate to dashboard or show success
        } catch (err) {
            console.error(err);
        } finally {
            setAdding(null);
        }
    };

    const copyMagnetLink = (magnet: string) => {
        navigator.clipboard.writeText(magnet);
        setCopiedMagnet(magnet);
        setTimeout(() => setCopiedMagnet(null), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                 {/* Header */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
                            <SearchIcon className="size-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Torrent Search</h1>
                            <p className="text-muted-foreground text-sm md:text-base">Search for torrents across multiple providers</p>
                        </div>
                    </div>
                </div>

                <Card className="pt-0">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                             <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                <SelectTrigger className="w-full md:w-[200px]">
                                    <SelectValue placeholder="Select Provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providers.map(p => (
                                        <SelectItem key={p} value={p}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input 
                                placeholder="Search query..." 
                                value={query} 
                                onChange={e => setQuery(e.target.value)}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
                                Search
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {results.map((result, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg">{result.name}</CardTitle>
                                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                        <Badge variant="outline" className="gap-1">
                                            <HardDrive className="h-3 w-3" /> {result.size}
                                        </Badge>
                                        <Badge variant="outline" className="gap-1 text-green-600">
                                            <Users className="h-3 w-3" /> {result.seeders} / {result.leechers}
                                        </Badge>
                                        <Badge variant="outline" className="gap-1">
                                            <Database className="h-3 w-3" /> {result.category}
                                        </Badge>
                                    </div>
                                    <CardDescription>Uploaded by {result.uploadedBy} on {result.dateUploaded}</CardDescription>
                                </div>
                                {result.magnet && (
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline"
                                            size="sm"
                                            onClick={() => copyMagnetLink(result.magnet)}
                                            title="Copy magnet link"
                                        >
                                            {copiedMagnet === result.magnet ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                        <Button 
                                            onClick={() => addTorrent(result.magnet)}
                                            disabled={adding === result.magnet}
                                        >
                                            {adding === result.magnet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                            <span className="ml-2 hidden md:inline">Add</span>
                                        </Button>
                                    </div>
                                )}
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Search;
