import { forwardRef, type ReactNode } from "react";
import { Stack, Text } from "@mantine/core";
import {
  Dropzone as MantineDropzone,
  type DropzoneProps as MantineDropzoneProps,
} from "@mantine/dropzone";
import { Upload } from "lucide-react";
import "@mantine/dropzone/styles.layer.css";

export interface DropzoneProps extends Omit<
  MantineDropzoneProps,
  "children" | "title"
> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

export const Dropzone = forwardRef<HTMLDivElement, DropzoneProps>(
  (
    { title, description, icon = <Upload size={28} aria-hidden />, ...props },
    ref,
  ) => (
    <MantineDropzone p="xl" {...props} ref={ref}>
      <Stack gap="xs" align="center" style={{ pointerEvents: "none" }}>
        {icon}
        <Text fw={600}>{title}</Text>
        {description && (
          <Text c="dimmed" size="sm" ta="center">
            {description}
          </Text>
        )}
      </Stack>
    </MantineDropzone>
  ),
);
