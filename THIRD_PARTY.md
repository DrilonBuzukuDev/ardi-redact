# Included code and downloaded dependencies

The document adapters, detector, and placeholder logic were copied from the
MIT-licensed `ardi-redact-cli` project by Drilon Buzuku. They live in
`internal/engine/python/ardi_redact`, with a dedicated GUI bridge alongside them.
The original MIT license is included at the repository root.

`frontend/vendor/designsystem` is a source snapshot of the sibling Echo
repository's `designsystem` package. It supplies Ardi components, colors, and
typography. The Ardi logo also comes from Echo. No sibling checkout is needed
to build or run this application. Sync changes deliberately rather than editing
generated package contents inside node_modules.

The desktop skeleton and platform installer templates come from Wails 2.15's
official `react-ts` template (MIT license).

Setup downloads uv 0.13.1 from Astral's official GitHub releases and verifies its
SHA-256 release digest. uv downloads a private CPython 3.12 build and installs
spaCy 3.8.16, python-docx 1.2.0, lxml 6.1.3, phonenumbers 9.0.41, and their
dependencies. Each spaCy medium pipeline is version 3.8.0. These components
retain their respective licenses; inspect installed distribution metadata and
the spaCy model cards before redistributing downloaded runtimes/models.

Sources:
- https://github.com/wailsapp/wails
- https://github.com/astral-sh/uv
- https://github.com/astral-sh/python-build-standalone
- https://github.com/explosion/spaCy
- https://github.com/explosion/spacy-models
