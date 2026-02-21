import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Code2, Loader2, Save, ArrowLeft, Play, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServer } from "@/contexts/ServerContext";
import Editor from "@monaco-editor/react";

// Types for test results
interface TestResult {
    result?: {
        type: string;
        results?: Array<{ url: string; [key: string]: unknown }>;
        [key: string]: unknown;
    } | null;
    error?: string;
    [key: string]: unknown;
}

const DEFAULT_SCRIPT = `const https = require('https');
const cheerio = require('cheerio');

async function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function parseListPage(fullUrl) {
  try {
    const html = await fetchUrl(fullUrl);
    const $ = cheerio.load(html);
    const results = [];

    $('table.table-list tbody tr, table tbody tr').each((i, elem) => {
      const $row = $(elem);
      if ($row.find('th').length > 0) return;

      const cols = $row.find('td');
      if (cols.length < 3) return;

      const nameCell = $row.find('td.coll-1.name, td.coll-1, td:nth-child(1)').first();
      const allLinks = nameCell.find('a');
      let name = '';
      let relativeUrl = '';

      if (allLinks.length >= 2) {
        name = allLinks.eq(1).text().trim();
        relativeUrl = allLinks.eq(1).attr('href');
      } else if (allLinks.length === 1) {
        name = allLinks.eq(0).text().trim();
        relativeUrl = allLinks.eq(0).attr('href');
      }

      if (!name || name.length < 3 || !relativeUrl) return;

      const url = relativeUrl.startsWith('http')
        ? relativeUrl
        : (relativeUrl.startsWith('//')
          ? 'https:' + relativeUrl
          : new URL(relativeUrl, fullUrl).href);

      let seeds = 0;
      const seedsCol = $row.find('td.coll-2, td:nth-child(2)').first();
      const seedsText = seedsCol.text().trim();
      if (seedsText) {
        const parsed = parseInt(seedsText.replace(/,/g, ''));
        if (!isNaN(parsed)) seeds = parsed;
      }

      let leeches = 0;
      const leechesCol = $row.find('td.coll-3, td:nth-child(3)').first();
      const leechesText = leechesCol.text().trim();
      if (leechesText) {
        const parsed = parseInt(leechesText.replace(/,/g, ''));
        if (!isNaN(parsed)) leeches = parsed;
      }

      let size = 'Unknown';
      const sizeCol = $row.find('td.coll-4.size, td.coll-4, td.size, td:nth-child(5)').first();
      if (sizeCol.length > 0) {
        const sizeText = sizeCol.text().trim();
        size = sizeText.split(new RegExp('\\n'))[0] || sizeText;
      }

      results.push({ name, url, seeds, leeches, size, uploader: '', time: '' });
    });

    return { type: 'list', results };
  } catch (error) {
    return { type: 'error', error: error.message };
  }
}

async function parseDetailPage(fullUrl) {
  try {
    const html = await fetchUrl(fullUrl);
    const $ = cheerio.load(html);

    const name = $('h1, title, .title, .name').first().text().trim() || 'Unknown';

    let magnetLink = '';
    $('a[href^="magnet:"]').each((i, elem) => {
      magnetLink = $(elem).attr('href');
      return false;
    });

    const directDownloads = [];
    $('a[href*="download"], a[href*=".torrent"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && !href.startsWith('magnet:') && !href.startsWith('#')) {
        directDownloads.push({
          url: href.startsWith('http') ? href : new URL(href, fullUrl).href,
          text: $(elem).text().trim() || 'Download'
        });
      }
    });

    return { type: 'detail', name, magnetLink, directDownloads, similarFiles: [] };
  } catch (error) {
    return { type: 'error', name: 'Error', magnetLink: '', directDownloads: [], similarFiles: [], error: error.message };
  }
}

// Main entry point - ARG_PAGE_TYPE determines which function to use
if (ARG_PAGE_TYPE === 'list') {
  return await parseListPage(ARG_FULL_URL);
} else if (ARG_PAGE_TYPE === 'detail') {
  return await parseDetailPage(ARG_FULL_URL);
} else {
  return await parseListPage(ARG_FULL_URL);
}
`;

