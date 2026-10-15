package engine

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"time"
)

const uvVersion = "0.13.1"

type artifact struct{ Name, SHA256 string }

// Release digests are pinned so setup never executes an unchecked download.
var artifacts = map[string]artifact{
	"linux/amd64":   {"uv-x86_64-unknown-linux-gnu.tar.gz", "eadd9d27c134ab5ac1ffd4473b97a741407f3ea238288f03121fc4deddf90220"},
	"linux/arm64":   {"uv-aarch64-unknown-linux-gnu.tar.gz", "9041c73c99fdc5892cf128140beb354eca9231d502068cc36e6cb53a8e59ad14"},
	"darwin/amd64":  {"uv-x86_64-apple-darwin.tar.gz", "bb7b805bdcf3d0bc8c74ceb94569e6b3e8aa35bd492acdbb9d46bf46d9d4ff6b"},
	"darwin/arm64":  {"uv-aarch64-apple-darwin.tar.gz", "cfe454573412ff7380d15fc7dae5997ab53ffce72fce0a78e91ddbc84001acd2"},
	"windows/amd64": {"uv-x86_64-pc-windows-msvc.zip", "3b2661a463a5baea7f5076ea2b25ab71d77f36a6c0d809e5350651792f80a672"},
	"windows/arm64": {"uv-aarch64-pc-windows-msvc.zip", "ec7846a5939b4654afee24f2d82bf6fde71bd7a6952d7748f1135ab301dd0a49"},
}

func fetch(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	client := &http.Client{Timeout: 10 * time.Minute}
	response, err := client.Do(req)
	if err != nil {
		return nil, errors.New("Check your internet connection and retry setup.")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Download server returned status %d. Retry setup.", response.StatusCode)
	}
	data, err := io.ReadAll(io.LimitReader(response.Body, 100*1024*1024+1))
	if err != nil {
		return nil, err
	}
	if len(data) > 100*1024*1024 {
		return nil, errors.New("Setup tool download exceeds the size limit.")
	}
	return data, nil
}

func verified(data []byte, expected string) bool {
	digest := sha256.Sum256(data)
	return hex.EncodeToString(digest[:]) == expected
}

// Extract only the named executable into memory; never unpack archive paths.
func executable(data []byte, zipped bool, name string) ([]byte, error) {
	if zipped {
		reader, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
		if err != nil {
			return nil, err
		}
		for _, file := range reader.File {
			if path.Base(file.Name) != name || !file.Mode().IsRegular() {
				continue
			}
			stream, err := file.Open()
			if err != nil {
				return nil, err
			}
			result, err := readExecutable(stream)
			stream.Close()
			return result, err
		}
	} else {
		stream, err := gzip.NewReader(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		defer stream.Close()
		reader := tar.NewReader(stream)
		for {
			header, err := reader.Next()
			if err == io.EOF {
				break
			}
			if err != nil {
				return nil, err
			}
			if path.Base(header.Name) == name && header.Typeflag == tar.TypeReg {
				return readExecutable(reader)
			}
		}
	}
	return nil, errors.New("The setup archive does not contain the expected executable.")
}

func readExecutable(reader io.Reader) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(reader, 100*1024*1024+1))
	if err == nil && (len(data) == 0 || len(data) > 100*1024*1024) {
		err = errors.New("Invalid setup executable size.")
	}
	return data, err
}

func (m *Manager) installUV(ctx context.Context) error {
	if info, err := os.Stat(m.uv()); err == nil && info.Mode().IsRegular() {
		return nil
	}
	item, ok := artifacts[runtime.GOOS+"/"+runtime.GOARCH]
	if !ok {
		return errors.New("This platform is not supported yet.")
	}
	data, err := fetch(ctx, "https://github.com/astral-sh/uv/releases/download/"+uvVersion+"/"+item.Name)
	if err != nil {
		return err
	}
	if !verified(data, item.SHA256) {
		return errors.New("Download verification failed. Retry setup.")
	}
	binary, err := executable(data, runtime.GOOS == "windows", filepath.Base(m.uv()))
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(m.uv()), 0700); err != nil {
		return err
	}
	temp, err := os.CreateTemp(filepath.Dir(m.uv()), ".uv-*")
	if err != nil {
		return err
	}
	defer os.Remove(temp.Name())
	if _, err := temp.Write(binary); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Chmod(0700); err != nil {
		temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	return os.Rename(temp.Name(), m.uv())
}
