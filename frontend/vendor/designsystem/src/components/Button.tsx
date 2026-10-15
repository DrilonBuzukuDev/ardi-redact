import { forwardRef } from "react";
import {
  Button as MantineButton,
  createPolymorphicComponent,
  type ButtonProps,
} from "@mantine/core";

export type { ButtonProps } from "@mantine/core";

// Ardi button variants and dimensions are defined once in the shared theme.
export const Button = createPolymorphicComponent<"button", ButtonProps>(
  forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
    <MantineButton loaderProps={{ size: 14 }} ref={ref} {...props} />
  )),
);
