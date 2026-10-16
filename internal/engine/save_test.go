package engine

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func pendingDocument(t *testing.T) (*Manager, string) {
	t.Helper()
	root := t.TempDir()
	directory := filepath.Join(root, "temporary")
	if err := os.Mkdir(directory, 0700); err != nil {
		t.Fatal(err)
	}
	pending := filepath.Join(directory, "redacted.txt")
	if err := os.WriteFile(pending, []byte("[PERSON_1]\r\n"), 0600); err != nil {
		t.Fatal(err)
	}
	manager := New(root, nil)
	manager.temporaryDirectory = directory
	manager.pendingOutput = pending
	return manager, filepath.Join(root, "saved.txt")
}

func TestSaveRedactedFile(t *testing.T) {
	manager, output := pendingDocument(t)
	directory := manager.temporaryDirectory
	saved, err := manager.SaveRedactedFile(context.Background(), output)
	if err != nil || saved != output || manager.LastOutput() != output {
		t.Fatalf("save failed: path = %q, error = %v", saved, err)
	}
	data, err := os.ReadFile(output)
	if err != nil || string(data) != "[PERSON_1]\r\n" {
		t.Fatal("saved copy differs from the temporary document")
	}
	if _, err := os.Stat(directory); !errors.Is(err, os.ErrNotExist) || manager.pendingOutput != "" {
		t.Fatal("temporary document was not cleaned up")
	}
	manager.DiscardRedaction()
	if _, err := os.Stat(output); err != nil {
		t.Fatal("discard removed the saved copy")
	}
}

func TestFailedSaveCanBeRetried(t *testing.T) {
	for _, target := range []string{"empty", "extension", "existing", "symlink", "missing folder", "cancelled"} {
		t.Run(target, func(t *testing.T) {
			manager, output := pendingDocument(t)
			pending := manager.pendingOutput
			invalid := output
			ctx := context.Background()
			switch target {
			case "empty":
				invalid = ""
			case "extension":
				invalid += ".docx"
			case "existing":
				invalid = pending // Also protects an existing original or redacted file.
			case "symlink":
				invalid = filepath.Join(manager.root, "linked.txt")
				if err := os.Symlink(pending, invalid); err != nil {
					t.Skip("symlinks unavailable")
				}
			case "missing folder":
				invalid = filepath.Join(manager.root, "missing", "saved.txt")
			case "cancelled":
				cancelled, cancel := context.WithCancel(ctx)
				cancel()
				ctx = cancelled
			}
			if _, err := manager.SaveRedactedFile(ctx, invalid); err == nil {
				t.Fatal("invalid save succeeded")
			}
			data, err := os.ReadFile(pending)
			if err != nil || string(data) != "[PERSON_1]\r\n" || manager.LastOutput() != "" {
				t.Fatal("failed save changed the pending document or saved state")
			}
			staged, _ := filepath.Glob(filepath.Join(manager.root, ".ardi-redact-*"))
			if len(staged) != 0 {
				t.Fatal("failed save left a staged file")
			}
			if _, err := manager.SaveRedactedFile(context.Background(), output); err != nil {
				t.Fatalf("retry failed: %v", err)
			}
		})
	}
}

func TestDiscardRedaction(t *testing.T) {
	manager, _ := pendingDocument(t)
	directory := manager.temporaryDirectory
	manager.DiscardRedaction()
	manager.DiscardRedaction()
	if _, err := os.Stat(directory); !errors.Is(err, os.ErrNotExist) || manager.pendingOutput != "" {
		t.Fatal("discard did not clean up the temporary document")
	}
	if _, err := manager.SaveRedactedFile(context.Background(), filepath.Join(manager.root, "saved.txt")); err == nil {
		t.Fatal("save succeeded without a pending document")
	}
}

func TestSaveRejectsConcurrentOperation(t *testing.T) {
	manager, output := pendingDocument(t)
	manager.operation.Lock()
	defer manager.operation.Unlock()
	if _, err := manager.SaveRedactedFile(context.Background(), output); err == nil {
		t.Fatal("concurrent save accepted")
	}
}

func TestFailedRedactionCleansTemporaryFile(t *testing.T) {
	temporaryRoot := t.TempDir()
	t.Setenv("TMPDIR", temporaryRoot)
	t.Setenv("TMP", temporaryRoot)
	t.Setenv("TEMP", temporaryRoot)
	manager := New(t.TempDir(), nil) // No private Python runtime is installed.
	if _, err := manager.Redact(context.Background(), "notes.txt", "en"); err == nil {
		t.Fatal("redaction succeeded without a runtime")
	}
	entries, err := os.ReadDir(temporaryRoot)
	if err != nil || len(entries) != 0 || manager.pendingOutput != "" {
		t.Fatal("failed redaction left a temporary document")
	}
}
