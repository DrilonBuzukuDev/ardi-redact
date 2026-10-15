import {
  Alert,
  Box,
  Container,
  Divider,
  Group,
  Radio,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Button, FormErrorMessage } from "@ardi/designsystem";
import {
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  ShieldCheck,
} from "lucide-react";
import { useSetup } from "../hooks/useSetup";
import { SetupPanel } from "../ui/SetupPanel";
import { useRedaction } from "../hooks/useRedaction";
import { fileName } from "../lib/files";
import { DocumentInput } from "../ui/DocumentInput";

const languages = [
  ["en", "English"],
  ["de", "German"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["it", "Italian"],
];

export function RedactPage() {
  const flow = useRedaction();
  const setup = useSetup();
  return (
    <div className="app-shell">
      <Container size={560} w="100%" py="xl" component="main">
        <Stack gap="xl">
          <Stack gap="lg" align="center">
            <img src="/ardi.svg" alt="Ardi" width={138} height={39} />
            <Title order={1} size="h3">
              {setup.ready ? "Choose a file to redact" : "Set up Ardi Redact"}
            </Title>
          </Stack>
          {!setup.ready ? (
            <SetupPanel {...setup} />
          ) : (
            <Box p={{ base: "md", sm: "xl" }}>
              <Stack gap="xl">
                {flow.result ? (
                  <>
                    <Stack gap="sm" role="status">
                      <CheckCircle2
                        size={32}
                        color="var(--mantine-color-success-7)"
                        aria-hidden
                      />
                      <Title order={2}>Your document is ready</Title>
                      <Text size="sm">
                        {Object.values(flow.result.counts).reduce(
                          (sum, count) => sum + count,
                          0,
                        )}{" "}
                        personal details redacted. Your original is unchanged.
                      </Text>
                      <Text fw={600} size="sm">
                        {fileName(flow.result.output)}
                      </Text>
                      <Text size="xs" c="dimmed" className="file-path">
                        {flow.result.output}
                      </Text>
                    </Stack>
                    {flow.result.warnings.length > 0 && (
                      <Alert color="warning" title="Some content needs review">
                        <Stack gap="xs">
                          {flow.result.warnings.map((warning, index) => (
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
                    <Button
                      variant="primary"
                      leftSection={<FolderOpen size={17} aria-hidden />}
                      onClick={flow.reveal}
                    >
                      Go to document folder
                    </Button>
                    <Button variant="subtle" onClick={flow.reset}>
                      Redact another document
                    </Button>
                  </>
                ) : (
                  <>
                    <Stack gap="sm">
                      <Text fw={600} size="sm">
                        Document
                      </Text>
                      <DocumentInput
                        path={flow.path}
                        busy={flow.busy}
                        onSelect={flow.select}
                        error={flow.fileError}
                      />
                    </Stack>
                    <Divider />
                    <Radio.Group
                      label="Document language"
                      description="Choose the language used in your document."
                      value={flow.language}
                      onChange={flow.setLanguage}
                      name="document-language"
                    >
                      <Stack gap="md" mt="md">
                        {languages.map(([code, label]) => (
                          <Radio
                            key={code}
                            value={code}
                            label={label}
                            disabled={flow.busy}
                            color="accent"
                          />
                        ))}
                      </Stack>
                    </Radio.Group>
                    <Stack gap="xs">
                      <Button
                        variant="primary"
                        fullWidth
                        loading={flow.busy}
                        rightSection={<ArrowRight size={17} aria-hidden />}
                        onClick={flow.run}
                      >
                        {flow.busy ? "Redacting document…" : "Redact document"}
                      </Button>
                      <Text size="xs" c="dimmed" ta="center" role="status">
                        {flow.busy
                          ? "Processing locally. This may take a moment."
                          : "A new copy is saved beside your original."}
                      </Text>
                    </Stack>
                  </>
                )}
                <FormErrorMessage>{flow.error}</FormErrorMessage>
              </Stack>
            </Box>
          )}
          <Group gap="xs" justify="center">
            <ShieldCheck size={14} aria-hidden />
            <Text size="xs" c="dimmed">
              Your documents stay on your device.
            </Text>
          </Group>
          {setup.ready && (
            <Button
              variant="subtle"
              size="xs"
              onClick={setup.run}
              disabled={flow.busy}
            >
              Repair setup
            </Button>
          )}
        </Stack>
      </Container>
    </div>
  );
}
