import { Group, type GroupProps } from "@mantine/core";

export type FormActionsProps = GroupProps;

export const FormActions = (props: FormActionsProps) => (
  <Group justify="flex-end" gap="xs" {...props} />
);
