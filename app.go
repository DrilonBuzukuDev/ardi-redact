package main

import (
	"ardi-redact-wails/internal/engine"
	"ardi-redact-wails/internal/process"
	"context"
	"errors"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"os"
	"path/filepath"
	goruntime "runtime"
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
func (a *App) Redact(path, language string) (engine.Result, error) {
	if a.startupError != nil {
		return engine.Result{}, a.startupError
	}
	return a.engine.Redact(a.ctx, path, language)
}

// Reveal only opens the folder of the last successfully generated document.
func (a *App) RevealDocument() error {
	if a.engine == nil {
		return errors.New("Redact a document first.")
	}
	path := a.engine.LastOutput()
	if path == "" {
		return errors.New("Redact a document first.")
	}
	var name string
	var args []string
	switch goruntime.GOOS {
	case "windows":
		name, args = "explorer.exe", []string{"/select,", path}
	case "darwin":
		name, args = "open", []string{"-R", path}
	default:
		name, args = "xdg-open", []string{filepath.Dir(path)}
	}
	if err := process.Command(a.ctx, name, args...).Run(); err != nil {
		return errors.New("Could not open the document folder. The saved path is shown in the app.")
	}
	return nil
}
