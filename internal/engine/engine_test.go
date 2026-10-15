package engine

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"
)

func TestDownloadVerification(t *testing.T) {
	data := []byte("tool binary")
	digest := sha256.Sum256(data)
	if !verified(data, hex.EncodeToString(digest[:])) {
		t.Fatal("valid digest rejected")
	}
	if verified([]byte("modified"), hex.EncodeToString(digest[:])) {
		t.Fatal("modified download accepted")
	}
}

func TestArchiveOnlyExtractsExpectedExecutable(t *testing.T) {
	var data bytes.Buffer
	gz := gzip.NewWriter(&data)
	archive := tar.NewWriter(gz)
	for _, item := range []struct{ name, body string }{{"../../unwanted", "unwanted"}, {"uv-linux/uv", "expected"}} {
		archive.WriteHeader(&tar.Header{Name: item.name, Mode: 0700, Size: int64(len(item.body))})
		archive.Write([]byte(item.body))
	}
	archive.Close()
	gz.Close()
	result, err := executable(data.Bytes(), false, "uv")
	if err != nil || string(result) != "expected" {
		t.Fatalf("unexpected extraction: %q, %v", result, err)
	}
	if _, err := executable(data.Bytes(), false, "missing"); err == nil {
		t.Fatal("missing executable accepted")
	}
}

func TestWindowsArchive(t *testing.T) {
	var data bytes.Buffer
	archive := zip.NewWriter(&data)
	file, _ := archive.Create("uv.exe")
	file.Write([]byte("windows executable"))
	archive.Close()
	result, err := executable(data.Bytes(), true, "uv.exe")
	if err != nil || string(result) != "windows executable" {
		t.Fatalf("unexpected extraction: %q, %v", result, err)
	}
}

func TestExtractEmbeddedEngine(t *testing.T) {
	root := t.TempDir()
	manager := New(root, nil)
	if err := manager.extractSources(); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"bridge.py", "ardi_redact/formats.py", "ardi_redact/processing.py"} {
		if _, err := os.Stat(filepath.Join(root, "engine", path)); err != nil {
			t.Fatal(err)
		}
	}
}

func TestReadinessRequiresVerifiedEnvironment(t *testing.T) {
	root := t.TempDir()
	manager := New(root, nil)
	if manager.Status(context.Background()).Ready {
		t.Fatal("new environment reported ready")
	}
	os.WriteFile(filepath.Join(root, "ready"), []byte(environmentVersion), 0600)
	if manager.Status(context.Background()).Ready {
		t.Fatal("marker alone reported ready")
	}
}

func TestConcurrentOperationsAreRejected(t *testing.T) {
	manager := New(t.TempDir(), nil)
	manager.operation.Lock()
	defer manager.operation.Unlock()
	if err := manager.Setup(context.Background()); err == nil {
		t.Fatal("concurrent setup accepted")
	}
	if _, err := manager.Redact(context.Background(), "test.txt", "en"); err == nil {
		t.Fatal("concurrent redaction accepted")
	}
}

func TestMissingFileAndInvalidLanguage(t *testing.T) {
	manager := New(t.TempDir(), nil)
	if _, err := manager.Redact(context.Background(), "", "en"); err == nil {
		t.Fatal("missing file accepted")
	}
	if _, err := manager.Redact(context.Background(), "test.txt", "xx"); err == nil {
		t.Fatal("unknown language accepted")
	}
}
