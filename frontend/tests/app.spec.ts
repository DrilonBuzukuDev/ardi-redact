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
            Redact: async (path: string, language: string) => {
              calls.push({ path, language });
              return {
                output: "/tmp/meeting_pii.txt",
                counts: { PERSON: 2 },
                warnings: ["Review preserved metadata."],
              };
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
  await expect(
    page.getByRole("img", { name: "Ardi", exact: true }),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "Your document is ready" }),
  ).toBeVisible();
  await expect(page.getByText("Review preserved metadata.")).toBeVisible();
  await page.getByRole("button", { name: "Go to document folder" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { calls: unknown[] }).calls,
    ),
  ).toEqual([{ path: "/tmp/meeting.txt", language: "de" }, "reveal"]);
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
