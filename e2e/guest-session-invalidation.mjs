// Prueba E2E reproducible (navegador real, Playwright + Chromium) para la
// corrección del token inválido durante el cálculo autenticado.
//
// Cubre, en un único recorrido, las pruebas A/B/C acordadas:
//   A) Sesión válida: calculate-and-save guarda, aparece en el historial,
//      Navbar muestra al usuario autenticado.
//   B) Token corrompido en localStorage (sin recargar): calculate-and-save
//      responde 401, se hace UN fallback a /trips/calculate, el resultado
//      muestra "No guardado" + aviso de sesión expirada, el Navbar refleja
//      la sesión cerrada de inmediato, sin redirigir a /login, y token/user
//      desaparecen de localStorage.
//   C) Un cálculo posterior, sin recargar ni volver a iniciar sesión, va
//      DIRECTO a /trips/calculate (nunca intenta calculate-and-save).
//
// Uso:
//   1. Verifica aparte (este script no lee .env) que SQLALCHEMY_DATABASE_URI
//      del backend apunta a la base LOCAL de desarrollo, nunca a Neon.
//   2. Arranca el backend (pipenv run dev) y el frontend (npm run dev) --
//      este script NO los inicia por sí mismo, solo comprueba que respondan.
//   3. node e2e/guest-session-invalidation.mjs
//   4. Cuando se abra Chromium en /login, escribe ahí mismo el correo y la
//      contraseña de una cuenta LOCAL de prueba y haz clic en "Resume" (▶)
//      en el Inspector de Playwright.
//
// Este script es INTERACTIVO, no apto para CI ni para ejecución
// desatendida: el paso de login requiere intervención humana real en la
// ventana del navegador cada vez que se ejecuta.
//
// Requisitos previos (no los crea este script):
//   - Backend Flask corriendo en http://localhost:5000, apuntando a la base
//     LOCAL de desarrollo (verificar aparte, nunca Neon/producción).
//   - Frontend Vite corriendo en http://localhost:5173.
//   - Una cuenta local de prueba cuya contraseña conoce la persona que
//     ejecuta el script -- este script NUNCA la solicita, la escribe ni la
//     registra: pausa el navegador para que se escriba a mano.
//
// Objetivo fijo a localhost: FRONTEND_URL y BACKEND_URL están escritos como
// literales "http://localhost" en este archivo, sin indirección por
// variables de entorno ni argumentos de línea de comandos -- no hay forma
// de apuntar este script a producción sin editar el código fuente. Además,
// checkTargetsAreLocal() lo verifica explícitamente en tiempo de ejecución.
//
// Aislamiento de proveedores externos:
//   - Google Maps (Places/Directions/Geocoder) se sustituye por completo
//     mediante window.google inyectado mock antes de que cargue la app:
//     cero llamadas reales a Google en toda la ejecución.
//   - El clima/elevación (Open-Meteo) se calculan del lado del backend, no
//     son interceptables desde el navegador; Open-Meteo es gratuito y sin
//     clave (documentado así en el propio README del proyecto), así que se
//     deja pasar real -- no representa un consumo de cuota.
//
// No se escribe ningún token, contraseña ni dato personal en este archivo,
// en su salida de consola ni en el reporte que genera.

import { chromium } from "playwright";

const FRONTEND_URL = "http://localhost:5173";
const BACKEND_URL = "http://localhost:5000";
const FAKE_POLYLINE = "nedkE~wgnL_`qAnylD"; // Santiago -> Valparaíso (real, decodificable)
const ORIGIN_LABEL = "Origen Playwright E2E";
const DESTINATION_LABEL = "Destino Playwright E2E";
const TEST_BRAND = "PlaywrightTest";
const TEST_MODEL = "SesionInvalidacion";

const PASS = [];
const FAIL = [];
const check = (label, condition, detail = "") => {
  (condition ? PASS : FAIL).push(label);
  console.log((condition ? "OK   - " : "FAIL - ") + label + (!condition && detail ? ` :: ${detail}` : ""));
};

