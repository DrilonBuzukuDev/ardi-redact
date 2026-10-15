import type { ReactNode } from "react";
import { Text } from "@mantine/core";
import type { TextProps } from "@mantine/core";

export interface FormErrorMessageProps extends Omit<TextProps, "children"> {
  children?: ReactNode;
}

export const FormErrorMessage = ({
  children,
  size = "sm",
  ...props
}: FormErrorMessageProps) => {
  if (!children) {
    return null;
  }

  return (
    <Text role="alert" c="red" size={size} {...props}>
      {children}
    </Text>
  );
};
