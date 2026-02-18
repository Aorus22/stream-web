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
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-xl ring-1 ring-purple-500/20">
                        <Code2 className="size-6 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            {isEdit ? "Edit Provider" : "New Provider"}
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm">
                            {isEdit ? "Modify your custom scraper" : "Create a new custom scraper"}
                        </p>
                    </div>
                </div>
                <div className="ml-auto">
                    <Button
                        onClick={handleSave}
                        disabled={!name || !baseUrl || !code || saving || !serverUrl}
                        className="gap-2"
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

            {/* Box 1: Provider Configuration */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Code2 className="size-5 text-purple-500" />
                        <h3 className="font-semibold">Provider Configuration</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Provider Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., My Torrent Site"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="baseUrl">Base URL Template</Label>
                            <Input
                                id="baseUrl"
                                placeholder="https://example.com/search?q={q}"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use <code className="bg-muted px-1 py-0.5 rounded">{'{q}'}</code> as placeholder for search query
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Page Type</Label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="pageType"
                                    checked={pageType === "list"}
                                    onChange={() => setPageType("list")}
                                    className="accent-primary"
                                />
                                <span className="text-sm">List (Search Results)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="pageType"
                                    checked={pageType === "detail"}
                                    onChange={() => setPageType("detail")}
                                    className="accent-primary"
                                />
                                <span className="text-sm">Detail (Magnet Link)</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>JavaScript Code</Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCode(DEFAULT_SCRIPT)}
                                className="h-7 text-xs"
                            >
                                Reset to Default
                            </Button>
                        </div>
                        <div className="border rounded-md overflow-hidden">
                            <Editor
                                height="400px"
                                defaultLanguage="javascript"
                                value={code}
                                onChange={(value) => setCode(value || "")}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    lineNumbers: "on",
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Available: <code className="bg-muted px-1 py-0.5 rounded">ARG_FULL_URL</code>,
                            <code className="bg-muted px-1 py-0.5 rounded">ARG_PAGE_TYPE</code>,
                            <code className="bg-muted px-1 py-0.5 rounded">require()</code>
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Box 2: Variables Reference */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Code2 className="size-5 text-purple-500" />
                        <h3 className="font-semibold">Variables Reference</h3>
                    </div>
                    <div className="grid md:grid-cols-3 gap-3 text-sm">
                        <div className="p-3 bg-muted rounded-lg">
                            <code className="text-purple-500">ARG_FULL_URL</code>
                            <p className="text-muted-foreground mt-1">The full URL with {'{q}'} replaced by actual query</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                            <code className="text-purple-500">ARG_PAGE_TYPE</code>
                            <p className="text-muted-foreground mt-1">"list" or "detail" - use this to control which function to run</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                            <code className="text-purple-500">require()</code>
                            <p className="text-muted-foreground mt-1">Node.js require function (cheerio, https, etc.)</p>
                        </div>
                    </div>

                    <h4 className="font-semibold mt-6 mb-3">Expected Return Format</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-medium mb-2">List page type:</p>
                            <pre className="text-xs overflow-x-auto">
{`{
  type: 'list',
  results: [
    { name, url, seeds, leeches, size }
  ]
}`}
                            </pre>
                        </div>
                        <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs font-medium mb-2">Detail page type:</p>
                            <pre className="text-xs overflow-x-auto">
{`{
  type: 'detail',
  name,
  magnetLink,
  directDownloads: [{ url, text }],
  similarFiles: []
}`}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Box 3: Testing Zone */}
            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <Play className="size-5 text-purple-500" />
                        <h3 className="font-semibold">Testing Zone</h3>
                    </div>

                    {/* Main Test Section */}
                    <div className="space-y-3">
                        <div className="grid md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="query">Query Parameter (Optional)</Label>
                                <Input
                                    id="query"
                                    placeholder="e.g., Inception, movie name..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleTest()}
                                />
                            </div>
