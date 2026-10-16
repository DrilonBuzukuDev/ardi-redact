# Ardi Redact

A desktop application for local document redaction, built with Wails 2.15,
Go, React, and TypeScript. The GUI installs and manages its own Python runtime,
spaCy, and language models. End users do not install Python, uv, Node, or Go.

## Using the app

1. Install and open Ardi Redact.
2. On first launch, select **Download and set up**. The app downloads private
   Python 3.12, the redaction dependencies, and English, German, Spanish, French,
   and Italian medium spaCy models. Progress is shown; setup can be cancelled
   and retried. Allow several minutes and disk space for the runtime and models.
3. Drop a DOCX, Markdown, TXT, SRT, or VTT file, or select **Select file**.
4. Select the document language and **Redact document**.
5. Select **Go to document folder** to find the new `filename_pii.ext` copy.

Setup happens inside the app on first launch, after the OS installer finishes.
It requires internet access to GitHub and PyPI. Subsequent redaction works
offline. Originals and existing redacted copies are never overwritten.
Missing-file errors appear beside the dropzone. Review warnings and the saved
copy before sharing it: statistical detection can miss personal information.
DOCX metadata and unsupported embedded content are preserved, with warnings.
National phone-number interpretation uses the AT region, as in the original app.

**Go to document folder** reveals the saved copy in Explorer on Windows or
Finder on macOS. On Linux it asks the desktop's file manager to select the copy,
then falls back to opening its folder with GIO or `xdg-open`. The Linux folder
association can be checked with `xdg-mime query default inode/directory`
(for example, `org.kde.dolphin.desktop` means Dolphin).

**Repair setup** reruns dependency/model installation. Installed packages and
cached downloads are reused. App data is stored in the OS user configuration
directory under `ArdiRedact` (`~/.config/ArdiRedact` on Linux,
`~/Library/Application Support/ArdiRedact` on macOS, `%AppData%\ArdiRedact` on
Windows). Setup does not change the system Python or PATH.

## Development

Requires Go 1.25+ (Go can download the required toolchain automatically),
Node 22.12+ or 24+, and pnpm 10. The official Wails CLI is invoked through
`go run`, so no global Wails installation is necessary.

On Ubuntu 24.04 / KDE neon:

```sh
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev
make dev
```

`make dev` uses the `webkit2_41` build tag. Wails generates bindings and installs
frontend dependencies before opening the desktop window. The React app uses
an included snapshot of Echo's design system; no sibling repository is needed.

On Windows or macOS, use their [Wails prerequisites](https://wails.io/docs/gettingstarted/installation/), then:

```sh
go run github.com/wailsapp/wails/v2/cmd/wails@v2.15.0 dev
```

## Structure

```text
main.go                    Wails window and lifecycle configuration
app.go                     Native dialogs and thin frontend bindings
internal/
  engine/                  Private runtime setup, download verification, redaction
    python/                Embedded document engine and JSON bridge
  process/                 OS-specific subprocess configuration
frontend/
  src/api/                 Typed adapters around generated Wails bindings
  src/hooks/               Setup/redaction state and validation
  src/pages/               Workflow composition
  src/ui/                  Presentational components
  vendor/designsystem/     Echo design system source snapshot
  tests/                   Browser workflow checks with mocked Wails bindings
scripts/package-linux.sh   Debian package builder
build/                     Icons and Wails platform installer templates
```

The root layout follows Wails' official `react-ts` template. The Go app layer
has no provisioning logic; the engine service owns setup and subprocesses.
Generated `frontend/wailsjs` bindings and build output are not committed.

## Checks

```sh
make test
make bindings
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
pnpm --dir frontend exec playwright install chromium
pnpm --dir frontend test:e2e
```

Python adapter tests need the dependencies in `requirements-dev.txt` installed
in a development virtual environment; run `python -m pytest tests`.
They use deterministic entities and do not download language models.

To explicitly exercise the full GUI backend installation and real redaction in
all five languages, use an empty temporary directory:

```sh
ARDI_TEST_SETUP_DIR=/tmp/ardi-redact-setup-test go test -v ./internal/engine -run TestSetupIntegration -timeout 25m
```

This integration test downloads several hundred MB and uses the same setup
service as the GUI. Model installation or package errors are reported without
exposing document text. Progress percentages indicate setup stages, not bytes.

## Building installers

Linux (build on Ubuntu 24.04 for the included CI/package configuration):

```sh
make package-linux
sudo apt install ./build/bin/ardi-redact_0.1.0_amd64.deb
```

The Debian package installs a launcher, icon, and application binary, and
declares the WebKitGTK runtime dependency. No development packages are needed
on the end user's computer.

Windows (build on Windows with NSIS installed):

```sh
go run github.com/wailsapp/wails/v2/cmd/wails@v2.15.0 build -nsis
```

macOS (build on macOS):

```sh
go run github.com/wailsapp/wails/v2/cmd/wails@v2.15.0 build
```

`.github/workflows/build.yml` builds platform artifacts on manual dispatch or
version tags. It uploads artifacts to the workflow run and does not publish a
release. Windows/macOS artifacts are unsigned; configure code signing and macOS
notarization before public distribution. Only Linux builds and installation/
redaction have been exercised locally. The included Windows/macOS build paths
must be validated on those platforms.

The setup service supports x64/ARM64 release downloads on Linux, Windows, and
macOS. Python/spaCy availability is checked during setup; unsupported runtime
or wheel combinations report an error rather than marking the app ready.

See [THIRD_PARTY.md](THIRD_PARTY.md) for included code and dependency provenance.
