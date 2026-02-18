import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Play, Trash2, Edit, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServer } from "@/contexts/ServerContext";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

interface CustomProvider {
    id: string;
    name: string;
    baseUrl: string;
    pageType: string;
    code: string;
    createdAt: string;
    updatedAt: string;
}

export function CustomProviderListPage() {
    const { serverUrl } = useServer();
    const navigate = useNavigate();
    const [providers, setProviders] = useState<CustomProvider[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProviders = async () => {
        if (!serverUrl) return;

        try {
            const response = await fetch(`${serverUrl}/api/custom-providers`);
            if (response.ok) {
                const data = await response.json();
                setProviders(data);
            }
        } catch (err) {
            console.error("Failed to fetch providers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, [serverUrl]);

    const handleDelete = async (id: string) => {
        if (!serverUrl || !confirm("Are you sure you want to delete this provider?")) return;

        try {
            const response = await fetch(`${serverUrl}/api/custom-providers/${id}`, {
                method: "DELETE",
            });
            if (response.ok) {
                fetchProviders();
            }
        } catch (err) {
            console.error("Failed to delete provider:", err);
        }
    };

    const handleRun = async (provider: CustomProvider) => {
        // Navigate to a test/run page with the provider
        navigate(`/custom-provider/test/${provider.id}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20">
                        <Code2 className="size-6 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Custom Providers</h1>
                        <p className="text-muted-foreground text-xs md:text-sm">
                            Manage your custom JavaScript scrapers
                        </p>
                    </div>
                </div>
                <Button onClick={() => navigate("/custom-provider/new")} className="gap-2">
                    <Plus className="size-4" />
                    Add Provider
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : providers.length === 0 ? (
                <Empty className="min-h-[400px]">
                    <EmptyMedia variant="icon">
                        <Code2 className="size-8" />
                    </EmptyMedia>
                    <EmptyTitle>No custom providers yet</EmptyTitle>
                    <EmptyDescription>
                        Create your first custom provider to scrape torrent sites
                    </EmptyDescription>
                </Empty>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {providers.map((provider) => (
                        <Card key={provider.id} className="group hover:border-primary/50 transition-colors">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-lg">{provider.name}</h3>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {provider.baseUrl}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 bg-muted rounded">
                                            {provider.pageType}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 gap-1"
                                            onClick={() => navigate(`/custom-provider/edit/${provider.id}`)}
                                        >
                                            <Edit className="size-3" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() => handleRun(provider)}
                                        >
                                            <Play className="size-3" />
                                            Run
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1 text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(provider.id)}
                                        >
                                            <Trash2 className="size-3" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CustomProviderListPage;
