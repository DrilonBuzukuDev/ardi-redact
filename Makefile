WAILS = go run github.com/wailsapp/wails/v2/cmd/wails@v2.15.0
TAGS ?= webkit2_41

.PHONY: dev build bindings test ui-test package-linux
dev:
	$(WAILS) dev -tags $(TAGS)
build:
	$(WAILS) build -tags $(TAGS)
bindings:
	$(WAILS) generate module -tags $(TAGS)
test:
	go test -race ./internal/...
ui-test: bindings
	cd frontend && pnpm install --frozen-lockfile && pnpm test:e2e
package-linux: build
	bash scripts/package-linux.sh
