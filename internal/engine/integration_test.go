package engine

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// Explicit opt-in: downloads a private Python runtime and all five medium models.
func TestSetupIntegration(t *testing.T) {
	root := os.Getenv("ARDI_TEST_SETUP_DIR")
	if root == "" {
		t.Skip("set ARDI_TEST_SETUP_DIR to enable the download integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()
	manager := New(root, func(p Progress) { t.Logf("%d%% %s", p.Percent, p.Stage) })
	defer manager.DiscardRedaction()
	if err := manager.Setup(ctx); err != nil {
		t.Fatal(err)
	}
	if !manager.Status(ctx).Ready {
		t.Fatal("installed environment is not ready")
	}
	source := filepath.Join(t.TempDir(), "notes.txt")
	original := "John Smith lives in Vienna. Email john@example.com."
	if err := os.WriteFile(source, []byte(original), 0600); err != nil {
		t.Fatal(err)
	}
	for _, language := range []string{"en", "de", "es", "fr", "it"} {
		result, err := manager.Redact(ctx, source, language)
		if err != nil {
			t.Fatalf("%s: %v", language, err)
		}
		if result.Counts["EMAIL"] != 1 {
			t.Fatalf("%s: email not redacted", language)
		}
		if result.Output != "" {
			t.Fatal("temporary path exposed")
		}
		saved, err := manager.SaveRedactedFile(ctx, filepath.Join(filepath.Dir(source), "notes_pii.txt"))
		if err != nil {
			t.Fatal(err)
		}
		os.Remove(saved)
	}
	contents, _ := os.ReadFile(source)
	if string(contents) != original {
		t.Fatal("original was changed")
	}
}
