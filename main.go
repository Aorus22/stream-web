package main

import (
	"embed"
	"flag"
	"io"
	"io/fs"
	"log"
	"net/http"
	"strings"
)

//go:embed dist/**
var embeddedFiles embed.FS

func main() {
	addr := flag.String("addr", ":6431", "HTTP listen address")
	flag.Parse()

	content, err := fs.Sub(embeddedFiles, "dist")
	if err != nil {
		log.Fatalf("failed to prepare embedded filesystem: %v", err)
	}

	fileServer := http.FileServer(http.FS(content))

	// Ensure index.html exists in the embedded filesystem at startup so we fail fast
	idxFile, err := content.Open("index.html")
	if err != nil {
		log.Fatalf("dist/index.html not found in embedded filesystem. Make sure you built the frontend before building this binary. error=%v", err)
	}
	defer idxFile.Close()
	idxBytes, err := io.ReadAll(idxFile)
	if err != nil {
		log.Fatalf("failed to read embedded index.html: %v", err)
	}
	log.Printf("embedded index.html size=%d bytes", len(idxBytes))
	if len(idxBytes) > 0 {
		prefix := string(idxBytes)
		if len(prefix) > 200 {
			prefix = prefix[:200]
		}
		log.Printf("embedded index.html preview: %q", prefix)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if p == "/" {
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(idxBytes)
			return
		}

		// try to open the requested file in the embedded FS
		tryPath := strings.TrimPrefix(p, "/")
		f, err := content.Open(tryPath)
		if err != nil {
			// Fall back to index.html for SPA routing
			log.Printf("path %q not found in embedded FS, falling back to index.html", p)
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write(idxBytes)
			return
		}
		f.Close()
		fileServer.ServeHTTP(w, r)
	})

	log.Printf("Serving embedded static files on %s", *addr)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
