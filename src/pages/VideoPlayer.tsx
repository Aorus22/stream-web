import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, ArrowLeft, Captions, Search, Type, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Toaster } from "../components/ui/sonner";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

// Helper to format seconds to HH:MM:SS
const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const API_BASE = import.meta.env.VITE_API_BASE;

type FileInfo = {
    name: string;
    size: number;
};

type Subtitle = {
    IDMovie: string;
    IDSubtitleFile: string;
    MovieName: string;
    SubFileName: string;
    LanguageName: string;
    ZipDownloadLink: string;
    SubDownloadLink: string;
};

type SubtitleCue = {
    start: number;
    end: number;
    text: string;
};

type EmbeddedSubtitle = {
    index: number;
    language: string;
    title: string;
    codec: string;
};

export default function VideoPlayer() {
    const [searchParams] = useSearchParams();
    const infoHash = searchParams.get('infoHash') || '';
    const fileIndex = parseInt(searchParams.get('fileIndex') || searchParams.get('file') || '0');

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [isTranscoding, setIsTranscoding] = useState(false);
    const [seekOffset, setSeekOffset] = useState(0);
    const isDraggingRef = useRef(false); // Use ref to avoid stale closure in useEffect

    // Subtitle States
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [embeddedSubs, setEmbeddedSubs] = useState<EmbeddedSubtitle[]>([]);
    const [subQuery, setSubQuery] = useState("");
    const [subLang, setSubLang] = useState("eng"); // eng, ind
    const [searchingSubs, setSearchingSubs] = useState(false);
    const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
    const [currentSubLink, setCurrentSubLink] = useState<string | null>(null);
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const [showLangPopover, setShowLangPopover] = useState(false);
    const [showPlayFeedback, setShowPlayFeedback] = useState<'play' | 'pause' | null>(null);

    // Client-Side Rendering State
    const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
    const [currentSubtitleText, setCurrentSubtitleText] = useState<string | null>(null);

    // Style settings - Load from localStorage
    const [subOffset, setSubOffset] = useState(0); // in seconds
    const [subSize, setSubSize] = useState(() => {
        const saved = localStorage.getItem('subSize');
        return saved ? Number(saved) : 100;
    });
    const [subBottom, setSubBottom] = useState(() => {
        const saved = localStorage.getItem('subBottom');
        return saved ? Number(saved) : 10;
    });

    // Save subtitle settings to localStorage
    useEffect(() => {
        localStorage.setItem('subSize', String(subSize));
    }, [subSize]);

    useEffect(() => {
        localStorage.setItem('subBottom', String(subBottom));
    }, [subBottom]);

    const controlsTimeoutRef = useRef<number>(0);

    // 1. Load Metadata
    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await fetch(`${API_BASE}/api/stats/${infoHash}`);
                const statsData = await statsRes.json();
                const file = statsData.files[Number(fileIndex)];
                setFileInfo(file);

                // Auto fill subtitle query with filename
                setSubQuery(file.name.replace(/\./g, " "));

                const ext = file.name.split('.').pop()?.toLowerCase();
                setIsTranscoding(!['mp4', 'webm'].includes(ext || ''));

                const metaRes = await fetch(`${API_BASE}/api/metadata/${infoHash}/${fileIndex}`);
                const metaData = await metaRes.json();
                if (metaData.duration > 0) setDuration(metaData.duration);
                if (metaData.subtitles) setEmbeddedSubs(metaData.subtitles);
            } catch (err) {
                console.error("Metadata error", err);
            }
        };
        fetchData();
    }, [infoHash, fileIndex]);

    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;

        // Use logic based on current state to decide, but also trust the video element
        if (videoRef.current.paused) {
            videoRef.current.play();
            setPlaying(true);
            setShowPlayFeedback('play');
        } else {
            videoRef.current.pause();
            setPlaying(false);
            setShowPlayFeedback('pause');
        }
        setTimeout(() => setShowPlayFeedback(null), 500);
    }, []);

    const handleSeek = useCallback((time: number) => {
        let targetTime = Math.max(0, Math.min(time, duration));
        setCurrentTime(targetTime);

        if (isTranscoding && videoRef.current) {
            setSeekOffset(targetTime);
            videoRef.current.src = `${API_BASE}/stream/${infoHash}/${fileIndex}?t=${targetTime}`;
            videoRef.current.play();
            setPlaying(true);
        } else if (videoRef.current) {
            videoRef.current.currentTime = targetTime;
        }
    }, [duration, isTranscoding, infoHash, fileIndex]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setFullscreen(true);
        } else {
            document.exitFullscreen();
            setFullscreen(false);
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (!videoRef.current?.paused) setShowControls(false);
        }, 4000);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    handleSeek(currentTime + (e.shiftKey ? 5 : 10));
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleSeek(currentTime - (e.shiftKey ? 5 : 10));
                    break;
                case ' ':
                    e.preventDefault();
                    togglePlay();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, handleSeek, togglePlay]);

    // 2. Time Update & Subtitle Rendering Logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onTimeUpdate = () => {
            if (isDraggingRef.current) return; // Don't update time while seeking (check ref)
            const absTime = isTranscoding ? seekOffset + video.currentTime : video.currentTime;
            setCurrentTime(absTime);

            // Subtitle Rendering
            if (subtitleCues.length > 0) {
                const targetTime = absTime - subOffset; // Apply offset delay
                const cue = subtitleCues.find(c => targetTime >= c.start && targetTime <= c.end);
                setCurrentSubtitleText(cue ? cue.text : null);
            } else {
                setCurrentSubtitleText(null);
            }
        };

        video.addEventListener('timeupdate', onTimeUpdate);
        return () => video.removeEventListener('timeupdate', onTimeUpdate);
    }, [seekOffset, isTranscoding, subtitleCues, subOffset]);


    // --- Subtitle Actions ---
    const searchSubtitles = async () => {
        if (!subQuery) return;
        setSearchingSubs(true);
        try {
            const res = await fetch(`${API_BASE}/api/subtitles/search?query=${encodeURIComponent(subQuery)}&lang=${subLang}`);
            const data = await res.json();
            setSubtitles(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to search subtitles");
        } finally {
            setSearchingSubs(false);
        }
    };

    const selectSubtitle = async (link: string, id: string) => {
        setSelectedSubId(id);
        setCurrentSubLink(link);
        setSubOffset(0); // Reset offset
        try {
            // Fetch JSON Cues from Backend
            const res = await fetch(`${API_BASE}/api/subtitles/download?link=${encodeURIComponent(link)}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSubtitleCues(data);
                toast.success("Subtitle loaded successfully");
            } else {
                console.error("Invalid subtitle format received");
                setSubtitleCues([]);
                toast.error("Invalid subtitle format");
            }
        } catch (e) {
            console.error(e);
            setSubtitleCues([]);
            toast.error("Failed to download subtitle");
        }
    };

    const selectEmbeddedSubtitle = async (streamIndex: number) => {
        setSelectedSubId(`embedded-${streamIndex}`);
        setCurrentSubLink(null); // No link for embedded
        setSubOffset(0);

        try {
            const res = await fetch(`${API_BASE}/api/stream/${infoHash}/${fileIndex}/sub/${streamIndex}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSubtitleCues(data);
                toast.success("Embedded subtitle loaded");
            } else {
                setSubtitleCues([]);
                toast.error("Failed to load embedded subtitle");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load embedded subtitle");
        }
    };


    const handleAutoSync = async () => {
        if (!currentSubLink || !infoHash) return;
        setIsAutoSyncing(true);
        try {
            const res = await fetch(`${API_BASE}/api/subtitles/autosync?link=${encodeURIComponent(currentSubLink)}&infoHash=${infoHash}&fileIndex=${fileIndex}&currentTime=${currentTime}`);
            const data = await res.json();
            if (data && typeof data.offset === 'number') {
                setSubOffset(data.offset);
                toast.success(`Synced: ${data.offset >= 0 ? '+' : ''}${data.offset.toFixed(2)}s`);
            }
        } catch (e) {
            console.error(e);
            toast.error('Auto Sync Failed');
        } finally {
            setIsAutoSyncing(false);
        }
    };

    const handleContainerClick = (e: React.MouseEvent) => {
        // Prevent toggle if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input') || target.closest('[data-radix-popper-content-wrapper]')) {
            return;
        }

        togglePlay();
    }

    return (
        <div
            ref={containerRef}
            className="group relative w-full h-screen bg-black overflow-hidden flex items-center justify-center font-sans select-none"
            onMouseMove={handleMouseMove}
            onDoubleClick={toggleFullscreen}
            onClick={handleContainerClick}
        >
            <Toaster position="top-center" />

            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src={`${API_BASE}/stream/${infoHash}/${fileIndex}`}
                autoPlay
                crossOrigin="anonymous"
                onPlay={() => { setPlaying(true); setLoading(false); }}
                onPause={() => setPlaying(false)}
                onWaiting={() => setLoading(true)}
                onPlaying={() => setLoading(false)}
                onEnded={() => setPlaying(false)}
            >
                {/* No native tracks anymore */}
            </video>

            {/* Play/Pause Feedback */}
            {showPlayFeedback && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                    <div className="bg-black/50 rounded-full p-6 animate-ping">
                        {showPlayFeedback === 'play' ? (
                            <Play size={48} fill="white" className="text-white ml-1" />
                        ) : (
                            <Pause size={48} fill="white" className="text-white" />
                        )}
                    </div>
                </div>
            )}

            {/* Custom Subtitle Overlay */}
            {currentSubtitleText && (
                <div
                    className="absolute text-center px-4 w-full pointer-events-none"
                    style={{
                        bottom: `${subBottom}%`,
                        zIndex: 30
                    }}
                >
                    <span
                        className="bg-black/50 text-white px-2 py-1 rounded inline-block whitespace-pre-wrap"
                        style={{
                            fontSize: `${(subSize / 100) * 1.5}rem`,
                            textShadow: '0 1px 2px rgba(0,0,0,1)'
                        }}
                    >
                        {currentSubtitleText}
                    </span>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            )}

            {/* Controls Container */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/60 transition-opacity duration-300 pointer-events-none z-10",
                showControls ? "opacity-100" : "opacity-0"
            )} />

            {/* Top Bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 p-6 flex justify-between items-start transition-all duration-300 z-20",
                showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
            )}>

                <button onClick={() => window.location.href = '/'} className="flex items-center gap-3 text-white/80 hover:text-white transition-colors group/back pointer-events-auto">
                    <div className="p-2 bg-white/10 rounded-full group-hover/back:bg-white/20">
                        <ArrowLeft size={20} />
                    </div>
                    <div>
                        <h1 className="font-medium text-lg text-left drop-shadow-md">{fileInfo?.name || "Loading..."}</h1>
                        <p className="text-xs text-white/50 text-left">
                            {isTranscoding ? "Transcoded" : "Direct"} • {fileInfo ? (fileInfo.size / 1024 / 1024).toFixed(1) + " MB" : ""}
                        </p>
                    </div>
                </button>
            </div>

            {/* Bottom Controls */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 px-8 pb-8 pt-20 transition-all duration-300 z-20 flex flex-col gap-2",
                showControls ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            )}>

                {/* Progress Slider */}
                <div className="flex items-center gap-4 group/slider relative pointer-events-auto">
                    <span className="text-white/90 text-xs font-mono w-16 text-right">{formatTime(currentTime)}</span>
                    <div className="relative flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group-hover/slider:h-2.5 transition-all duration-200">
                        <div
                            className="absolute h-full bg-purple-600 rounded-full shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg scale-0 group-hover/slider:scale-100 transition-transform duration-200"
                            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                        />
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onMouseDown={() => { isDraggingRef.current = true; }}
                            onTouchStart={() => { isDraggingRef.current = true; }}
                            onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                            onMouseUp={(e) => {
                                isDraggingRef.current = false;
                                handleSeek(parseFloat((e.target as HTMLInputElement).value));
                            }}
                            onTouchEnd={(e) => {
                                isDraggingRef.current = false;
                                handleSeek(parseFloat((e.target as HTMLInputElement).value));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>

                    <span className="text-white/90 text-xs font-mono w-16">{formatTime(duration)}</span>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-between mt-2 pointer-events-auto">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={togglePlay}
                            className="text-white hover:text-purple-400 transition-transform hover:scale-110 p-3 bg-white/5 rounded-full backdrop-blur-sm"
                        >
                            {playing ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>

                        <div className="flex items-center gap-2 group/vol">
                            <button onClick={() => setMuted(!muted)} className="text-white/70 hover:text-white">
                                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                                <input
                                    type="range" min="0" max="1" step="0.1"
                                    value={muted ? 0 : volume}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value);
                                        setVolume(v);
                                        if (videoRef.current) videoRef.current.volume = v;
                                        setMuted(v === 0);
                                    }}
                                    className="w-full h-1 bg-white/30 rounded-full accent-white cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn("transition-transform hover:scale-110", subtitleCues.length > 0 ? "text-purple-400" : "text-white/70 hover:text-white")}
                                    title="Subtitles"
                                >
                                    <Captions size={24} />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4 bg-black/90 border-white/10 backdrop-blur-md text-white" side="top" align="end">
                                <div className="flex flex-col gap-4">
                                    <div>
                                        <h3 className="font-bold mb-2 flex items-center gap-2"><Captions size={18} /> Subtitles</h3>
                                        <div className="flex gap-2">
                                            <input
                                                className="bg-white/10 border-none rounded px-2 py-1 flex-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                                value={subQuery} onChange={e => setSubQuery(e.target.value)}
                                                placeholder="Search..."
                                                onKeyDown={e => e.key === 'Enter' && searchSubtitles()}
                                            />

                                            {/* Language Flag with Popover (Nested) - simplified for now */}
                                            <div className="relative">
                                                <Popover open={showLangPopover} onOpenChange={setShowLangPopover}>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-lg flex items-center justify-center min-w-[36px]"
                                                            title="Select Language"
                                                        >
                                                            {subLang === 'eng' ? '🇬🇧' : '🇮🇩'}
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-1 bg-black/95 border-white/10" side="top" align="end">
                                                        <div className="flex flex-col gap-1">
                                                            <button
                                                                onClick={() => { setSubLang('eng'); setShowLangPopover(false); }}
                                                                className={cn("flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-white/10", subLang === 'eng' && "bg-purple-600")}
                                                            >
                                                                🇬🇧 English
                                                            </button>
                                                            <button
                                                                onClick={() => { setSubLang('ind'); setShowLangPopover(false); }}
                                                                className={cn("flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-white/10", subLang === 'ind' && "bg-purple-600")}
                                                            >
                                                                🇮🇩 Indonesia
                                                            </button>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <button onClick={searchSubtitles} className="p-1 bg-purple-600 rounded hover:bg-purple-500">
                                                <Search size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="flex-1 overflow-y-auto max-h-[250px] min-h-[150px] border border-white/5 rounded p-1 bg-white/5 custom-scrollbar">
                                        {/* Embedded Subtitles */}
                                        {embeddedSubs.length > 0 && (
                                            <>
                                                <div className="text-[10px] uppercase text-white/30 px-2 py-1 font-bold">Embedded</div>
                                                {embeddedSubs.map(s => (
                                                    <button
                                                        key={`embedded-${s.index}`}
                                                        onClick={() => selectEmbeddedSubtitle(s.index)}
                                                        className={cn(
                                                            "block w-full text-left text-xs p-2 rounded truncate flex items-center justify-between gap-2 mb-1",
                                                            selectedSubId === `embedded-${s.index}` ? "bg-purple-600 text-white" : "hover:bg-white/10 text-white/90"
                                                        )}
                                                    >
                                                        <span className="truncate flex-1" title={s.title || `Track ${s.index}`}>{s.title || `Track ${s.index}`}</span>
                                                        <span className="text-[10px] uppercase bg-white/10 px-1 rounded text-white/70 shrink-0">{s.language || 'UNK'}</span>
                                                    </button>
                                                ))}
                                                {subtitles.length > 0 && <div className="h-px bg-white/5 my-2 mx-1" />}
                                            </>
                                        )}

                                        {/* OpenSubtitles */}
                                        {searchingSubs ? (
                                            <div className="text-center text-xs py-4 text-white/70">Searching online...</div>
                                        ) : (
                                            <>
                                                {subtitles.length > 0 && embeddedSubs.length > 0 && (
                                                    <div className="text-[10px] uppercase text-white/30 px-2 py-1 font-bold">OpenSubtitles</div>
                                                )}

                                                {subtitles.map(s => (
                                                    <button
                                                        key={s.IDSubtitleFile}
                                                        onClick={() => selectSubtitle(s.SubDownloadLink, s.IDSubtitleFile)}
                                                        className={cn(
                                                            "block w-full text-left text-xs p-2 rounded truncate flex items-center justify-between gap-2 mb-1",
                                                            selectedSubId === s.IDSubtitleFile ? "bg-purple-600 text-white" : "hover:bg-white/10 text-white/90"
                                                        )}
                                                    >
                                                        <span className="truncate flex-1" title={s.SubFileName}>{s.SubFileName}</span>
                                                        <span className="text-[10px] uppercase bg-white/10 px-1 rounded text-white/70 shrink-0">{s.LanguageName}</span>
                                                    </button>
                                                ))}

                                                {subtitles.length === 0 && embeddedSubs.length === 0 && (
                                                    <div className="text-center text-xs text-white/50 py-4">No subtitles found</div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Settings */}
                                    <div className="space-y-3 pt-2 border-t border-white/10 text-white">
                                        {/* Offset */}
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white/70">{subOffset >= 0 ? '+' : ''}{subOffset.toFixed(1)}s</span>
                                            <div className="flex gap-1 items-center">
                                                <button
                                                    onClick={handleAutoSync}
                                                    disabled={!currentSubLink || isAutoSyncing}
                                                    className={cn(
                                                        "px-2 py-1 rounded text-xs transition-colors flex items-center gap-1",
                                                        isAutoSyncing ? "bg-purple-500/30 text-purple-300" : "bg-purple-600 text-white hover:bg-purple-500"
                                                    )}
                                                    title="Auto Sync with Audio"
                                                >
                                                    {isAutoSyncing ? <Loader2 size={12} className="animate-spin" /> : "Sync"}
                                                </button>
                                                <button onClick={() => setSubOffset(prev => prev - 0.5)} className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white">-</button>
                                                <button onClick={() => setSubOffset(prev => prev + 0.5)} className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white">+</button>
                                            </div>
                                        </div>

                                        {/* Size */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-white/80">
                                                <Type size={14} /> <span>Size</span>
                                            </div>
                                            <input
                                                type="range" min="50" max="200" step="10"
                                                value={subSize} onChange={e => setSubSize(Number(e.target.value))}
                                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>

                                        {/* Position */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-xs text-white/80">
                                                <ArrowUp size={14} /> <span>Position</span>
                                            </div>
                                            <input
                                                type="range" min="5" max="50" step="1"
                                                value={subBottom} onChange={e => setSubBottom(Number(e.target.value))}
                                                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        <button onClick={toggleFullscreen} className="text-white/70 hover:text-white pointer-events-auto">
                            {fullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
