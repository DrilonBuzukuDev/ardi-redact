package process

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"time"
)

// RevealDocument shows an existing document in the platform's file manager.
func RevealDocument(ctx context.Context, path string) error {
	abs, err := filepath.Abs(path)
	if err != nil || path == "" {
		return errors.New("Could not find the saved document.")
	}
	info, err := os.Stat(abs)
	if err != nil || info.IsDir() {
		return errors.New("Could not find the saved document. It may have been moved or deleted.")
	}
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := revealDocument(ctx, abs); err != nil {
		return errors.New("Could not open the document folder. The saved path is shown in the app.")
	}
	return nil
}
