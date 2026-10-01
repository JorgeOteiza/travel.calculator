import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { API_BASE_URL, GOOGLE_CLIENT_ID } from "../config/api";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let gisScriptPromise = null;

// Carga el script de Google Identity Services una sola vez por página,
// aunque Login y Register monten el botón por separado.
const loadGoogleIdentityScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;

  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisScriptPromise = null;
      reject(new Error("No se pudo cargar Google Identity Services"));
    };
    document.head.appendChild(script);
  });

  return gisScriptPromise;
};

/**
 * Botón oficial de "Iniciar sesión con Google", con interacción explícita
 * (sin One Tap ni acceso automático -- fuera de alcance de esta primera
 * versión). Si GOOGLE_CLIENT_ID no está configurado no se renderiza nada:
 * nunca se muestra como operativo un botón que no puede funcionar.
 */
const GoogleSignInButton = ({ disabled, onSuccess, onError, onVerifyingChange }) => {
  const buttonRef = useRef(null);
  const stateRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  const handleCredentialResponse = useCallback(
    async (response) => {
      const state = stateRef.current;
      onVerifyingChange?.(true);
      try {
        const result = await axios.post(
          `${API_BASE_URL}/api/google-login`,
          { credential: response.credential, state },
          { withCredentials: true, timeout: 15000 }
        );
        onSuccess?.(result.data);
      } catch (error) {
        if (error.code === "ECONNABORTED" || !error.response) {
          onError?.("El servidor está tardando más de lo normal. Intenta de nuevo.");
        } else {
          onError?.(
            error.response.data?.error || "No se pudo completar el acceso con Google."
          );
        }
      } finally {
        onVerifyingChange?.(false);
      }
    },
    [onSuccess, onError, onVerifyingChange]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleIdentityScript();
        const nonceResponse = await axios.get(`${API_BASE_URL}/api/google-nonce`, {
          timeout: 10000,
        });
        if (cancelled) return;
        stateRef.current = nonceResponse.data.state;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          nonce: nonceResponse.data.nonce,
          // Botón con interacción explícita (clic), sin One Tap ni
          // selección automática -- esas quedan fuera de esta primera
          // versión a propósito.
          use_fedcm_for_button: true,
        });

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            width: 320,
            text: "continue_with",
          });
        }
        setReady(true);
      } catch {
        if (!cancelled) setScriptFailed(true);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // Se re-inicializa (y se pide un nonce nuevo) solo al montar -- un
    // solo intento de login por montaje del formulario es suficiente para
    // esta primera versión; reintentos tras error recargan la página del
    // formulario, lo que vuelve a montar el componente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-signin" aria-busy={!ready && !scriptFailed}>
      {scriptFailed ? (
        <p className="google-signin__error">
          No se pudo cargar el acceso con Google. Intenta recargar la página.
        </p>
      ) : (
        <div
          ref={buttonRef}
          className="google-signin__button"
          style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }}
          aria-disabled={disabled}
        />
      )}
    </div>
  );
};

GoogleSignInButton.propTypes = {
  disabled: PropTypes.bool,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onVerifyingChange: PropTypes.func,
};

export default GoogleSignInButton;
