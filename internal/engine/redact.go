package engine

import (
	"ardi-redact-wails/internal/process"
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"time"
)

func (m *Manager) Redact(ctx context.Context, path, language string) (Result, error) {
	if !m.operation.TryLock() {
		return Result{}, errors.New("Please wait for the current task to finish.")
	}
	defer m.operation.Unlock()
	if _, ok := languages[language]; !ok {
		return Result{}, errors.New("Choose a supported document language.")
	}
	if path == "" {
		return Result{}, errors.New("Choose a file to redact.")
	}
	m.discardRedaction()
	directory, err := os.MkdirTemp("", "ardi-redact-")
	if err != nil {
		return Result{}, errors.New("Could not create a temporary document. Check available disk space.")
	}
	defer func() {
		if m.temporaryDirectory != directory {
			os.RemoveAll(directory)
		}
	}()
	outputPath := filepath.Join(directory, "redacted"+filepath.Ext(path))
	if err := m.extractSources(); err != nil {
		return Result{}, errors.New("Could not prepare the document engine.")
	}
	ctx, cancel := context.WithTimeout(ctx, 30*time.Minute)
	defer cancel()
	command := process.Command(ctx, m.python(), "-I", filepath.Join(m.root, "engine", "bridge.py"), path, language, outputPath)
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
	m.lastOutput = ""
	m.state.Unlock()
	m.temporaryDirectory = directory
	m.pendingOutput = outputPath
	result.Output = "" // Temporary paths are private to the engine.
	return result, nil
}
