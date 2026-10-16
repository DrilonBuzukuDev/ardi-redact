package process

import "context"

func revealDocument(ctx context.Context, path string) error {
	return Command(ctx, "open", "-R", path).Run()
}
