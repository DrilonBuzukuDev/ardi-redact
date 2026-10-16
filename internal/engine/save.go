package engine

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// SaveRedactedFile publishes a complete copy without replacing an existing file.
// The pending document remains available after cancellation or a failed save.
func (m *Manager) SaveRedactedFile(ctx context.Context, output string) (string, error) {
	if !m.operation.TryLock() {
		return "", errors.New("Please wait for the current task to finish.")
	}
	defer m.operation.Unlock()
	if m.pendingOutput == "" {
		return "", errors.New("Redact a document first.")
	}
	if output == "" {
		return "", errors.New("Choose where to save the redacted document.")
	}
	if !strings.EqualFold(filepath.Ext(m.pendingOutput), filepath.Ext(output)) {
		return "", errors.New("Save the redacted document with the same file extension as the original.")
	}
	output, err := filepath.Abs(output)
	if err != nil {
		return "", errors.New("Could not access the save location. Choose another folder.")
	}
	if err := publishFile(ctx, m.pendingOutput, output); err != nil {
		if errors.Is(err, os.ErrExist) {
			return "", errors.New("A file already exists at this location. Choose a different name or folder.")
		}
		return "", errors.New("Could not save the redacted file. Check folder permissions and available disk space, then retry.")
	}
	m.state.Lock()
	m.lastOutput = output
	m.state.Unlock()
	m.discardRedaction()
	return output, nil
}

func publishFile(ctx context.Context, source, output string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	input, err := os.Open(source)
	if err != nil {
		return err
	}
	defer input.Close()
	staged, err := os.CreateTemp(filepath.Dir(output), ".ardi-redact-*")
	if err != nil {
		return err
	}
	defer os.Remove(staged.Name())
	defer staged.Close()
	if _, err := io.Copy(staged, input); err != nil {
		return err
	}
	if err := staged.Sync(); err != nil {
		return err
	}
	if err := staged.Close(); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	// Staging in the destination folder also supports saving across filesystems.
	return os.Link(staged.Name(), output)
}

func (m *Manager) DiscardRedaction() {
	m.operation.Lock()
	defer m.operation.Unlock()
	m.discardRedaction()
}

// Caller holds operation so a save cannot race temporary-file cleanup.
func (m *Manager) discardRedaction() {
	if m.temporaryDirectory != "" {
		os.RemoveAll(m.temporaryDirectory)
	}
	m.temporaryDirectory = ""
	m.pendingOutput = ""
}
