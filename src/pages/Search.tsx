import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon, Download, Loader2, HardDrive, Users, Database, ArrowLeft } from "lucide-react";
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
import { ThemeSwitcher } from "@/components/theme-switcher";

const API_BASE = import.meta.env.VITE_API_BASE;

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
    const [providers, setProviders] = useState<string[]>([]);
    const [selectedProvider, setSelectedProvider] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);

    useEffect(() => {
        fetch(`${API_BASE}/api/providers`)
            .then(res => res.json())
            .then(data => {
                setProviders(data || []);
                if (data && data.length > 0) setSelectedProvider(data[0]);
            });
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query || !selectedProvider) return;

        setLoading(true);
        setResults([]);
        try {
            const res = await fetch(`${API_BASE}/api/search?provider=${selectedProvider}&query=${encodeURIComponent(query)}`);
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

    const addTorrent = async (magnet: string) => {
        setAdding(magnet);
        try {
            await fetch(`${API_BASE}/api/add`, {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                 {/* Header */}
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link to="/">
                                <ArrowLeft className="size-6" />
                            </Link>
                        </Button>
                        <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20">
                            <SearchIcon className="size-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Torrent Search</h1>
                            <p className="text-muted-foreground text-sm md:text-base">Search for torrents across multiple providers</p>
                        </div>
                    </div>
                    <ThemeSwitcher />
                </div>

                <Card>
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
                                    <Button 
                                        onClick={() => addTorrent(result.magnet)}
                                        disabled={adding === result.magnet}
                                    >
                                        {adding === result.magnet ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        <span className="ml-2 hidden md:inline">Add</span>
                                    </Button>
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
