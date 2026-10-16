#!/usr/bin/env bash
set -euo pipefail

# Run after wails build -tags webkit2_41 from the repository root.
version="${1:-0.1.0}"
architecture="$(dpkg --print-architecture)"
package_dir="$(mktemp -d)"
trap 'rm -rf "$package_dir"' EXIT
install -Dm755 build/bin/ardi-redact "$package_dir/usr/bin/ardi-redact"
install -Dm644 build/appicon.png "$package_dir/usr/share/icons/hicolor/512x512/apps/ardi-redact.png"
install -Dm644 build/appicon.svg "$package_dir/usr/share/icons/hicolor/scalable/apps/ardi-redact.svg"
mkdir -p "$package_dir/DEBIAN" "$package_dir/usr/share/applications"
cat > "$package_dir/DEBIAN/control" <<EOF
Package: ardi-redact
Version: $version
Section: utils
Priority: optional
Architecture: $architecture
Maintainer: Ardi
Depends: libwebkit2gtk-4.1-0, xdg-utils
Description: Local document redaction
 Redact personal details from documents using a private spaCy environment.
 Python and language models are downloaded through the app on first launch.
EOF
cat > "$package_dir/usr/share/applications/ardi-redact.desktop" <<'EOF'
[Desktop Entry]
Name=Ardi Redact
Comment=Redact personal details from documents
Exec=/usr/bin/ardi-redact
Icon=ardi-redact
Terminal=false
Type=Application
Categories=Office;Utility;
StartupWMClass=ardi-redact
EOF
dpkg-deb --build --root-owner-group "$package_dir" "build/bin/ardi-redact_${version}_${architecture}.deb"
