import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const callbacks = new Map<string, (value: unknown) => void>();
    let drop: ((x: number, y: number, paths: string[]) => void) | undefined;
    let attempts = 0;
    const calls: unknown[] = [];
    Object.assign(window, {
      calls,
      runtime: {
        EventsOnMultiple: (
          event: string,
          callback: (value: unknown) => void,
        ) => {
          callbacks.set(event, callback);
          return () => callbacks.delete(event);
        },
        OnFileDrop: (callback: typeof drop) => {
          drop = callback;
        },
        OnFileDropOff: () => {
          drop = undefined;
        },
      },
      simulateDrop: (paths: string[]) => drop?.(200, 200, paths),
      go: {
        main: {
          App: {
            Status: async () => ({
              ready: false,
              dataDirectory: "/private/app-data",
            }),
            Setup: async () => {
              attempts++;
              callbacks.get("setup:progress")?.({
                stage: "Downloading language support",
                percent: 50,
              });
              await new Promise((resolve) => setTimeout(resolve, 100));
              if (attempts === 1)
                throw new Error("Download failed. Retry setup.");
            },
            CancelSetup: async () => {},
            SelectDocument: async () => "/tmp/meeting.txt",
            SelectOutput: async (path: string) => {
              calls.push({ save: path });
              return "/chosen/meeting_pii.txt";
            },
            Redact: async (path: string, language: string) => {
              calls.push({ path, language });
              return {
                output: "",
                counts: { PERSON: 2 },
                warnings: ["Review preserved metadata."],
              };
            },
            SaveRedactedFile: async (output: string) => {
              calls.push({ publish: output });
              return output;
            },
            DiscardRedaction: async () => {
              calls.push("discard");
            },
            RevealDocument: async () => {
              calls.push("reveal");
            },
          },
        },
      },
    });
  });
});

test("setup retry, missing-file validation, language, redaction and folder action", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Download and set up" }).click();
  await expect(page.getByRole("alert")).toContainText("Download failed");
  await page.getByRole("button", { name: "Retry setup" }).click();
  const redact = page.getByRole("button", {
    name: "Redact document",
    exact: true,
  });
  await expect(redact).toBeEnabled();
  await redact.click();
  await expect(page.getByRole("alert")).toHaveText("Choose a file to redact.");
  await page.getByRole("button", { name: "Select file", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Choose another file" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("radio", { name: "German", exact: true }).check();
  await redact.click();
  await expect(
    page.getByRole("heading", { name: "2 personal details redacted" }),
  ).toBeVisible();
  await expect(page.getByText("Review preserved metadata.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Go to document folder" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).calls)).toEqual([
    { path: "/tmp/meeting.txt", language: "de" },
  ]);
  await page.getByRole("button", { name: "Save redacted file" }).click();
  await expect(
    page.getByText("/chosen/meeting_pii.txt", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Go to document folder" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { calls: unknown[] }).calls,
    ),
  ).toEqual([
    { path: "/tmp/meeting.txt", language: "de" },
    { save: "/tmp/meeting.txt" },
    { publish: "/chosen/meeting_pii.txt" },
    "reveal",
  ]);
  await page.getByRole("button", { name: "Redact another document" }).click();
  await page.setViewportSize({ width: 380, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("native file-drop validates format and accepts a document", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Download and set up" }).click();
  await page.getByRole("button", { name: "Retry setup" }).click();
  await expect(
    page.getByRole("button", { name: "Select file", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { simulateDrop: (paths: string[]) => void }
    ).simulateDrop(["/tmp/photo.png"]),
  );
  await expect(page.getByRole("alert")).toContainText("Choose a DOCX");
  await page.evaluate(() =>
    (
      window as unknown as { simulateDrop: (paths: string[]) => void }
    ).simulateDrop(["/tmp/notes.docx"]),
  );
  await expect(page.getByText("notes.docx", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("canceling save retains the redacted file and retry does not redact again", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Download and set up" }).click();
  await page.getByRole("button", { name: "Retry setup" }).click();
  await page.getByRole("button", { name: "Select file", exact: true }).click();
  await page
    .getByRole("button", { name: "Redact document", exact: true })
    .click();
  await page.evaluate(() => {
    (window as any).go.main.App.SelectOutput = async () => "";
  });
  const save = page.getByRole("button", { name: "Save redacted file" });
  await save.click();
  await expect(save).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "2 personal details redacted" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Review preserved metadata.",
  );
  expect(await page.evaluate(() => (window as any).calls)).toEqual([
    { path: "/tmp/meeting.txt", language: "en" },
  ]);
  await page.evaluate(() => {
    (window as any).go.main.App.SelectOutput = async () => "/chosen/retry.txt";
  });
  await save.click();
  await expect(
    page.getByRole("button", { name: "Go to document folder" }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls)).toEqual([
    { path: "/tmp/meeting.txt", language: "en" },
    { publish: "/chosen/retry.txt" },
  ]);
});

test("failed save retains the temporary result until starting over", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Download and set up" }).click();
  await page.getByRole("button", { name: "Retry setup" }).click();
  await page.getByRole("button", { name: "Select file", exact: true }).click();
  await page
    .getByRole("button", { name: "Redact document", exact: true })
    .click();
  await page.evaluate(() => {
    (window as any).go.main.App.SaveRedactedFile = async () => {
      throw new Error("A file already exists at this location.");
    };
  });
  const save = page.getByRole("button", { name: "Save redacted file" });
  await save.click();
  await expect(
    page.getByRole("alert").filter({ hasText: "A file already exists" }),
  ).toBeVisible();
  await expect(save).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Go to document folder" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Redact another document" }).click();
  await expect(
    page.getByRole("button", { name: "Select file", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).calls)).toEqual([
    { path: "/tmp/meeting.txt", language: "en" },
    { save: "/tmp/meeting.txt" },
    "discard",
  ]);
});
