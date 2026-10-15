package engine

import (
	"ardi-redact-wails/internal/process"
	"context"
	"embed"
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"time"
)

//go:embed python
var sources embed.FS

const environmentVersion = "1-spacy3.8.16-models3.8.0"

type Progress struct {
	Stage   string `json:"stage"`
	Percent int    `json:"percent"`
}
type Status struct {
	Ready         bool   `json:"ready"`
	DataDirectory string `json:"dataDirectory"`
}
type Result struct {
	Output   string         `json:"output"`
	Counts   map[string]int `json:"counts"`
	Warnings []string       `json:"warnings"`
	Error    string         `json:"error,omitempty"`
}

// Manager owns the app's private Python environment, never the user's Python.
type Manager struct {
	root       string
	emit       func(Progress)
	operation  sync.Mutex
	state      sync.Mutex
	cancel     context.CancelFunc
	lastOutput string
}

func New(root string, emit func(Progress)) *Manager { return &Manager{root: root, emit: emit} }
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
func (m *Manager) progress(stage string, percent int) {
	if m.emit != nil {
		m.emit(Progress{Stage: stage, Percent: percent})
	}
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
	code := "import spacy, docx, lxml, phonenumbers, importlib.util; names=['en_core_web_md','de_core_news_md','es_core_news_md','fr_core_news_md','it_core_news_md']; assert all(importlib.util.find_spec(n) for n in names)"
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
func (m *Manager) Redact(ctx context.Context, path, language string) (Result, error) {
	if !m.operation.TryLock() {
		return Result{}, errors.New("Please wait for the current task to finish.")
	}
	defer m.operation.Unlock()
	if _, ok := models[language]; !ok {
		return Result{}, errors.New("Choose a supported document language.")
	}
	if path == "" {
		return Result{}, errors.New("Choose a file to redact.")
	}
	if err := m.extractSources(); err != nil {
		return Result{}, errors.New("Could not prepare the document engine.")
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Minute)
	defer cancel()
	command := process.Command(ctx, m.python(), "-I", filepath.Join(m.root, "engine", "bridge.py"), path, language)
	// Never expose third-party stderr: parser errors can contain document text.
	output, err := command.Output()
	if err != nil {
		return Result{}, errors.New("Could not process the document. Check setup and file permissions.")
	}
	var result Result
	if json.Unmarshal(output, &result) != nil {
		return Result{}, errors.New("The document engine returned an invalid response.")
	}
	if result.Error != "" {
		return Result{}, errors.New(result.Error)
	}
	if result.Output == "" {
		return Result{}, errors.New("No redacted document was produced.")
	}
	m.state.Lock()
	m.lastOutput = result.Output
	m.state.Unlock()
	return result, nil
}
func (m *Manager) LastOutput() string {
	m.state.Lock()
	defer m.state.Unlock()
	return m.lastOutput
}
