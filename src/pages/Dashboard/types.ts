export type TorrentFile = {
    name: string;
    length: number;
    progress: number;
    piecesReady: number;
    piecesTotal: number;
};

export type Torrent = {
    infoHash: string;
    name: string;
    magnetUri: string;
    totalLength: number;
    downloaded: number;
    downloadSpeed: number;
    progress: number;
    peers: number;
    files: TorrentFile[];
};

export type CachedFile = {
    name: string;
    path: string;
    size: number;
    type: 'magnet' | 'direct' | 'export';
    infoHash?: string;
    fileIndex?: number;
    downloadId?: number;
    progress?: number;
    status?: string;
    streamUrl: string;
    canPlay: boolean;
};

export type CacheStats = {
    totalSize: number;
    fileCount: number;
    cacheDir: string;
};

export type DirectDownload = {
    id: number;
    url: string;
    filename: string;
    status: 'downloading' | 'completed' | 'failed' | 'missing' | 'orphan' | 'on_demand';
    progress: number;
    downloadedBytes: number;
    totalBytes: number;
    filePath: string;
    addedAt: string;
    completedAt?: string;
};