const installGoogleMapsMock = async (page) => {
  await page.addInitScript(
    ({ originLabel, destinationLabel, polyline }) => {
      const FIXTURES = {
        [originLabel]: { lat: -33.45, lng: -70.66 },
        [destinationLabel]: { lat: -33.03, lng: -71.55 },
      };
      const PlacesServiceStatus = { OK: "OK" };

      class AutocompleteSessionToken {}

      class AutocompleteService {
        getPlacePredictions(request, callback) {
          const text = request.input;
          setTimeout(() => {
            callback([{
              place_id: `mock:${encodeURIComponent(text)}`,
              description: text,
              structured_formatting: { main_text: text, secondary_text: "Simulado (E2E)" },
            }], PlacesServiceStatus.OK);
          }, 10);
        }
      }

      class PlacesService {
        constructor() {}
        getDetails(request, callback) {
          const label = decodeURIComponent(String(request.placeId).replace("mock:", ""));
          const coords = FIXTURES[label] || { lat: -33.45, lng: -70.66 };
          setTimeout(() => {
            callback({
              geometry: { location: { lat: () => coords.lat, lng: () => coords.lng } },
              formatted_address: label,
              name: label,
            }, PlacesServiceStatus.OK);
          }, 10);
        }
      }

      class DirectionsService {
        route(_request, callback) {
          setTimeout(() => callback({ routes: [{ overview_polyline: polyline }] }, "OK"), 10);
        }
      }

      class DirectionsRenderer {
        setMap() {}
        setDirections() {}
      }

      class Geocoder {
        geocode(_request, callback) {
          setTimeout(() => callback([{ formatted_address: "Ubicación simulada (E2E)" }], "OK"), 10);
        }
      }

      class MapClass {
        constructor(_el, opts) { this._center = opts?.center; this._zoom = opts?.zoom; }
        setCenter(c) { this._center = c; }
        panTo(c) { this._center = c; }
        setZoom(z) { this._zoom = z; }
        getZoom() { return this._zoom; }
      }

      class Marker {
        constructor(opts) { Object.assign(this, opts); }
        setMap() {}
        setPosition(p) { this.position = p; }
      }

      window.google = {
        maps: {
          Map: MapClass,
          Marker,
          DirectionsService,
          DirectionsRenderer,
          Geocoder,
          TravelMode: { DRIVING: "DRIVING" },
          event: { trigger: () => {} },
          places: { AutocompleteService, PlacesService, PlacesServiceStatus, AutocompleteSessionToken },
        },
      };
      window.__E2E_GOOGLE_MOCKED__ = true;
    },
    { originLabel: ORIGIN_LABEL, destinationLabel: DESTINATION_LABEL, polyline: FAKE_POLYLINE },
  );
};

const dismissLocationConsent = async (page) => {
  // El diálogo "¿Quieres usar tu ubicación actual?" (GoogleMapSection.jsx,
  // locationStatus === "idle") cubre parte de la página e intercepta clics
  // hasta que se descarta. No es parte de lo que estas pruebas verifican.
  const decline = page.getByRole("button", { name: "Ahora no" });
  if (await decline.isVisible().catch(() => false)) {
    await decline.click();
  }
};

const waitForSuggestions = async (page, timeout) =>
  page.locator(".map-address-suggestions button").first()
    .waitFor({ state: "visible", timeout })
    .then(() => true)
    .catch(() => false);

const selectAddress = async (page, placeholder, value, label) => {
  const input = page.getByPlaceholder(placeholder);
  // Foco explícito antes de escribir: activeSearch (y por lo tanto el
  // dropdown) depende del evento focus del campo correspondiente.
  await input.click();
  await input.fill(value);
  let appeared = await waitForSuggestions(page, 8000);
  if (!appeared) {
    // Reintento único: vuelve a enfocar y reescribir por si el primer
    // input se perdió por una condición de carrera con el campo anterior.
    await input.click();
    await input.fill("");
    await input.fill(value);
    appeared = await waitForSuggestions(page, 8000);
  }
  if (!appeared) {
    const mocked = await page.evaluate(() => window.__E2E_GOOGLE_MOCKED__).catch(() => "eval-failed");
    const mapError = await page.locator(".map-error").isVisible().catch(() => false);
    const mapErrorText = mapError ? await page.locator(".map-error").innerText().catch(() => "") : "";
    console.log(`DIAG (${label}): window.__E2E_GOOGLE_MOCKED__=${mocked} map-error-visible=${mapError} map-error-text="${mapErrorText}" input-value="${await input.inputValue().catch(() => "?")}"`);
    throw new Error(`No aparecieron sugerencias de dirección para '${label}' (ver diagnóstico arriba)`);
  }
  await page.locator(".map-address-suggestions button").first().click();
  await page.waitForTimeout(300);
};

