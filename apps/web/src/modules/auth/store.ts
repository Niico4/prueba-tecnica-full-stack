import axios from "axios";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { getUser } from "./api";
import type { User } from "./types";

type AuthStatus = "checking" | "anonymous" | "authenticated" | "error";

interface AuthState {
  token: string | null;
  user: User | null;
  status: AuthStatus;
  login: (token: string) => Promise<void>;
  logout: () => void;
  restore: () => Promise<void>;
}

let verificationController: AbortController | null = null;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      status: "checking",

      login: async (token) => {
        set({ token, user: null, status: "checking" });
        await get().restore();
      },

      logout: () => {
        verificationController?.abort();
        verificationController = null;

        delete api.defaults.headers.common.Authorization;

        set({
          token: null,
          user: null,
          status: "anonymous",
        });
      },

      restore: async () => {
        verificationController?.abort();

        const token = get().token;

        if (!token) {
          get().logout();
          return;
        }

        const controller = new AbortController();
        verificationController = controller;

        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        set({ user: null, status: "checking" });

        try {
          const user = await getUser(token, controller.signal);

          if (controller.signal.aborted) return;

          set({ user, status: "authenticated" });
        } catch (error) {
          if (controller.signal.aborted) return;

          const unauthorized =
            axios.isAxiosError(error) && error.response?.status === 401;

          if (unauthorized) {
            get().logout();
            return;
          }

          set({ user: null, status: "error" });
        } finally {
          if (verificationController === controller) {
            verificationController = null;
          }
        }
      },
    }),
    {
      name: "valorant-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ token }) => ({ token }),
      skipHydration: true,

      merge: (saved, current) => ({
        ...current,
        token:
          saved &&
          typeof saved === "object" &&
          "token" in saved &&
          typeof saved.token === "string"
            ? saved.token
            : null,
      }),
    },
  ),
);
