// Loads Cloudflare Turnstile on demand and renders a widget into a container.
// No script is loaded when no site key is configured.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(
    container: HTMLElement,
    opts: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi | null> | null = null;

function loadTurnstile(): Promise<TurnstileApi | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile ?? null), { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.addEventListener("load", () => resolve(window.turnstile ?? null), { once: true });
    s.addEventListener("error", () => resolve(null), { once: true });
    document.head.append(s);
  });
  return loading;
}

export interface TurnstileHandle {
  getToken(): string;
  reset(): void;
}

export async function mountTurnstile(
  container: HTMLElement,
  sitekey: string,
  onChange?: (token: string) => void,
): Promise<TurnstileHandle | null> {
  if (!sitekey) return null;
  const api = await loadTurnstile();
  if (!api) return null;
  let token = "";
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  const widgetId = api.render(container, {
    sitekey,
    theme,
    callback: (t) => {
      token = t;
      onChange?.(t);
    },
    "expired-callback": () => {
      token = "";
      onChange?.("");
    },
    "error-callback": () => {
      token = "";
      onChange?.("");
    },
  });
  return {
    getToken: () => token,
    reset: () => {
      token = "";
      api.reset(widgetId);
      onChange?.("");
    },
  };
}
