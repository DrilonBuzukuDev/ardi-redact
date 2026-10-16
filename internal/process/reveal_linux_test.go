package process

import (
	"context"
	"errors"
	"reflect"
	"strings"
	"testing"
)

func TestRevealLinux(t *testing.T) {
	failed := errors.New("unavailable")
	for _, test := range []struct {
		name      string
		showError error
		gioError  error
		xdgError  error
		wantCalls []string
		wantError bool
	}{
		{name: "desktop selects document"},
		{name: "GIO bypasses broken KDE helper", showError: failed,
			wantCalls: []string{"gio|open|/tmp/Ardi files"}},
		{name: "xdg fallback without GIO", showError: failed, gioError: failed,
			wantCalls: []string{"gio|open|/tmp/Ardi files", "xdg-open|/tmp/Ardi files"}},
		{name: "all openers fail", showError: failed, gioError: failed, xdgError: failed,
			wantCalls: []string{"gio|open|/tmp/Ardi files", "xdg-open|/tmp/Ardi files"}, wantError: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			var calls []string
			err := revealLinux(context.Background(), "/tmp/Ardi files/report #1_pii.txt",
				func(ctx context.Context, uri string) error {
					if uri != "file:///tmp/Ardi%20files/report%20%231_pii.txt" {
						t.Fatalf("invalid file URI: %q", uri)
					}
					if _, ok := ctx.Deadline(); !ok {
						t.Fatal("file manager request needs a deadline")
					}
					return test.showError
				}, func(_ context.Context, name string, args ...string) error {
					calls = append(calls, strings.Join(append([]string{name}, args...), "|"))
					if name == "gio" {
						return test.gioError
					}
					return test.xdgError
				})
			if (err != nil) != test.wantError || !reflect.DeepEqual(calls, test.wantCalls) {
				t.Fatalf("calls = %v, error = %v", calls, err)
			}
		})
	}
}

func TestRevealLinuxCancelled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	calls := 0
	err := revealLinux(ctx, "/tmp/report.txt", func(ctx context.Context, _ string) error {
		return ctx.Err()
	}, func(ctx context.Context, _ string, _ ...string) error {
		calls++
		return ctx.Err()
	})
	if !errors.Is(err, context.Canceled) || calls > 1 {
		t.Fatalf("calls = %d, error = %v", calls, err)
	}
}

func TestRevealMissingDocument(t *testing.T) {
	if err := RevealDocument(context.Background(), t.TempDir()+"/moved.txt"); err == nil {
		t.Fatal("missing documents must report an error without opening a folder")
	}
}
