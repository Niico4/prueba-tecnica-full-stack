import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  timeout: 15_000,
});

export function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error) || !error.response) {
    return "No pudimos conectar con el servidor. Inténtalo de nuevo.";
  }

  const { status } = error.response;

  switch (status) {
    case 400:
      return "Revisa los datos del formulario e inténtalo de nuevo.";
    case 401:
      return "El usuario o la contraseña no son correctos.";
    case 409:
      return "Ese usuario o email ya está registrado.";
    case 429:
      return "Demasiados intentos. Espera un momento antes de continuar.";
    default:
      return "El servicio no está disponible en este momento. Inténtalo de nuevo.";
  }
}
