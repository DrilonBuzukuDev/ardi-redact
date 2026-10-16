package process

import (
	"context"
	"net/url"
	"path/filepath"
	"time"

	"github.com/godbus/dbus/v5"
)

func revealDocument(ctx context.Context, path string) error {
	return revealLinux(ctx, path, showItems, func(ctx context.Context, name string, args ...string) error {
		return Command(ctx, name, args...).Run()
	})
}

func showItems(ctx context.Context, uri string) error {
	conn, err := dbus.SessionBus()
	if err != nil {
		return err
	}
	return conn.Object("org.freedesktop.FileManager1", "/org/freedesktop/FileManager1").
		CallWithContext(ctx, "org.freedesktop.FileManager1.ShowItems", 0, []string{uri}, "").Err
}

func revealLinux(ctx context.Context, path string,
	show func(context.Context, string) error,
	run func(context.Context, string, ...string) error,
) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	// Ask the desktop's file manager to open the folder and select the saved file.
	uri := (&url.URL{Scheme: "file", Path: path}).String()
	showCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	err := show(showCtx, uri)
	cancel()
	if err == nil {
		return nil
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	// Prefer GIO: some KDE xdg-open versions return success even when their
	// selected helper (kfmclient) is missing, leaving the user without a window.
	for _, name := range []string{"gio", "xdg-open"} {
		args := []string{filepath.Dir(path)}
		if name == "gio" {
			args = append([]string{"open"}, args...)
		}
		openCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		err = run(openCtx, name, args...)
		cancel()
		if err == nil {
			return nil
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
	}
	return err
}
