package engine

import (
	"ardi-redact/internal/process"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Shared by setup, readiness checks, and redaction validation.
var languages = map[string]struct{ Name, Model string }{
	"en": {"English", "en_core_web_md"}, "de": {"German", "de_core_news_md"},
	"es": {"Spanish", "es_core_news_md"}, "fr": {"French", "fr_core_news_md"},
	"it": {"Italian", "it_core_news_md"},
}

func (m *Manager) CancelSetup() {
	m.state.Lock()
	defer m.state.Unlock()
	if m.cancel != nil {
		m.cancel()
	}
}
func (m *Manager) Setup(ctx context.Context) error {
	if !m.operation.TryLock() {
		return errors.New("Please wait for the current task to finish.")
	}
	defer m.operation.Unlock()
	ctx, cancel := context.WithCancel(ctx)
	m.state.Lock()
	m.cancel = cancel
	m.state.Unlock()
	defer func() { cancel(); m.state.Lock(); m.cancel = nil; m.state.Unlock() }()
	err := m.setup(ctx)
	if ctx.Err() != nil {
		return errors.New("Setup cancelled. You can resume it at any time.")
	}
	return err
}
func (m *Manager) setup(ctx context.Context) error {
	if err := os.MkdirAll(m.root, 0700); err != nil {
		return errors.New("Could not create the app data folder.")
	}
	if err := os.Remove(filepath.Join(m.root, "ready")); err != nil && !os.IsNotExist(err) {
		return err
	}
	m.progress("Downloading setup tools", 3)
	if err := m.installUV(ctx); err != nil {
		return fmt.Errorf("Could not download setup tools: %w", err)
	}
	m.progress("Installing private Python runtime", 12)
	if _, err := os.Stat(m.python()); err != nil {
		if err := m.runUV(ctx, "venv", "--python", "3.12", "--managed-python", filepath.Join(m.root, "environment")); err != nil {
			return errors.New("Could not install Python. Check your internet connection and retry setup.")
		}
	}
	m.progress("Installing the document engine", 25)
	if err := m.runUV(ctx, "pip", "install", "--python", m.python(), "spacy==3.8.16", "python-docx==1.2.0", "lxml==6.1.3", "phonenumbers==9.0.41"); err != nil {
		return errors.New("Could not install the document engine. Check your internet connection and retry setup.")
	}
	for i, code := range []string{"en", "de", "es", "fr", "it"} {
		language := languages[code]
		m.progress("Downloading "+language.Name+" language support", 40+i*10)
		model := language.Model
		url := fmt.Sprintf("https://github.com/explosion/spacy-models/releases/download/%s-3.8.0/%s-3.8.0-py3-none-any.whl", model, model)
		if err := m.runUV(ctx, "pip", "install", "--python", m.python(), url); err != nil {
			return fmt.Errorf("Could not download %s support. Check your internet connection and retry setup.", language.Name)
		}
	}
	m.progress("Checking the installation", 95)
	if err := m.probe(ctx); err != nil {
		return errors.New("Installation verification failed. Retry setup to repair it.")
	}
	if err := m.extractSources(); err != nil {
		return errors.New("Could not install the document engine files.")
	}
	output, err := process.Command(ctx, m.python(), "-I", filepath.Join(m.root, "engine", "bridge.py"), "--verify").Output()
	var verification struct {
		Ready bool `json:"ready"`
	}
	if err != nil || json.Unmarshal(output, &verification) != nil || !verification.Ready {
		return errors.New("Language support verification failed. Retry setup to repair it.")
	}
	if err := os.WriteFile(filepath.Join(m.root, "ready"), []byte(environmentVersion), 0600); err != nil {
		return err
	}
	m.progress("Ready to redact", 100)
	return nil
}
func (m *Manager) runUV(ctx context.Context, args ...string) error {
	command := process.Command(ctx, m.uv(), append([]string{"--no-config", "--no-progress"}, args...)...)
	for _, item := range os.Environ() {
		key := strings.SplitN(item, "=", 2)[0]
		if key == "VIRTUAL_ENV" || strings.HasPrefix(key, "PYTHON") || strings.HasPrefix(key, "UV_") || strings.HasPrefix(key, "PIP_") {
			continue
		}
		command.Env = append(command.Env, item)
	}
	command.Env = append(command.Env,
		"UV_PYTHON_INSTALL_DIR="+filepath.Join(m.root, "python"),
		"UV_CACHE_DIR="+filepath.Join(m.root, "cache"),
		"UV_PYTHON_DOWNLOADS=automatic", "UV_NO_MODIFY_PATH=1")
	return command.Run()
}
