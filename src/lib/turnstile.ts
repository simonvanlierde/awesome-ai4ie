// Loads Cloudflare Turnstile on demand and renders a widget into a container.
// No script is loaded when no site key is configured.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render(
    container: HTMLElement,
    opts: {
      sitekey: string;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact";
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
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    const timeout = window.setTimeout(() => resolve(null), 8000);
    const finish = (api: TurnstileApi | null) => {
      window.clearTimeout(timeout);
      resolve(api);
    };
    s.addEventListener("load", () => finish(window.turnstile ?? null), { once: true });
    s.addEventListener("error", () => finish(null), { once: true });
    document.head.append(s);
  });
  return loading;
}

export interface TurnstileHandle {
  readonly available: boolean;
  getToken(): string;
  reset(): void;
}

export async function mountTurnstile(
  container: HTMLElement,
  sitekey: string,
  onError: () => void,
): Promise<TurnstileHandle | null> {
  if (!sitekey) return null;
  const api = await loadTurnstile();
  if (!api) return null;
  let token = "";
  const theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
  let failed = false;
  try {
    const widgetId = api.render(container, {
      sitekey,
      theme,
      size: "compact",
      callback: (value) => {
        token = value;
      },
      "expired-callback": () => {
        token = "";
      },
      "error-callback": () => {
        failed = true;
        token = "";
        onError();
      },
    });
    return {
      get available() {
        return !failed;
      },
      getToken: () => token,
      reset: () => {
        token = "";
        api.reset(widgetId);
      },
    };
  } catch {
    return null;
  }
}
