package engine

import (
	"context"
	"sync"
)

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
func (m *Manager) progress(stage string, percent int) {
	if m.emit != nil {
		m.emit(Progress{Stage: stage, Percent: percent})
	}
}
func (m *Manager) LastOutput() string {
	m.state.Lock()
	defer m.state.Unlock()
	return m.lastOutput
}
