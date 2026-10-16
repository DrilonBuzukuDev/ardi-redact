package main

import (
	"ardi-redact/internal/engine"
	"ardi-redact/internal/process"
	"context"
	"errors"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"os"
	"path/filepath"
	"strings"
)

// App only adapts native desktop actions to the engine service.
type App struct {
	ctx          context.Context
	cancel       context.CancelFunc
	engine       *engine.Manager
	startupError error
}

func NewApp() *App { return &App{} }

func (a *App) startup(ctx context.Context) {
	a.ctx, a.cancel = context.WithCancel(ctx)
	root, err := os.UserConfigDir()
	if err != nil {
		a.startupError = errors.New("Could not find your application data folder.")
		return
	}
	a.engine = engine.New(filepath.Join(root, "ArdiRedact"), func(progress engine.Progress) {
		runtime.EventsEmit(a.ctx, "setup:progress", progress)
	})
}

func (a *App) shutdown(context.Context) {
	if a.cancel != nil {
		a.cancel()
	}
	if a.engine != nil {
		a.engine.DiscardRedaction()
	}
}
func (a *App) Status() (engine.Status, error) {
	if a.startupError != nil {
		return engine.Status{}, a.startupError
	}
	return a.engine.Status(a.ctx), nil
}
func (a *App) Setup() error {
	if a.startupError != nil {
		return a.startupError
	}
	return a.engine.Setup(a.ctx)
}
func (a *App) CancelSetup() {
	if a.engine != nil {
		a.engine.CancelSetup()
	}
}
func (a *App) SelectDocument() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Choose a file to redact",
		Filters: []runtime.FileFilter{{DisplayName: "Documents", Pattern: "*.docx;*.md;*.txt;*.srt;*.vtt"}},
	})
}
func (a *App) SelectOutput(path string) (string, error) {
	ext := filepath.Ext(path)
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:            "Save redacted file",
		DefaultDirectory: filepath.Dir(path),
		DefaultFilename:  strings.TrimSuffix(filepath.Base(path), ext) + "_pii" + ext,
		Filters:          []runtime.FileFilter{{DisplayName: "Document", Pattern: "*" + ext}},
	})
}
func (a *App) Redact(path, language string) (engine.Result, error) {
	if a.startupError != nil {
		return engine.Result{}, a.startupError
	}
	return a.engine.Redact(a.ctx, path, language)
}

func (a *App) SaveRedactedFile(output string) (string, error) {
	if a.startupError != nil {
		return "", a.startupError
	}
	return a.engine.SaveRedactedFile(a.ctx, output)
}

func (a *App) DiscardRedaction() {
	if a.engine != nil {
		a.engine.DiscardRedaction()
	}
}

// Reveal only opens the folder of the last successfully saved document.
func (a *App) RevealDocument() error {
	if a.engine == nil {
		return errors.New("Redact a document first.")
	}
	path := a.engine.LastOutput()
	if path == "" {
		return errors.New("Redact a document first.")
	}
	return process.RevealDocument(a.ctx, path)
}
