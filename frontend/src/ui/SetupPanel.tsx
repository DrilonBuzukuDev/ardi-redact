import { Loader, Progress, Stack, Text } from "@mantine/core";
import { Button, FormErrorMessage } from "@ardi/designsystem";
import { Download } from "lucide-react";
import type { Progress as SetupProgress } from "../types/setup";

interface Props {
  checking: boolean;
  busy: boolean;
  error: string;
  progress: SetupProgress;
  run: () => void;
  cancel: () => void;
}
export function SetupPanel({
  checking,
  busy,
  error,
  progress,
  run,
  cancel,
}: Props) {
  if (checking)
    return (
      <Stack align="center" role="status">
        <Loader size="sm" />
        <Text size="sm">Checking language support…</Text>
      </Stack>
    );
  return (
    <Stack gap="lg" p="md">
      <Text size="sm">
        Ardi will download everything it needs to redact documents on your
        device.
      </Text>
      <Text size="sm" c="dimmed">
        Includes English, German, Spanish, French, and Italian. The first setup
        needs an internet connection and may take several minutes. After that,
        redaction works offline.
      </Text>
      {busy && (
        <Stack gap="xs" role="status" aria-live="polite">
          <Text size="sm">{progress.stage}</Text>
          <Progress
            value={progress.percent}
            animated
            aria-label="Setup progress"
          />
        </Stack>
      )}
      <FormErrorMessage>{error}</FormErrorMessage>
      <Button
        variant="primary"
        loading={busy}
        leftSection={<Download size={16} aria-hidden />}
        onClick={run}
      >
        {busy ? "Setting up…" : error ? "Retry setup" : "Download and set up"}
      </Button>
      {busy && (
        <Button variant="subtle" onClick={cancel}>
          Cancel setup
        </Button>
      )}
    </Stack>
  );
}
