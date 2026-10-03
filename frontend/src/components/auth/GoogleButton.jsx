import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { authApi } from "../../api/endpoints";

const SCRIPT_URL = "https://accounts.google.com/gsi/client";
let scriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = undefined;
        reject(new Error("Could not load Google sign-in"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * "Continue with Google". When the backend has a Google client id (app.google.client-id / GOOGLE_CLIENT_ID)
 * Google's own button is shown; Google gives the browser a signed ID token, which the backend verifies.
 * Without a client id a greyed-out button explains that Google login has not been set up yet.
 */
export default function GoogleButton({ onCredential, text = "continue_with" }) {
  const box = useRef(null);
  const callback = useRef(onCredential);
  const [clientId, setClientId] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let alive = true;
    authApi
      .googleConfig()
      .then((cfg) => alive && cfg.enabled && setClientId(cfg.clientId))
      .catch(() => {})
      .finally(() => alive && setChecked(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    loadGoogleScript()
      .then(() => {
        if (!alive || !box.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callback.current(response.credential),
        });
        window.google.accounts.id.renderButton(box.current, {
          theme: "outline",
          size: "large",
          text,
          shape: "rectangular",
          width: box.current.offsetWidth || 360,
        });
      })
      .catch((err) => toast.error(err.message));
    return () => {
      alive = false;
    };
  }, [clientId, checked, text]);

  if (!checked) return null;
  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      {clientId ? (
        <div ref={box} className="flex w-full justify-center" />
      ) : (
        <button
          type="button"
          onClick={() => toast("Google login isn't set up on this server yet. Add a Google client ID (see README, \"Google login\").", { icon: "ℹ️" })}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-line bg-white text-sm font-semibold text-ink/50"
          title="Google login is not set up yet"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-xs font-bold">G</span>
          {text === "signup_with" ? "Sign up with Google" : "Continue with Google"}
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">not set up</span>
        </button>
      )}
    </div>
  );
}
