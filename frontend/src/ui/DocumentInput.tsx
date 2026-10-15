import { Box, Group, Stack, Text } from "@mantine/core";
import { Button, Dropzone, FormErrorMessage } from "@ardi/designsystem";
import { FileText, Upload } from "lucide-react";
import { fileName } from "../lib/files";

interface Props {
  path: string;
  busy: boolean;
  onSelect: () => void;
  error: string;
}

export function DocumentInput({ path, busy, onSelect, error }: Props) {
  return (
    <Stack gap="sm">
      <Dropzone
        title={path ? fileName(path) : "Drop your document here"}
        description={
          path ? "Ready to redact" : "DOCX, Markdown, TXT, SRT, or VTT"
        }
        icon={
          path ? (
            <FileText size={30} aria-hidden />
          ) : (
            <Upload size={30} aria-hidden />
          )
        }
        onDrop={() => {}}
        onClick={onSelect}
        activateOnClick={false}
        activateOnKeyboard={false}
        tabIndex={-1}
        disabled={busy}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "document-file-error" : undefined}
        data-error={error ? true : undefined}
        className="document-dropzone"
      />
      {error && (
        <div id="document-file-error">
          <FormErrorMessage>{error}</FormErrorMessage>
        </div>
      )}
      <Group justify="space-between" align="center" wrap="wrap">
        <Text size="xs" c="dimmed">
          One document at a time
        </Text>
        <Button
          variant="subtle"
          size="sm"
          onClick={onSelect}
          disabled={busy}
          aria-describedby={error ? "document-file-error" : undefined}
        >
          {path ? "Choose another file" : "Select file"}
        </Button>
      </Group>
      {path && (
        <Box p="sm">
          <Text size="xs" className="file-path">
            {path}
          </Text>
        </Box>
      )}
    </Stack>
  );
}
