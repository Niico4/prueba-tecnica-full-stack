import { ValidateBy } from "class-validator";

export function IsBcryptInput(): PropertyDecorator {
  return ValidateBy({
    name: "isBcryptInput",
    validator: {
      validate: (value: unknown) =>
        typeof value === "string" &&
        !value.includes("\0") &&
        Buffer.byteLength(value, "utf8") <= 72,
      defaultMessage: () =>
        "password must not contain NUL or exceed 72 UTF-8 bytes",
    },
  });
}
