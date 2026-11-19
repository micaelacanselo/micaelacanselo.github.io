// Portada minimalista: línea de carga, vitrina de obras que corre sola, Qué hago fijo, entradas suaves y formulario.
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-anio]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// ---------- Portada: línea de carga y después la frase, que se escribe letra por letra ----------
// Una línea fina se completa de 0% a 100% mientras cargan las fuentes y la página (mínimo 1,8 s, máximo 4 s).
// Al llegar a 100 la línea se retira, saluda un "Hola" y la frase se tipea con un cursor que titila; después entran
// la bajada, los botones y la vitrina. Con un #enlace, si ya se bajó o con movimiento reducido, todo aparece directo.
const portada = document.querySelector("[data-portada]");
const carga = document.querySelector("[data-carga]");
const frase = portada?.querySelector("h1");

// Cada letra en su propio span (la frase completa queda como nombre del título para lectores de pantalla)
function prepararTipeo() {
  frase.setAttribute("aria-label", frase.textContent.replace(/\s+/g, " ").trim());
  const letras = [];
  const recorrer = (nodo) => {
    for (const hijo of [...nodo.childNodes]) {
      if (hijo.nodeType === Node.TEXT_NODE) {
        const trozo = document.createDocumentFragment();
        for (const c of hijo.textContent) {
          const s = document.createElement("span");
          s.className = "letra";
          s.setAttribute("aria-hidden", "true");
          s.textContent = c;
          trozo.append(s);
          letras.push(s);
        }
        hijo.replaceWith(trozo);
      } else recorrer(hijo);
    }
  };
  recorrer(frase);
  return letras;
}

function tipear(letras) {
  const barra = document.createElement("span");
  barra.className = "tipeo";
  barra.setAttribute("aria-hidden", "true");
  letras[0].before(barra);
  let i = 0;
  const siguiente = () => {
    const l = letras[i];
    l.classList.add("si");
    l.after(barra);
    i++;
    if (i < letras.length) {
      // Pausa un poco más en los espacios y al pasar de un lado al otro, como quien escribe
      const pausa = l.textContent === " " ? 90 : 38 + Math.random() * 34;
      setTimeout(siguiente, pausa);
    } else {
      portada.classList.add("tipeada");
      setTimeout(() => barra.classList.add("tipeo--fin"), 1600);
    }
  };
  setTimeout(siguiente, 150);
}

if (portada) {
  const letras = !reducido && frase ? prepararTipeo() : [];
  const mostrarPortada = (conTipeo) => {
    portada.classList.remove("en-intro");
    if (conTipeo && letras.length) tipear(letras);
    else {
      letras.forEach((l) => l.classList.add("si"));
      portada.classList.add("tipeada");
    }
  };
  if ("scrollRestoration" in history && !location.hash) history.scrollRestoration = "manual";

  if (!carga || reducido || location.hash || scrollY > 10) {
    carga?.remove();
    mostrarPortada(false);
  } else {
    const numero = carga.querySelector("[data-carga-numero]");
    const MINIMO = 1800;
    const MAXIMO = 4000;
    const inicio = performance.now();
    let lista = false;
    const pagina = document.readyState === "complete" ? Promise.resolve() : new Promise((r) => addEventListener("load", r, { once: true }));
    Promise.all([document.fonts.ready, pagina]).then(() => (lista = true));

    // Pareja, con un leve frenado al final: se lee como una carga y no como un salto
    const suave = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
    const cuadro = (ahora) => {
      const pasado = ahora - inicio;
      // Mientras la página no terminó de cargar, la línea se queda antes del final
      const tope = lista || pasado > MAXIMO ? 1 : 0.9;
      const avance = Math.min(suave(Math.min(pasado / MINIMO, 1)), tope);
      carga.style.setProperty("--avance", avance.toFixed(4));
      numero.textContent = `${Math.round(avance * 100)}%`;
      if (avance < 1) return requestAnimationFrame(cuadro);
      // La línea se va, aparece un "Hola" en su lugar, se despide y recién ahí se escribe la frase
      carga.classList.add("carga--fin");
      setTimeout(() => carga.classList.add("carga--hola"), 420);
      setTimeout(() => carga.classList.add("carga--chau"), 1700);
      setTimeout(() => mostrarPortada(true), 2150);
      setTimeout(() => carga.remove(), 2700);
    };
    requestAnimationFrame(cuadro);
  }
}

// ---------- Qué hago: el paso activo depende de cuánto se bajó dentro de la sección ----------
const queHago = document.querySelector("[data-que-hago]");
const pasos = queHago ? [...queHago.querySelectorAll("[data-paso]")] : [];
const polaroids = queHago ? [...queHago.querySelectorAll(".polaroid")] : [];
const puntos = queHago ? [...queHago.querySelectorAll(".que-hago__puntos li")] : [];
let pasoActual = 0;

