package engine

import (
	"ardi-redact-wails/internal/process"
	"context"
	"embed"
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"time"
)

//go:embed python
var sources embed.FS

const environmentVersion = "1-spacy3.8.16-models3.8.0"

func (m *Manager) python() string {
	if runtime.GOOS == "windows" {
		return filepath.Join(m.root, "environment", "Scripts", "python.exe")
	}
	return filepath.Join(m.root, "environment", "bin", "python")
}
func (m *Manager) uv() string {
	name := "uv"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	return filepath.Join(m.root, "tools", name)
}
func (m *Manager) Status(ctx context.Context) Status {
	m.operation.Lock()
	defer m.operation.Unlock()
	marker, err := os.ReadFile(filepath.Join(m.root, "ready"))
	ready := err == nil && string(marker) == environmentVersion && m.probe(ctx) == nil
	return Status{Ready: ready, DataDirectory: m.root}
}
func (m *Manager) probe(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, time.Minute)
	defer cancel()
	names := make([]string, 0, len(languages))
	for _, language := range languages {
		names = append(names, language.Model)
	}
	modelsJSON, _ := json.Marshal(names)
	code := "import spacy, docx, lxml, phonenumbers, importlib.util; names=" + string(modelsJSON) + "; assert all(importlib.util.find_spec(n) for n in names)"
	return process.Command(ctx, m.python(), "-I", "-c", code).Run()
}
func (m *Manager) extractSources() error {
	return fs.WalkDir(sources, "python", func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		target := filepath.Join(m.root, "engine", filepath.FromSlash(path[len("python"):]))
		if entry.IsDir() {
			return os.MkdirAll(target, 0700)
		}
		data, err := sources.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(target, data, 0600)
	})
}
