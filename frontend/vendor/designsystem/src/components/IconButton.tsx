import { forwardRef } from "react";
import {
  ActionIcon,
  createPolymorphicComponent,
  type ActionIconProps,
} from "@mantine/core";

export interface IconButtonProps extends ActionIconProps {
  "aria-label": string;
}

export const IconButton = createPolymorphicComponent<"button", IconButtonProps>(
  forwardRef<HTMLButtonElement, IconButtonProps>((props, ref) => (
    <ActionIcon ref={ref} {...props} />
  )),
);
