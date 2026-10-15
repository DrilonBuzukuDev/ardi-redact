package main

import (
	"embed"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"log"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	err := wails.Run(&options.App{
		Title: "Ardi Redact", Width: 680, Height: 860, MinWidth: 380, MinHeight: 640,
		BackgroundColour:   options.NewRGBA(251, 250, 248, 255),
		AssetServer:        &assetserver.Options{Assets: assets},
		DragAndDrop:        &options.DragAndDrop{EnableFileDrop: true, DisableWebViewDrop: true},
		SingleInstanceLock: &options.SingleInstanceLock{UniqueId: "a4d5d4d1-4ea7-44b3-b422-c6dfb0b4ee7a"},
		OnStartup:          app.startup, OnShutdown: app.shutdown,
		Bind: []interface{}{app},
	})
	if err != nil {
		log.Fatal(err)
	}
}