<div className="space-y-2">
                                <Label>Full URL</Label>
                                <div className="p-2 bg-muted rounded text-xs font-mono break-words">
                                    {query
                                        ? baseUrl.replace("{q}", encodeURIComponent(query))
                                        : baseUrl || "(enter base URL)"}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={handlePreviewHtml}
                                disabled={!baseUrl || previewingHtml || !serverUrl}
                                variant="outline"
                                className="flex-1 gap-2"
                            >
                                {previewingHtml ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Eye className="size-4" />
                                        Preview HTML
                                    </>
                                )}
                            </Button>
                            <Button
                                onClick={handleTest}
                                disabled={!baseUrl || !code || testing || !serverUrl}
                                className="flex-1 gap-2"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Testing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="size-4" />
                                        Test Script
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* HTML Preview */}
                        {showHtmlPreview && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <Eye className="size-4" />
                                        HTML Preview
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowHtmlPreview(false)}
                                        className="h-7 text-xs"
                                    >
                                        Clear
                                    </Button>
                                </div>
                                <div className="border rounded-lg bg-muted/50 p-3 max-h-[300px] overflow-auto">
                                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                        {htmlContent}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Test Result */}
                        {showTestResult && testResult && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Play className="size-4" />
                                        <Label>Script Result</Label>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowTestResult(false)}
                                        className="h-7 text-xs"
                                    >
                                        Clear
                                    </Button>
                                </div>

                                {testResult.error ? (
                                    <div className="border rounded-lg bg-muted/50 p-3">
                                        <div className="text-red-500 text-sm">
                                            <p className="font-medium">Error:</p>
                                            <p>{testResult.error}</p>
                                        </div>
                                    </div>
                                ) : testResult.result?.type === 'list' && testResult.result.results ? (
                                    <div className="grid md:grid-cols-2 gap-3">
                                        {/* JSON View */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">JSON Raw</Label>
                                            <div className="border rounded-lg bg-muted/50 p-2 max-h-[250px] overflow-auto">
                                                <pre className="text-xs overflow-x-auto">
                                                    {JSON.stringify(testResult.result, null, 2)}
                                                </pre>
                                            </div>
                                        </div>

                                        {/* Clickable View */}
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Clickable (Click to test detail)</Label>
                                            <div className="border rounded-lg bg-muted/50 p-2 max-h-[250px] overflow-auto">
                                                <div className="space-y-1">
                                                    {testResult.result.results.map((item: { url: string; [key: string]: unknown }, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleResultClick(item.url)}
                                                            className="p-2 bg-background hover:bg-muted/50 cursor-pointer border rounded transition-colors"
                                                        >
                                                            <div className="font-medium text-sm text-foreground">
                                                                {(item.name as string) || "Unnamed"}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                Size: {(item.size as string) || "Unknown"} |
                                                                Seeds: {(item.seeds as number) || 0} |
                                                                Leeches: {(item.leeches as number) || 0}
                                                            </div>
                                                            <div className="text-purple-500 text-xs mt-1 truncate">
                                                                {item.url}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : testResult.result ? (
                                    <div className="border rounded-lg bg-muted/50 p-3 max-h-[300px] overflow-auto">
                                        <pre className="text-xs overflow-x-auto">
                                            {JSON.stringify(testResult.result, null, 2)}
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="border rounded-lg bg-muted/50 p-3 max-h-[300px] overflow-auto">
                                        <pre className="text-xs overflow-x-auto">
                                            {JSON.stringify(testResult, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Detail URL Test (for list type providers) */}
                        {pageType === "list" && (
                            <div className="space-y-3 pt-3 border-t">
                                <Label className="text-purple-500">Detail URL Test (Optional)</Label>
                                <Input
                                    placeholder="Paste a URL from list results above..."
                                    value={detailUrl}
                                    onChange={(e) => setDetailUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleTestDetail()}
                                    className="text-xs font-mono"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handlePreviewDetailHtml}
                                        disabled={!detailUrl || previewingDetailHtml || !serverUrl}
                                        variant="outline"
                                        className="flex-1 gap-2"
                                        size="sm"
                                    >
                                        {previewingDetailHtml ? (
                                            <>
                                                <Loader2 className="size-3 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="size-3" />
                                                HTML
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleTestDetail}
                                        disabled={!detailUrl || !code || testingDetail || !serverUrl}
                                        variant="outline"
                                        className="flex-1 gap-2"
                                        size="sm"
                                    >
                                        {testingDetail ? (
                                            <>
                                                <Loader2 className="size-3 animate-spin" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>
                                                <Play className="size-3" />
                                                Test Detail
                                            </>
                                        )}
                                    </Button>
                                </div>

                                {/* Detail HTML Preview */}
                                {showDetailHtmlPreview && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-2 text-sm">
                                                <Eye className="size-3" />
                                                Detail HTML Preview
                                            </Label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowDetailHtmlPreview(false)}
                                                className="h-6 text-xs"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                        <div className="border rounded-lg bg-muted/50 p-2 max-h-[200px] overflow-auto">
                                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                                                {detailHtmlContent}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                {/* Detail Result */}
                                {showDetailResult && detailResult && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-2 text-sm">
                                                <Play className="size-3" />
                                                Detail Result
                                            </Label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowDetailResult(false)}
                                                className="h-6 text-xs"
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                        <div className="border rounded-lg bg-muted/50 p-2 max-h-[200px] overflow-auto">
                                            {detailResult.error ? (
                                                <div className="text-red-500 text-xs">
                                                    <p className="font-medium">Error:</p>
                                                    <p>{detailResult.error}</p>
                                                </div>
                                            ) : detailResult.result ? (
                                                <pre className="text-xs overflow-x-auto">
                                                    {JSON.stringify(detailResult.result, null, 2)}
                                                </pre>
                                            ) : (
                                                <pre className="text-xs overflow-x-auto">
                                                    {JSON.stringify(detailResult, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default CustomProviderEditorPage;
