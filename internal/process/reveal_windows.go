package process

import "context"

func revealDocument(ctx context.Context, path string) error {
	return Command(ctx, "explorer.exe", "/select,"+path).Run()
}
