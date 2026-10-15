import { Text, type TextProps } from "@mantine/core";

export interface HashtagProps extends Omit<TextProps, "children" | "c" | "fw"> {
  children: string;
}

export const Hashtag = ({ children, ...props }: HashtagProps) => (
  <Text
    {...props}
    component="span"
    c="var(--mantine-color-accent-6)"
    fw={500}
  >
    #{children.replace(/^#+/, "")}
  </Text>
);
