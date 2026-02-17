import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useServer } from "@/contexts/ServerContext";
import SearchHeader from "./Header";
import SearchForm from "./Form";
import ResultCard from "./ResultCard";
import type { SearchResult } from "./types";

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

    useEffect(() => {
        if (selectedProvider) {
            localStorage.setItem('selectedProvider', selectedProvider);
        }
    }, [selectedProvider]);

    useEffect(() => {
        localStorage.setItem('searchQuery', query);
    }, [query]);

    useEffect(() => {
        localStorage.setItem('searchResults', JSON.stringify(results));
    }, [results]);

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

    const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
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
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <SearchHeader />
                <Card className="pt-0">
                    <CardContent className="pt-6">
                        <SearchForm
                            providers={providers}
                            selectedProvider={selectedProvider}
                            onProviderChange={setSelectedProvider}
                            query={query}
                            onQueryChange={setQuery}
                            loading={loading}
                            onSubmit={handleSearch}
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-4">
                    {results.map((result) => (
                        <ResultCard
                            key={result.magnet}
                            result={result}
                            addingMagnet={adding}
                            onAdd={addTorrent}
                            onCopy={copyMagnetLink}
                            copiedMagnet={copiedMagnet}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Search;