const fillCustomVehicleTrip = async (page) => {
  await dismissLocationConsent(page);

  const toggle = page.getByRole("button", { name: "No encuentro mi vehículo" });
  await toggle.waitFor({ state: "visible", timeout: 10000 });
  await toggle.click();
  await page.locator("#customBrand").waitFor({ state: "visible", timeout: 10000 });

  await page.locator("#customBrand").fill(TEST_BRAND);
  await page.locator("#customModel").fill(TEST_MODEL);
  await page.locator("#customYear").fill("2022");
  await page.locator("#customFuelType").selectOption("gasoline");
  await page.locator("#customConsumptionValue").fill("8.5");

  await page.locator(".fuel-field", { hasText: "Octanaje" }).locator(".custom-select__control").click();
  await page.keyboard.type("93");
  await page.getByText("Gasoline 93", { exact: true }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByText("Gasoline 93", { exact: true }).click();

  await page.locator("#fuelPrice").fill("1250");

  await selectAddress(page, "Ubicación de inicio", ORIGIN_LABEL, "origen");
  await selectAddress(page, "Destino", DESTINATION_LABEL, "destino");

  // Espera a que el mock de DirectionsService resuelva route_polyline.
  await page.waitForTimeout(600);
};

// Rechazo explícito de objetivos no locales: aunque FRONTEND_URL/BACKEND_URL
// ya están escritos como literales localhost (no configurables desde fuera),
// esta comprobación en tiempo de ejecución es la que hace ese rechazo
// explícito en vez de solo implícito, y detiene el script con un mensaje
// claro si alguna vez cambiaran.
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);
const assertLocalTarget = (url) => {
  const { hostname } = new URL(url);
  if (!LOCAL_HOSTNAMES.has(hostname)) {
    throw new Error(
      `Objetivo rechazado: '${url}' no es localhost. Este script está diseñado ` +
      "para ejecutarse únicamente contra un entorno de desarrollo local.",
    );
  }
};

// Preflight: confirma que ambos servidores locales responden ANTES de abrir
// el navegador y pedir un login manual, con un mensaje accionable si no.
const assertServersReachable = async () => {
  const targets = [
    [FRONTEND_URL, "frontend (¿corriste 'npm run dev'?)"],
    [`${BACKEND_URL}/api/`, "backend (¿corriste 'pipenv run dev'?)"],
  ];
  for (const [url, hint] of targets) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok && response.status !== 404) {
        throw new Error(`respuesta ${response.status}`);
      }
    } catch (error) {
      throw new Error(`No se pudo conectar a ${url} -- ${hint}. Detalle: ${error.message}`);
    }
  }
};

const isNavbarAuthenticated = async (page) => {
  const collapse = page.locator("#navbarNav");
  if (!(await collapse.isVisible().catch(() => false))) {
    await page.locator(".navbar-toggler").click().catch(() => {});
  }
  const authenticated = await page.locator(".navbar-logout").isVisible().catch(() => false);
  const guest = await page.getByRole("link", { name: "Ingresar" }).isVisible().catch(() => false);
  return { authenticated, guest };
};

