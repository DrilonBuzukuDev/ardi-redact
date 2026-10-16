import { Alert, Stack, Text, Title } from "@mantine/core";
import { Button } from "@ardi/designsystem";
import { FolderOpen, Save } from "lucide-react";
import { fileName } from "../lib/files";

interface Props {
  output: string;
  total: number;
  busy: boolean;
  onSave: () => void;
  warnings: string[];
  onReveal: () => void;
  onReset: () => void;
}

export function RedactionResult({
  output,
  total,
  busy,
  onSave,
  warnings,
  onReveal,
  onReset,
}: Props) {
  return (
    <>
      <Stack gap="sm" role="status">
        <Title order={1} size="h2">
          {total} personal details redacted
        </Title>
        <Text size="sm">Your original is unchanged.</Text>
        {output && (
          <>
            <Text fw={600} size="sm">
              {fileName(output)}
            </Text>
            <Text size="xs" c="dimmed" className="file-path">
              {output}
            </Text>
          </>
        )}
      </Stack>
      {warnings.length > 0 && (
        <Alert color="warning" title="Some content needs review">
          <Stack gap="xs">
            {warnings.map((warning, index) => (
              <Text size="sm" key={index}>
                {warning}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}
      <Text size="xs" c="dimmed">
        Review the redacted copy before sharing it.
      </Text>
      {output ? (
        <Button
          variant="primary"
          leftSection={<FolderOpen size={17} aria-hidden />}
          onClick={onReveal}
          disabled={busy}
        >
          Go to document folder
        </Button>
      ) : (
        <Button
          variant="primary"
          leftSection={<Save size={17} aria-hidden />}
          onClick={onSave}
          loading={busy}
        >
          Save redacted file
        </Button>
      )}
      <Button variant="default" onClick={onReset} disabled={busy}>
        Redact another document
      </Button>
    </>
  );
}
