/// <reference path="./css.d.ts" />
import {
  Badge,
  Button,
  Container,
  colorsTuple,
  createTheme,
  Pill,
  Modal,
  Paper,
  NavLink,
  type MantineTheme,
} from "@mantine/core";
import classes from "./theme.module.css";
import palette from "./palette.json";

const radius = "2px";
// Mantine requires ten entries per color tuple; the source palette keeps its nine
// named shades, so repeat the final shade for Mantine's otherwise unused index 9.
const accent = colorsTuple([
  ...palette.colors.accent,
  palette.colors.accent[8],
]);

const colors = {
  neutral: colorsTuple(palette.colors.neutral),
  solar: colorsTuple(palette.colors.solar),
  error: colorsTuple(palette.colors.error),
  warning: colorsTuple(palette.colors.warning),
  success: colorsTuple(palette.colors.success),
  info: colorsTuple(palette.colors.info),
  accent,
  gray: colorsTuple(palette.colors.neutral),
  dark: colorsTuple(palette.colors.neutral),
  red: colorsTuple(palette.colors.error),
  yellow: colorsTuple(palette.colors.warning),
  green: colorsTuple(palette.colors.success),
  teal: colorsTuple(palette.colors.success),
  orange: colorsTuple(palette.colors.warning),
  blue: accent,
  cyan: colorsTuple(palette.colors.info),
};

export const theme = createTheme({
  colors,
  primaryColor: "neutral",
  primaryShade: 7,
  defaultRadius: "sm",
  spacing: {
    section: "2.5rem",
    sectionInset: "1.25rem",
    workflowGap: "10rem",
    workflowPadding: "6rem",
  },
  radius: { xs: radius, sm: radius, md: radius, lg: radius, xl: radius },
  white: palette.colors.white,
  black: palette.colors.neutral[9],
  shadows: {
    xs: "none",
    sm: "none",
    md: "none",
    lg: "none",
    xl: "none",
  },
  fontFamily: "IBM Plex Sans, sans-serif",
  headings: {
    fontFamily: "IBM Plex Sans, sans-serif",
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "1.75rem", lineHeight: "1.2" },
      h2: { fontSize: "1.5rem", lineHeight: "1.2" },
      h3: { fontSize: "1.25rem", lineHeight: "1.2" },
      h4: { fontSize: "1rem", lineHeight: "1.2" },
      h5: { fontSize: "0.875rem", lineHeight: "1.2" },
      h6: { fontSize: "0.75rem", lineHeight: "2.2" },
    },
  },
  components: {
    Container: Container.extend({
      defaultProps: { size: "md", px: { base: 16, sm: 24 } },
    }),
    Button: Button.extend({
      vars: (_theme, props) => ({
        root: {
          ...(props.size === "md" && {
            "--button-height": "var(--button-height-sm)",
            "--button-fz": "var(--mantine-font-size-md)",
          }),
          ...(props.variant === "primary" && {
            "--button-bg": "var(--mantine-color-accent-6)",
            "--button-hover": "var(--mantine-color-accent-7)",
            "--button-color": "var(--mantine-color-neutral-0)",
            "--button-hover-color": "var(--mantine-color-neutral-0)",
            "--button-bd": "1px solid transparent",
          }),
        },
      }),
      classNames: { root: classes.button },
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: "sm",
      },
    }),
    Paper: Paper.extend({
      defaultProps: { bg: "white" },
    }),
    Modal: Modal.extend({
      classNames: { title: classes.modalTitle },
    }),
    Pill: Pill.extend({
      defaultProps: {
        radius: "sm",
      },
    }),
    NavLink: NavLink.extend({
      classNames: { root: classes.navLink },
      vars: () => ({
        root: {
          "--nl-bg": "var(--mantine-color-default-hover)",
          "--nl-hover": "var(--nl-bg)",
          "--nl-color": "var(--mantine-color-neutral-9)",
        },
        children: {},
      }),
    }),
  },
});

export const cssVariablesResolver = (currentTheme: MantineTheme) => ({
  variables: {
    "--mantine-color-heading": currentTheme.colors.neutral[9],
    // Marketing display sizes and content measures supplement Mantine's scale.
    "--ardi-hero-title-size": "clamp(2.425rem, 5.4vw, 4.25rem)",
    "--ardi-section-title-size": "clamp(1.875rem, 3.3vw, 2.625rem)",
    "--ardi-price-size": "2.25rem",
    "--ardi-copy-width": "28rem",
  },
  light: {
    "--mantine-color-text": currentTheme.colors.neutral[9],
    "--mantine-color-body": "#fafafa",
    "--mantine-color-default": currentTheme.colors.neutral[0],
    "--mantine-color-default-hover": "rgba(0, 0, 0, 0.12)",
    "--mantine-color-default-color": currentTheme.colors.neutral[9],
    "--mantine-color-default-border": currentTheme.colors.neutral[2],
    "--mantine-color-placeholder": currentTheme.colors.neutral[5],
    "--mantine-color-dimmed": currentTheme.colors.neutral[5],
    "--mantine-color-disabled": currentTheme.colors.neutral[1],
    "--mantine-color-disabled-color": currentTheme.colors.neutral[5],
    "--mantine-color-disabled-border": currentTheme.colors.neutral[2],
  },
  dark: {
    "--mantine-color-text": currentTheme.colors.neutral[0],
    "--mantine-color-body": currentTheme.colors.neutral[9],
    "--mantine-color-default": currentTheme.colors.neutral[8],
    "--mantine-color-default-hover": currentTheme.colors.neutral[7],
    "--mantine-color-default-color": currentTheme.colors.neutral[0],
    "--mantine-color-default-border": currentTheme.colors.neutral[6],
    "--mantine-color-placeholder": currentTheme.colors.neutral[4],
    "--mantine-color-dimmed": currentTheme.colors.neutral[3],
    "--mantine-color-disabled": currentTheme.colors.neutral[8],
    "--mantine-color-disabled-color": currentTheme.colors.neutral[4],
    "--mantine-color-disabled-border": currentTheme.colors.neutral[6],
  },
});
