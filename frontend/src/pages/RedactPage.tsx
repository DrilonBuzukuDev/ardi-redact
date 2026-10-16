import { Box, Container, Group, Stack, Text, Title } from "@mantine/core";
import { Button, FormErrorMessage } from "@ardi/designsystem";
import { ShieldCheck } from "lucide-react";
import { useSetup } from "../hooks/useSetup";
import { useRedaction } from "../hooks/useRedaction";
import { SetupPanel } from "../ui/SetupPanel";
import { RedactionForm } from "../ui/RedactionForm";
import { RedactionResult } from "../ui/RedactionResult";

export function RedactPage() {
  const flow = useRedaction();
  const setup = useSetup();
  return (
    <div className="app-shell">
      <Container size={560} w="100%" py="xl" component="main">
        <Stack gap="xl">
          {!setup.ready ? (
            <>
              <Title order={1} size="h3" ta="center">
                Set up Ardi Redact
              </Title>
              <SetupPanel {...setup} />
            </>
          ) : (
            <Box p={{ base: "md", sm: "xl" }}>
              <Stack gap="xl">
                {flow.result ? (
                  <RedactionResult
                    output={flow.result.output}
                    total={flow.total}
                    warnings={flow.result.warnings}
                    onReveal={flow.reveal}
                    onReset={flow.reset}
                  />
                ) : (
                  <RedactionForm
                    path={flow.path}
                    busy={flow.busy}
                    error={flow.fileError}
                    language={flow.language}
                    onSelect={flow.select}
                    onLanguageChange={flow.setLanguage}
                    onRun={flow.run}
                  />
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