function moverQueHago() {
  if (!queHago) return;
  const r = queHago.getBoundingClientRect();
  const recorrido = queHago.offsetHeight - innerHeight;
  const p = Math.min(Math.max(-r.top / recorrido, 0), 0.999);
  const n = Math.floor(p * pasos.length);
  if (n === pasoActual) return;
  pasoActual = n;
  [pasos, polaroids, puntos].forEach((grupo) => grupo.forEach((el, i) => el.classList.toggle("activo", i === n)));
}

// ---------- Vitrina de la portada: una hilera de obras que corre sola, sin fin, y se acelera al scrollear ----------
// Va hacia la izquierda. Se duplica (copias ocultas para
// lectores de pantalla y teclado) para que nunca se vea el final. Con el mouse encima van más despacio;
// con movimiento reducido queda quieta y se recorre deslizando a mano.
const seccionTrabajos = document.querySelector("[data-hileras]");
const hileras = [...document.querySelectorAll("[data-hilera]")].map((pista, i) => ({ pista, dir: i === 0 ? -1 : 1, x: 0, ancho: 0, lento: false }));
const BASE = 48; // px por segundo cuando nadie scrollea
const EMPUJE = 0.5; // parte de la velocidad del scroll que se suma (en px por segundo)
let velocidadScroll = 0;
let ultimoScroll = scrollY;
let trabajosVisibles = false;

function moverHileras() {} // el movimiento ahora lo maneja su propio bucle

if (seccionTrabajos && !reducido) {
  hileras.forEach((h) => {
    // Copias de relleno: se ven y se pueden tocar, pero no se leen ni se enfocan con teclado
    [...h.pista.children].forEach((item) => {
      const copia = item.cloneNode(true);
      copia.setAttribute("aria-hidden", "true");
      copia.querySelectorAll("a").forEach((enlace) => (enlace.tabIndex = -1));
      h.pista.append(copia);
    });
    h.pista.addEventListener("pointerenter", () => (h.lento = true));
    h.pista.addEventListener("pointerleave", () => (h.lento = false));
    // Con teclado: la tarjeta enfocada se corre a la vista y la hilera se queda quieta
    h.pista.addEventListener("focusin", (e) => {
      h.lento = "quieta";
      const tarjeta = e.target.closest(".trabajo");
      const r = tarjeta.getBoundingClientRect();
      if (r.left < 0 || r.right > innerWidth) h.x -= r.left - innerWidth * 0.08;
      pintar(h);
    });
    h.pista.addEventListener("focusout", () => (h.lento = false));
  });

  const medir = () => hileras.forEach((h) => (h.ancho = h.pista.scrollWidth / 2));
  medir();
  addEventListener("resize", medir);
  addEventListener("load", medir);

  new IntersectionObserver(([e]) => (trabajosVisibles = e.isIntersecting), { rootMargin: "200px 0px" }).observe(seccionTrabajos);

  const pintar = (h) => {
    // Vuelta sin salto: la posición siempre queda entre -ancho y 0
    if (h.ancho) h.x = ((h.x % h.ancho) - h.ancho) % h.ancho;
    h.pista.style.transform = `translate3d(${h.x.toFixed(1)}px, 0, 0)`;
  };

  // Velocidad por tiempo (no por cuadro), así va igual en pantallas de 60 o de 144 Hz
  let antes = performance.now();
  const correr = (ahora) => {
    const dt = Math.min((ahora - antes) / 1000, 0.05);
    antes = ahora;
    const delta = scrollY - ultimoScroll;
    ultimoScroll = scrollY;
    // El empuje del scroll se suma y se va apagando de a poco
    // Con tope: un salto grande (un enlace a Trabajos) no las dispara
    const objetivo = dt > 0 ? Math.min((Math.abs(delta) / dt) * EMPUJE, 900) : 0;
    velocidadScroll += (objetivo - velocidadScroll) * Math.min(1, dt * 6);
    // Con un caso abierto se quedan quietas: así la tarjeta sigue en su lugar al cerrar
    if (trabajosVisibles && !document.documentElement.classList.contains("indice-abierto")) {
      for (const h of hileras) {
        if (h.lento === "quieta") continue;
        const v = (BASE + velocidadScroll) * (h.lento ? 0.25 : 1);
        h.x += h.dir * v * dt;
        pintar(h);
      }
    }
    requestAnimationFrame(correr);
  };
  // La segunda hilera arranca corrida para que no empiecen alineadas
  hileras[1] && (hileras[1].x = -hileras[1].ancho * 0.5);
  hileras.forEach(pintar);
  requestAnimationFrame(correr);
}

let pendiente = false;
function pedir() {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    moverQueHago();
    moverHileras();
  });
}
addEventListener("scroll", pedir, { passive: true });
addEventListener("resize", pedir);
pedir();