async function main() {
  assertLocalTarget(FRONTEND_URL);
  assertLocalTarget(BACKEND_URL);
  await assertServersReachable();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.text().startsWith("MOCK")) {
      console.log("[browser]", msg.type(), msg.text());
    }
  });
  page.on("pageerror", (err) => console.log("[browser pageerror]", err.message));

  await installGoogleMapsMock(page);

  /** @type {{phase: string, method: string, url: string, hasAuth: boolean, status: number|null}[]} */
  const apiCalls = [];
  let currentPhase = "setup";
  const entryByRequest = new Map();

  // Se captura la fase y la cabecera Authorization de forma SÍNCRONA en el
  // evento "request" (antes de cualquier await): currentPhase puede haber
  // avanzado para cuando "requestfinished" complete sus propios awaits, así
  // que no es seguro leerlo ahí. El status se rellena aparte, sobre la
  // MISMA entrada (por referencia al objeto request), cuando la respuesta
  // esté disponible.
  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/api/trips/calculate")) return;
    const entry = {
      phase: currentPhase,
      method: request.method(),
      url: url.replace(/^https?:\/\/[^/]+/, ""),
      hasAuth: Boolean(request.headers()["authorization"]),
      status: null,
    };
    entryByRequest.set(request, entry);
    apiCalls.push(entry);
  });

  page.on("requestfinished", async (request) => {
    const entry = entryByRequest.get(request);
    if (!entry) return;
    try {
      const response = await request.response();
      entry.status = response ? response.status() : null;
    } catch { /* ignore */ }
  });

  console.log(`\n=== Navegando a ${FRONTEND_URL}/login ===`);
  await page.goto(`${FRONTEND_URL}/login`);

  console.log("\n>>> ACCIÓN MANUAL REQUERIDA <<<");
  console.log("Escribe el correo y la contraseña de tu cuenta LOCAL de prueba");
  console.log("directamente en la ventana del navegador que se abrió, y presiona");
  console.log("'Login'. Cuando la sesión haya iniciado (verás la app), haz clic");
  console.log("en 'Resume' (▶) en el Inspector de Playwright para continuar.");
  await page.pause();

  const loggedIn = await page.waitForFunction(
    () => window.localStorage.getItem("token") !== null,
    { timeout: 120000 },
  ).then(() => true).catch(() => false);

  if (!loggedIn) {
    check("Login manual completado (token presente en localStorage)", false);
    console.log("\nNo se detectó un login exitoso dentro del tiempo de espera. Abortando sin ejecutar A/B/C.");
    await browser.close();
    process.exit(1);
  }
  check("Login manual completado (token presente en localStorage)", true);

  try {
  // ============================================================
  console.log("\n=== PRUEBA A: sesión válida ===");
  currentPhase = "A";
  await page.goto(`${FRONTEND_URL}/calculadora`);
  await page.waitForLoadState("networkidle");

  const navBeforeA = await isNavbarAuthenticated(page);
  check("A: Navbar muestra usuario autenticado ANTES de calcular", navBeforeA.authenticated, JSON.stringify(navBeforeA));

  await fillCustomVehicleTrip(page);
  await page.getByRole("button", { name: /Calcular viaje/ }).click();
  await page.waitForURL(/\/resultado/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300); // deja asentar el status async de la última petición

  const callsA = apiCalls.filter((c) => c.phase === "A");
  const authSaveCallA = callsA.find((c) => c.url.endsWith("/trips/calculate-and-save"));
  check("A: se llamó a /trips/calculate-and-save", Boolean(authSaveCallA), JSON.stringify(callsA));
  check("A: calculate-and-save respondió 2xx", authSaveCallA?.status === 201, authSaveCallA?.status);
  check("A: la petición incluyó Authorization", authSaveCallA?.hasAuth === true);

  const bodyTextA = await page.locator("body").innerText();
  check("A: el resultado NO muestra 'No guardado'", !/no guardado/i.test(bodyTextA), bodyTextA.slice(0, 120));

  const navAfterA = await isNavbarAuthenticated(page);
  check("A: Navbar sigue mostrando usuario autenticado DESPUÉS de calcular", navAfterA.authenticated, JSON.stringify(navAfterA));

  console.log("\n=== Verificando historial y limpiando el viaje de prueba ===");
  await page.goto(`${FRONTEND_URL}/profile`);
  await page.waitForLoadState("networkidle");
  const testCard = page.locator(".trip-card", { hasText: TEST_BRAND }).first();
  const appearsInHistory = await testCard.isVisible().catch(() => false);
  check("A: el viaje de prueba aparece en el historial", appearsInHistory);

  let cleanedUp = false;
  if (appearsInHistory) {
    await testCard.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.waitForTimeout(500);
    cleanedUp = !(await page.locator(".trip-card", { hasText: TEST_BRAND }).first().isVisible().catch(() => false));
    check("A: el viaje de prueba se eliminó correctamente (mecanismo habitual de la app)", cleanedUp);
  }

  // ============================================================
  console.log("\n=== PRUEBA B: token inválido en localStorage (sin recargar) ===");
  currentPhase = "B";
  await page.goto(`${FRONTEND_URL}/calculadora`);
  await page.waitForLoadState("networkidle");

  // Invalida el token REALMENTE (revocación del lado del servidor vía
  // /api/logout), en vez de sustituirlo por una cadena inventada: un token
  // mal formado y uno expirado no son el mismo caso para
  // Flask-JWT-Extended (422 vs 401 -- ver diagnóstico previo), y "sesión
  // expirada" es específicamente el caso 401. Se hace con fetch crudo
  // dentro del navegador -- nunca pasa por Node, nunca se imprime -- para
  // no tocar localStorage: el token queda ahí, ahora inválido, tal como
  // quedaría uno realmente expirado mientras la pestaña sigue abierta.
  await page.evaluate(async (backendUrl) => {
    const token = window.localStorage.getItem("token");
    await fetch(`${backendUrl}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }, BACKEND_URL);

  await fillCustomVehicleTrip(page);
  await page.getByRole("button", { name: /Calcular viaje/ }).click();
  await page.waitForURL(/\/resultado/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);

  const callsB = apiCalls.filter((c) => c.phase === "B");
  const authSaveCallB = callsB.find((c) => c.url.endsWith("/trips/calculate-and-save"));
  const publicCallsB = callsB.filter((c) => c.url.endsWith("/trips/calculate"));
  check("B: calculate-and-save respondió 401", authSaveCallB?.status === 401, authSaveCallB?.status);
  check("B: se hizo EXACTAMENTE un fallback a /trips/calculate", publicCallsB.length === 1, JSON.stringify(publicCallsB));
  check("B: el fallback respondió 2xx", publicCallsB[0]?.status === 200, publicCallsB[0]?.status);
  check("B: el fallback NO incluyó Authorization", publicCallsB[0]?.hasAuth === false);

  const bodyTextB = await page.locator("body").innerText();
  check("B: el resultado muestra 'No guardado'", /no guardado/i.test(bodyTextB), bodyTextB.slice(0, 200));
  check("B: el resultado menciona sesión expirada", /sesión expiró/i.test(bodyTextB), bodyTextB.slice(0, 200));

  check("B: NO hubo redirección automática a /login", !page.url().includes("/login"), page.url());
  check("B: se permaneció en /resultado", page.url().includes("/resultado"), page.url());

  const navAfterB = await isNavbarAuthenticated(page);
  check("B: Navbar cambia INMEDIATAMENTE a no autenticado", navAfterB.guest && !navAfterB.authenticated, JSON.stringify(navAfterB));

  // Solo se traen booleanos del navegador -- nunca el valor de token/user -- para
  // que ni siquiera en un fallo de la aserción pueda imprimirse un token o un
  // correo real en la consola o en un log.
  const storageAfterB = await page.evaluate(() => ({
    tokenPresent: window.localStorage.getItem("token") !== null,
    userPresent: window.localStorage.getItem("user") !== null,
  }));
  check("B: 'token' desapareció de localStorage", storageAfterB.tokenPresent === false);
  check("B: 'user' desapareció de localStorage", storageAfterB.userPresent === false);

  // ============================================================
  console.log("\n=== PRUEBA C: cálculo posterior, sin recargar ni volver a iniciar sesión ===");
  currentPhase = "C";
  await page.goto(`${FRONTEND_URL}/calculadora`);
  await page.waitForLoadState("networkidle");
  await fillCustomVehicleTrip(page);
  await page.getByRole("button", { name: /Calcular viaje/ }).click();
  await page.waitForURL(/\/resultado/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(300);

  const callsC = apiCalls.filter((c) => c.phase === "C");
  const authSaveCallC = callsC.find((c) => c.url.endsWith("/trips/calculate-and-save"));
  const publicCallsC = callsC.filter((c) => c.url.endsWith("/trips/calculate"));
  check("C: NO se llamó a /trips/calculate-and-save en absoluto", !authSaveCallC, JSON.stringify(callsC));
  check("C: la solicitud fue directa a /trips/calculate", publicCallsC.length === 1, JSON.stringify(publicCallsC));

  const bodyTextC = await page.locator("body").innerText();
  check("C: el nuevo resultado también muestra 'No guardado'", /no guardado/i.test(bodyTextC), bodyTextC.slice(0, 200));
  } finally {
    await browser.close();
  }

  console.log(`\n=== RESUMEN === PASS: ${PASS.length}  FAIL: ${FAIL.length}`);
  if (FAIL.length) {
    for (const label of FAIL) console.log(` - FALLÓ: ${label}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Error inesperado ejecutando la prueba E2E:", error.message);
  process.exit(1);
});
