import "@mantine/dates/styles.layer.css";
import { DateInput as MantineDateInput } from "@mantine/dates";
import type { DateInputProps } from "@mantine/dates";
import type { ChangeEvent } from "react";

const parseDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  return date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day)
    ? `${year}-${month}-${day}`
    : null;
};

const formatInput = (event: ChangeEvent<HTMLInputElement>) => {
  const input = event.currentTarget;
  const caret = input.selectionStart ?? input.value.length;
  const digitsBeforeCaret = input.value
    .slice(0, caret)
    .replaceAll(/\D/g, "").length;
  const digits = input.value.replaceAll(/\D/g, "").slice(0, 8);
  const deleting = (event.nativeEvent as InputEvent).inputType?.startsWith(
    "delete",
  );
  let formatted = digits.slice(0, 2);
  if (digits.length > 2 || (digits.length === 2 && !deleting)) {
    formatted += `/${digits.slice(2, 4)}`;
  }
  if (digits.length > 4 || (digits.length === 4 && !deleting)) {
    formatted += `/${digits.slice(4)}`;
  }

  if (formatted !== input.value) {
    input.value = formatted;
    let nextCaret = digitsBeforeCaret;
    if (digitsBeforeCaret >= 2 && formatted[2] === "/") {
      nextCaret += 1;
    }
    if (digitsBeforeCaret >= 4 && formatted[5] === "/") {
      nextCaret += 1;
    }
    input.setSelectionRange(nextCaret, nextCaret);
  }
};

export const DateInput = (props: DateInputProps) => (
  <MantineDateInput
    {...props}
    inputMode="numeric"
    valueFormat="DD/MM/YYYY"
    dateParser={parseDate}
    onChangeCapture={formatInput}
  />
);

export type { DateInputProps } from "@mantine/dates";