// ---------- Títulos: cada palabra sube desde una máscara, una detrás de otra ----------
// Se envuelve cada palabra (también las de .fuerte) en una ventana que la recorta; el texto queda igual para lectores de pantalla
function partirEnPalabras(titulo) {
  let i = 0;
  const caminante = document.createTreeWalker(titulo, NodeFilter.SHOW_TEXT);
  const textos = [];
  while (caminante.nextNode()) textos.push(caminante.currentNode);
  for (const nodo of textos) {
    const partes = nodo.textContent.split(/(\s+)/);
    const fragmento = document.createDocumentFragment();
    for (const parte of partes) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) {
        fragmento.append(parte);
        continue;
      }
      const ventana = document.createElement("span");
      ventana.className = "palabra";
      const interior = document.createElement("span");
      interior.className = "palabra__interior";
      interior.style.setProperty("--i", i++);
      interior.textContent = parte;
      ventana.append(interior);
      fragmento.append(ventana);
    }
    nodo.replaceWith(fragmento);
  }
}

// La frase de la portada se tipea (arriba); acá solo los títulos de sección y los pasos
const titulos = document.querySelectorAll(".titulo, .paso h3");
titulos.forEach(partirEnPalabras);

// Los títulos de sección se animan cada vez que asoman: al salir de la pantalla se rearman para la próxima.
// La portada y los pasos de Qué hago tienen su propio disparador
const titulosSeccion = document.querySelectorAll(".titulo");
if (!reducido && "IntersectionObserver" in window) {
  const verTitulo = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => e.target.classList.toggle("entra", e.isIntersecting));
  }, { rootMargin: "0px 0px -12% 0px" });
  titulosSeccion.forEach((t) => verTitulo.observe(t));
} else {
  titulosSeccion.forEach((t) => t.classList.add("entra"));
}

// ---------- Correcciones: una frase generica se tacha y debajo se escribe la versión con voz propia ----------
// Cada bloque tiene sus pares de frases (en data-frases, separados por "|" y "→"); van rotando mientras se ven.
// Con movimiento reducido queda el primer par quieto, ya tachado y escrito.
document.querySelectorAll("[data-correccion]").forEach((bloque) => {
  const antes = bloque.querySelector("[data-antes]");
  const despues = bloque.querySelector("[data-despues]");
  const pares = (bloque.dataset.frases || "")
    .split("|")
    .map((p) => p.split("→").map((t) => t.trim()))
    .filter((p) => p.length === 2);
  if (!pares.length || reducido) return;

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  let enPantalla = false;
  let corriendo = false;
  let i = 0;

  const escribir = async (texto) => {
    despues.textContent = "";
    const barra = document.createElement("span");
    barra.className = "tipeo";
    barra.setAttribute("aria-hidden", "true");
    despues.append(barra);
    for (const c of texto) {
      barra.before(c);
      await esperar(c === " " ? 80 : 32 + Math.random() * 30);
    }
    await esperar(1400);
    barra.remove();
  };

  const ronda = async () => {
    corriendo = true;
    while (enPantalla) {
      const [generica, propia] = pares[i % pares.length];
      bloque.classList.remove("correccion--sale");
      antes.textContent = generica;
      despues.textContent = "";
      bloque.style.setProperty("--tachado", 0);
      await esperar(1100);
      bloque.style.setProperty("--tachado", 1);
      await esperar(650);
      await escribir(propia);
      await esperar(2200);
      // Con un solo par, se queda escrito; con varios, se apaga y entra el siguiente
      if (pares.length === 1) break;
      bloque.classList.add("correccion--sale");
      await esperar(500);
      i++;
    }
    corriendo = false;
  };

  new IntersectionObserver(([e]) => {
    enPantalla = e.isIntersecting;
    if (enPantalla && !corriendo) ronda();
  }, { rootMargin: "0px 0px -15% 0px" }).observe(bloque);
});

// ---------- Entradas suaves ----------
const aparecen = document.querySelectorAll(".aparece");
if (!reducido && "IntersectionObserver" in window) {
  const ver = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("visible");
      ver.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  aparecen.forEach((el) => ver.observe(el));
} else {
  aparecen.forEach((el) => el.classList.add("visible"));
}

// ---------- Formulario (igual que en el sitio) ----------
const formulario = document.querySelector("[data-formulario]");
formulario?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const estado = formulario.querySelector("[data-formulario-estado]");
  const boton = formulario.querySelector("[type=submit]");
  const avisar = (texto, error) => {
    estado.textContent = texto;
    estado.classList.toggle("formulario__estado--error", error);
  };
  boton.disabled = true;
  avisar("Enviando…", false);
  try {
    const datos = Object.fromEntries(new FormData(formulario));
    const respuesta = await fetch(formulario.dataset.envio, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...datos, subject: `Portfolio: ${datos.motivo}`, from_name: "Portfolio de Micaela" }),
    });
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || String(resultado.success) !== "true") throw new Error(resultado.message || String(respuesta.status));
    formulario.reset();
    avisar("¡Gracias! Ya me llegó tu mensaje y te respondo pronto.", false);
  } catch {
    avisar("No se pudo enviar. Tu mensaje sigue acá: probá de nuevo en un rato.", true);
  }
  boton.disabled = false;
});
