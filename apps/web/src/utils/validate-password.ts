export function validatePassword(
  password: string,
  isRegister: boolean,
): string | null {
  if (new TextEncoder().encode(password).length > 72) {
    return "La contraseña no puede superar los 72 bytes UTF-8.";
  }

  if (password.includes("\0")) {
    return "La contraseña no puede contener caracteres nulos.";
  }

  if (isRegister && !password.trim()) {
    return "La contraseña no puede contener solo espacios.";
  }

  return null;
}
