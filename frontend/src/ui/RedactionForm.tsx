import { Divider, Radio, Stack, Text } from "@mantine/core";
import { Button } from "@ardi/designsystem";
import { ArrowRight } from "lucide-react";
import { DocumentInput } from "./DocumentInput";

const languages = [
  ["en", "English"],
  ["de", "German"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["it", "Italian"],
];

interface Props {
  path: string;
  busy: boolean;
  error: string;
  language: string;
  onSelect: () => void;
  onLanguageChange: (language: string) => void;
  onRun: () => void;
}

export function RedactionForm({
  path,
  busy,
  error,
  language,
  onSelect,
  onLanguageChange,
  onRun,
}: Props) {
  return (
    <>
      <Stack gap="sm">
        <Text fw={600} size="sm">
          Document
        </Text>
        <DocumentInput
          path={path}
          busy={busy}
          onSelect={onSelect}
          error={error}
        />
      </Stack>
      <Divider />
      <Radio.Group
        label="Document language"
        description="Choose the language used in your document."
        value={language}
        onChange={onLanguageChange}
        name="document-language"
      >
        <Stack gap="md" mt="md">
          {languages.map(([code, label]) => (
            <Radio
              key={code}
              value={code}
              label={label}
              disabled={busy}
              color="accent"
            />
          ))}
        </Stack>
      </Radio.Group>
      <Stack gap="xs">
        <Button
          variant="primary"
          fullWidth
          loading={busy}
          rightSection={<ArrowRight size={17} aria-hidden />}
          onClick={onRun}
        >
          {busy ? "Redacting document…" : "Redact document"}
        </Button>
        <Text size="xs" c="dimmed" ta="center" role="status">
          {busy
            ? "Processing locally. This may take a moment."
            : "A new copy is saved beside your original."}
        </Text>
      </Stack>
    </>
  );
}