export function CustomProviderEditorPage() {
    const { serverUrl } = useServer();
    const navigate = useNavigate();
    const { id } = useParams<{ id?: string }>();
    const isEdit = !!id;

    const [name, setName] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [pageType, setPageType] = useState<"list" | "detail">("list");
    const [code, setCode] = useState(DEFAULT_SCRIPT);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    // Test states
    const [query, setQuery] = useState("");
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);
    const [showTestResult, setShowTestResult] = useState(false);

    // Detail URL test states (for list type providers)
    const [detailUrl, setDetailUrl] = useState("");
    const [testingDetail, setTestingDetail] = useState(false);
    const [detailResult, setDetailResult] = useState<TestResult | null>(null);
    const [showDetailResult, setShowDetailResult] = useState(false);

    // Detail HTML Preview states
    const [previewingDetailHtml, setPreviewingDetailHtml] = useState(false);
    const [detailHtmlContent, setDetailHtmlContent] = useState("");
    const [showDetailHtmlPreview, setShowDetailHtmlPreview] = useState(false);

    // HTML Preview states
    const [previewingHtml, setPreviewingHtml] = useState(false);
    const [htmlContent, setHtmlContent] = useState("");
    const [showHtmlPreview, setShowHtmlPreview] = useState(false);

// Load provider data if editing
    useEffect(() => {
        if (isEdit && serverUrl) {
            fetch(`${serverUrl}/api/custom-providers/${id}`)
                .then(res => res.json())
                .then(data => {
                    setName(data.name || "");
                    setBaseUrl(data.baseUrl || "");
                    setPageType(data.pageType || "list");
                    // Decode base64 code
                    if (data.code) {
                        try {
                            const decoded = decodeURIComponent(escape(atob(data.code)));
                            setCode(decoded);
                        } catch {
                            setCode(data.code);
                        }
                    } else {
                        setCode(DEFAULT_SCRIPT);
                    }
                })
                .catch(err => console.error("Failed to load provider:", err))
                .finally(() => setLoading(false));
        }
    }, [isEdit, id, serverUrl]);

    const handleTest = async () => {
        if (!serverUrl || !baseUrl || !code) return;

        setTesting(true);
        setTestResult(null);
        setShowTestResult(true);
        try {
            const base64Code = btoa(unescape(encodeURIComponent(code)));
            const fullUrl = query ? baseUrl.replace("{q}", encodeURIComponent(query)) : baseUrl;

            const response = await fetch(`${serverUrl}/api/js/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: base64Code,
                    url: fullUrl,
                    pageType: pageType,
                    isBase64: true,
                }),
            });

            const data = await response.json();
            setTestResult(data);
        } catch (err) {
            console.error("Test failed:", err);
            setTestResult({ error: "Failed to execute script" });
        } finally {
            setTesting(false);
        }
    };

    const handleTestDetail = async () => {
        if (!serverUrl || !detailUrl || !code) return;

        setTestingDetail(true);
        setDetailResult(null);
        setShowDetailResult(true);
        try {
            const base64Code = btoa(unescape(encodeURIComponent(code)));

            const response = await fetch(`${serverUrl}/api/js/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: base64Code,
                    url: detailUrl,
                    pageType: "detail", // Always use "detail" for child URL testing
                    isBase64: true,
                }),
            });

            const data = await response.json();
            setDetailResult(data);
        } catch (err) {
            console.error("Detail test failed:", err);
            setDetailResult({ error: "Failed to execute script" });
        } finally {
            setTestingDetail(false);
        }
    };

    // Auto-fill detail URL from clicked result
    const handleResultClick = (url: string) => {
        setDetailUrl(url);
        setShowDetailResult(false); // Clear previous result
        setShowDetailHtmlPreview(false); // Clear previous HTML preview
    };

    const handlePreviewHtml = async () => {
        if (!serverUrl || !baseUrl) return;

        setPreviewingHtml(true);
        setHtmlContent("");
        setShowHtmlPreview(true);
        try {
            const fullUrl = query ? baseUrl.replace("{q}", encodeURIComponent(query)) : baseUrl;

            const response = await fetch(`${serverUrl}/api/js/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: fullUrl }),
            });

            if (response.ok) {
                const html = await response.text();
                setHtmlContent(html);
            } else {
                setHtmlContent(`Error: ${response.statusText}`);
            }
        } catch (err) {
            console.error("Preview HTML failed:", err);
            setHtmlContent("Failed to fetch HTML: " + (err as Error).message);
        } finally {
            setPreviewingHtml(false);
        }
    };

    const handlePreviewDetailHtml = async () => {
        if (!serverUrl || !detailUrl) return;

        setPreviewingDetailHtml(true);
        setDetailHtmlContent("");
        setShowDetailHtmlPreview(true);
        try {
            const response = await fetch(`${serverUrl}/api/js/preview`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: detailUrl }),
            });

            if (response.ok) {
                const html = await response.text();
                setDetailHtmlContent(html);
            } else {
                setDetailHtmlContent(`Error: ${response.statusText}`);
            }
        } catch (err) {
            console.error("Preview detail HTML failed:", err);
            setDetailHtmlContent("Failed to fetch HTML: " + (err as Error).message);
        } finally {
            setPreviewingDetailHtml(false);
        }
    };

    const handleSave = async () => {
        if (!serverUrl || !name || !baseUrl || !code) return;

        setSaving(true);
        try {
            const base64Code = btoa(unescape(encodeURIComponent(code)));

            if (isEdit) {
                await fetch(`${serverUrl}/api/custom-providers/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        baseUrl,
                        pageType,
                        code: base64Code,
                    }),
                });
            } else {
                await fetch(`${serverUrl}/api/custom-providers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        baseUrl,
                        pageType,
                        code: base64Code,
                    }),
                });
            }

            navigate("/custom-provider");
        } catch (err) {
            console.error("Failed to save provider:", err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

        return (
    
            <div className="space-y-6 p-4 md:p-8 max-w-[1600px] mx-auto pb-20">
    
                {/* Header */}
    
                <div className="flex items-center gap-4 border-b border-border/40 pb-6">
    
                    <Button
    
                        variant="outline"
    
                        size="icon"
    
                        onClick={() => navigate(-1)}
    
                        className="h-10 w-10 rounded-full border-border/60 hover:bg-muted/50 transition-colors"
    
                    >
    
                        <ArrowLeft className="size-5" />
    
                    </Button>
    
                    <div className="flex items-center gap-4">
    
                        <div className="p-2.5 bg-primary/10 rounded-xl ring-1 ring-primary/20 shadow-inner hidden md:block">
    
                            <Code2 className="size-6 text-primary" />
    
                        </div>
    
                        <div>
    
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
    
                                {isEdit ? "Edit Provider" : "New Provider"}
    
                            </h1>
    
                            <p className="text-muted-foreground text-sm">
    
                                {isEdit ? "Modify your custom scraper logic" : "Create a new custom scraper"}
    
                            </p>
    
                        </div>
    
                    </div>
    
                    <div className="ml-auto flex items-center gap-3">
    
                        <Button
    
                            onClick={handleSave}
    
                            disabled={!name || !baseUrl || !code || saving || !serverUrl}
    
                            className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2 min-w-[120px]"
                        >
    
                            {saving ? (
    
                                <>
    
                                    <Loader2 className="size-4 animate-spin" />
    
                                    Saving...
    
                                </>
    
                            ) : (
    
                                <>
    
                                    <Save className="size-4" />
    
                                    Save
    
                                </>
    
                            )}
    
                        </Button>
    
                    </div>
    
                </div>
    
    
    
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8 h-full">
    
                    {/* Left Column: Configuration & Code */}
    
                    <div className="md:col-span-2 space-y-6">
    
                        <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm">
    
                            <CardContent className="pt-6 space-y-6">
    
                                <div className="flex items-center gap-2 pb-2 border-b border-border/40">
    
                                    <Code2 className="size-5 text-primary" />
    
                                    <h3 className="font-semibold text-lg">Configuration</h3>
    
                                </div>
    
    
    
                                <div className="grid md:grid-cols-2 gap-6">
    
                                    <div className="space-y-2.5">
    
                                        <Label htmlFor="name" className="text-sm font-medium">Provider Name</Label>
    
                                        <Input
    
                                            id="name"
    
                                            placeholder="e.g., My Torrent Site"
    
                                            value={name}
    
                                            onChange={(e) => setName(e.target.value)}
    
                                            className="bg-background/50 focus:bg-background transition-colors"
    
                                        />
    
                                    </div>
    
    
    
                                    <div className="space-y-2.5">
    
                                        <Label htmlFor="baseUrl" className="text-sm font-medium">Base URL Template</Label>
    
                                        <div className="relative">
    
                                            <Input
    
                                                id="baseUrl"
    
                                                placeholder="https://example.com/search?q={q}"
    
                                                value={baseUrl}
    
                                                onChange={(e) => setBaseUrl(e.target.value)}
    
                                                className="font-mono text-sm pr-20 bg-background/50 focus:bg-background transition-colors"
    
                                            />
    
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
    
                                                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border/50">
    
                                                    {'{q}'}
    
                                                </code>
    
                                            </div>
    
                                        </div>
    
                                    </div>
    
                                </div>
    
    
    
                                <div className="space-y-3">
    
                                    <Label className="text-sm font-medium">Page Type</Label>
    
                                    <div className="flex gap-4 p-1 bg-muted/30 rounded-lg w-fit">
    
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-all ${pageType === "list" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
    
                                            <input
    
                                                type="radio"
    
                                                name="pageType"
    
                                                checked={pageType === "list"}
    
                                                onChange={() => setPageType("list")}
    
                                                className="sr-only"
    
                                            />
    
                                            <span className="text-sm font-medium">List (Search Results)</span>
    
                                        </label>
    
                                        <label className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-all ${pageType === "detail" ? "bg-background shadow-sm text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"}`}>
    
                                            <input
    
                                                type="radio"
    
                                                name="pageType"
    
                                                checked={pageType === "detail"}
    
                                                onChange={() => setPageType("detail")}
    
                                                className="sr-only"
    
                                            />
    
                                            <span className="text-sm font-medium">Detail (Magnet Link)</span>
    
                                        </label>
    
                                    </div>
    
                                </div>
    
                            </CardContent>
    
                        </Card>
    
    
    
                        <Card className="border-border/50 shadow-sm bg-card/50 backdrop-blur-sm flex flex-col min-h-[500px]">
    
                            <CardContent className="pt-4 p-0 flex flex-col flex-1">
    
                                <div className="px-6 py-3 flex items-center justify-between border-b border-border/40 bg-muted/20">
    
                                    <Label className="text-sm font-medium flex items-center gap-2">
    
                                        <div className="w-2 h-2 rounded-full bg-primary/80"></div>
    
                                        JavaScript Logic
    
                                    </Label>
    
                                    <Button
    
                                        variant="ghost"
    
                                        size="sm"
    
                                        onClick={() => setCode(DEFAULT_SCRIPT)}
    
                                        className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
    
                                    >
    
                                        Reset to Default
    
                                    </Button>
    
                                </div>
    
                                                            <div className="relative border-b border-border/40">
    
                                                                <Editor
    
                                                                    height="600px"
    
                                                                    defaultLanguage="javascript"
    
                                                                    value={code}
    
                                                                    onChange={(value) => setCode(value || "")}
    
                                                                    theme="vs-dark"
    
                                                                    options={{
    
                                                                        minimap: { enabled: false },
    
                                                                        fontSize: 14,
    
                                                                        lineNumbers: "on",
    
                                                                        scrollBeyondLastLine: false,
    
                                                                        automaticLayout: true,
    
                                                                        tabSize: 2,
    
                                                                        padding: { top: 16, bottom: 16 },
    
                                                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    
                                                                    }}
    
                                                                />
    
                                                            </div>
    
                                <div className="px-4 py-2 bg-muted/30 border-t border-border/40 text-[11px] text-muted-foreground flex gap-3">
    
                                    <span>Available Globals:</span>
    
                                    <code className="bg-muted px-1 rounded border border-border/50">ARG_FULL_URL</code>
    
                                    <code className="bg-muted px-1 rounded border border-border/50">ARG_PAGE_TYPE</code>
    
                                    <code className="bg-muted px-1 rounded border border-border/50">require()</code>
    
                                </div>
    
                            </CardContent>
    
                        </Card>
    
                    </div>
    
    
    
                    {/* Right Column: Testing & Help */}
    
                    <div className="space-y-6">
    
                        {/* Testing Zone */}
    
                        <Card className="border-border/50 shadow-md bg-card border-t-4 border-t-primary">
    
                            <CardContent className="pt-6 space-y-4">
    
                                <div className="flex items-center justify-between pb-2 border-b border-border/40">
    
                                    <div className="flex items-center gap-2">
    
                                        <Play className="size-4 text-primary" />
    
                                        <h3 className="font-semibold text-sm uppercase tracking-wider">Debugger</h3>
    
                                    </div>
    
                                    <div className="flex gap-1">
    
                                         <Button
    
                                            onClick={handleTest}
    
                                            disabled={!baseUrl || !code || testing || !serverUrl}
    
                                            size="sm"
    
                                            className="h-7 text-xs"
                                        >
    
                                            {testing ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3 mr-1" />}
    
                                            Run
    
                                        </Button>
    
                                    </div>
    
                                </div>
    
    
    
                                {/* Inputs */}
    
                                <div className="space-y-4">
    
                                    <div className="space-y-1.5">
    
                                        <Label htmlFor="query" className="text-xs font-medium text-muted-foreground">Search Query</Label>
    
                                        <div className="flex gap-2">
    
                                            <Input
    
                                                id="query"
    
                                                placeholder="e.g., Inception"
    
                                                value={query}
    
                                                onChange={(e) => setQuery(e.target.value)}
    
                                                onKeyDown={(e) => e.key === "Enter" && handleTest()}
    
                                                className="h-8 text-sm"
    
                                            />
    
                                        </div>
    
                                    </div>
    
                                    
    
                                    <div className="space-y-1.5">
    
                                        <Label className="text-xs font-medium text-muted-foreground">Generated URL</Label>
    
                                        <div className="p-2 bg-muted/40 rounded border border-border/50 text-[10px] font-mono break-all text-foreground/80 min-h-[2.5rem] flex items-center">
    
                                            {query
    
                                                ? baseUrl.replace("{q}", encodeURIComponent(query))
    
                                                : baseUrl || <span className="text-muted-foreground italic">(enter base URL)</span>}
    
                                        </div>
    
                                    </div>
    
    
    
                                    <div className="grid grid-cols-2 gap-2">
    
                                        <Button
    
                                            onClick={handlePreviewHtml}
    
                                            disabled={!baseUrl || previewingHtml || !serverUrl}
    
                                            variant="secondary"
    
                                            size="sm"
    
                                            className="text-xs h-8"
    
                                        >
    
                                            {previewingHtml ? <Loader2 className="size-3 animate-spin mr-1" /> : <Eye className="size-3 mr-1" />}
    
                                            Preview HTML
    
                                        </Button>
    
                                    </div>
    
                                </div>
    
    
    
                                {/* Results Area */}
    
                                <div className="space-y-2 pt-2 border-t border-border/40">
    
                                    <Label className="text-xs font-medium text-muted-foreground">Console Output</Label>
    
                                    
    
                                    {showTestResult && testResult ? (
    
                                        <div className="rounded-md border border-border/50 bg-black/90 p-3 max-h-[300px] overflow-auto custom-scrollbar">
    
                                            {testResult.error ? (
    
                                                <div className="text-red-400 text-xs font-mono">
    
                                                    <span className="font-bold">Error:</span> {testResult.error}
    
                                                </div>
    
                                            ) : (
    
                                                <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">
    
                                                    {JSON.stringify(testResult.result, null, 2)}
    
                                                </pre>
    
                                            )}
    
                                        </div>
    
                                    ) : showHtmlPreview ? (
    
                                        <div className="rounded-md border border-border/50 bg-muted/50 p-3 max-h-[300px] overflow-auto">
    
                                             <div className="flex justify-end mb-2">
    
                                                <Button size="sm" variant="ghost" onClick={() => setShowHtmlPreview(false)} className="h-5 text-[10px]">Close</Button>
    
                                            </div>
    
                                            <pre className="text-[10px] font-mono text-foreground/70 whitespace-pre-wrap">
    
                                                {htmlContent}
    
                                            </pre>
    
                                        </div>
    
                                    ) : (
    
                                        <div className="rounded-md border border-border/50 bg-muted/20 p-8 flex flex-col items-center justify-center text-muted-foreground/50">
    
                                            <Play className="size-8 mb-2 opacity-20" />
    
                                            <span className="text-xs">Run a test to see results</span>
    
                                        </div>
    
                                    )}
    
                                </div>
    
    
    
                                {/* Detail URL Test (restored) */}
    
                                {pageType === "list" && (
    
                                    <div className="space-y-4 pt-4 border-t border-border/40">
    
                                        <div className="flex items-center gap-2">
    
                                            <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
    
                                            <Label className="text-xs font-semibold text-secondary-foreground uppercase tracking-wider">Detail Page Test</Label>
    
                                        </div>
    
                                        
    
                                        <div className="space-y-2">
    
                                            <Input
    
                                                placeholder="Paste detail URL..."
    
                                                value={detailUrl}
    
                                                onChange={(e) => setDetailUrl(e.target.value)}
    
                                                onKeyDown={(e) => e.key === "Enter" && handleTestDetail()}
    
                                                className="h-8 text-sm bg-muted/20"
    
                                            />
    
                                            <div className="grid grid-cols-2 gap-2">
    
                                                <Button
    
                                                    onClick={handlePreviewDetailHtml}
    
                                                    disabled={!detailUrl || previewingDetailHtml || !serverUrl}
    
                                                    variant="secondary"
    
                                                    size="sm"
    
                                                    className="text-xs h-7"
    
                                                >
    
                                                    {previewingDetailHtml ? <Loader2 className="size-3 animate-spin mr-1" /> : <Eye className="size-3 mr-1" />}
    
                                                    HTML
    
                                                </Button>
    
                                                <Button
    
                                                    onClick={handleTestDetail}
    
                                                    disabled={!detailUrl || !code || testingDetail || !serverUrl}
    
                                                    size="sm"
                                                    variant="secondary"
                                                    className="text-xs h-7"
    
                                                >
    
                                                    {testingDetail ? <Loader2 className="size-3 animate-spin mr-1" /> : <Play className="size-3 mr-1" />}
    
                                                    Test Detail
    
                                                </Button>
    
                                            </div>
    
                                        </div>
    
    
    
                                        {/* Detail Results */}
    
                                        {(showDetailResult && detailResult) || showDetailHtmlPreview ? (
    
                                            <div className="rounded-md border border-border/50 bg-black/90 p-3 max-h-[300px] overflow-auto custom-scrollbar relative">
    
                                                <Button 
    
                                                    size="sm" 
    
                                                    variant="ghost" 
    
                                                    onClick={() => { setShowDetailResult(false); setShowDetailHtmlPreview(false); }} 
    
                                                    className="absolute top-1 right-1 h-5 w-5 p-0 text-muted-foreground hover:text-white"
    
                                                >
    
                                                    ×
    
                                                </Button>
    
                                                {showDetailHtmlPreview ? (
    
                                                    <pre className="text-[10px] font-mono text-foreground/70 whitespace-pre-wrap">
    
                                                        {detailHtmlContent}
    
                                                    </pre>
    
                                                ) : detailResult?.error ? (
    
                                                    <div className="text-red-400 text-xs font-mono">
    
                                                        <span className="font-bold">Error:</span> {detailResult.error}
    
                                                    </div>
    
                                                ) : (
    
                                                    <pre className="text-[10px] font-mono text-emerald-400 whitespace-pre-wrap">
    
                                                        {JSON.stringify(detailResult?.result, null, 2)}
    
                                                    </pre>
    
                                                )}
    
                                            </div>
    
                                        ) : null}
    
                                    </div>
    
                                )}
    
                            </CardContent>
    
                        </Card>
    
    
    
                        {/* Quick Help */}
    
                        <Card className="border-border/50 shadow-sm bg-muted/10">
    
                            <CardContent className="pt-6">
    
                                 <div className="flex items-center gap-2 mb-4">
    
                                    <Code2 className="size-4 text-primary" />
    
                                    <h3 className="font-semibold text-sm">Quick Reference</h3>
    
                                </div>
    
                                <div className="space-y-3 text-xs">
    
                                    <div className="p-2.5 bg-background rounded border border-border/50 shadow-sm">
    
                                        <code className="text-primary font-bold block mb-1">ARG_FULL_URL</code>
    
                                        <p className="text-muted-foreground leading-relaxed">Contains the fully constructed URL with query parameters.</p>
    
                                    </div>
    
                                    <div className="p-2.5 bg-background rounded border border-border/50 shadow-sm">
    
                                        <code className="text-primary font-bold block mb-1">return {'{...}'}</code>
    
                                        <p className="text-muted-foreground leading-relaxed">
    
                                            Must return an object with <code className="bg-muted px-1 rounded">type: 'list'</code> or <code className="bg-muted px-1 rounded">type: 'detail'</code>.
    
                                        </p>
    
                                    </div>
    
                                </div>
    
                            </CardContent>
    
                        </Card>
    
                    </div>
    
                </div>
    
            </div>
    
        );
    
}

export default CustomProviderEditorPage;
