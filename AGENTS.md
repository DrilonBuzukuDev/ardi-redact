# Ardi Redact

This is a GUI application built from the official Wails 2 React/TypeScript template.
Keep `app.go` a thin desktop adapter. Python provisioning and execution belong in
`internal/engine`; platform process handling belongs in `internal/process`.

Frontend API adapters call generated Wails bindings. Hooks own orchestration and
validation. UI components receive props; pages compose them. Shared appearance
comes from `frontend/vendor/designsystem`, copied from Echo. Keep UI vocabulary
simple and put document-related errors beside the file input.

Do not introduce a CLI prerequisite for end users. Setup must work through the
GUI with a private Python environment, progress, retry, and cancellation.
Never log document text, detected personal data, or raw parser exceptions.
Never overwrite originals or existing redacted copies.

Use `go test -race ./internal/...` for service tests. On Linux use the
`webkit2_41` build tag for Wails. `wails generate module -tags webkit2_41` generates
frontend bindings before `pnpm --dir frontend build` or UI tests.
