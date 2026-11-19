// Portada minimalista: intro de fotos, Qué hago fijo con foto que cambia, entradas suaves y formulario.
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-anio]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// ---------- Portada: la misma intro de fotos del sitio (js/hero.js) ----------
// Las fotos caen una tras otra en una pila en el centro y se abren en un collage alrededor de la frase;
// después se apagan y aparecen solo cerca del mouse (o del dedo). Al bajar se juntan hacia el centro.
// Cualquier interacción saltea la intro. Con movimiento reducido el collage queda quieto y a la vista.
const portada = document.querySelector("[data-portada]");
const capa = document.querySelector("[data-collage]");
const textoPortada = document.querySelector(".portada__texto");

const FOTOS = [
  ["magnolia", 360, 270], ["havanna-foto", 360, 450], ["tono-celular", 360, 480], ["itba", 360, 270],
  ["campagnola-foto", 360, 480], ["gae", 360, 270], ["itba-gondola", 360, 480], ["tono", 360, 270],
  ["adopciones-historia", 360, 480], ["burgbox", 360, 270], ["spa-celular", 360, 480], ["raiz", 360, 270],
  ["relax-spa", 360, 270], ["itba-entrega", 360, 480], ["havanna", 360, 270],
  ["raiz-celular", 360, 480], ["campagnola", 360, 270], ["instituto", 360, 270], ["adopciones", 360, 270],
  ["plantilla", 360, 270], ["escribo", 360, 270],
];

if (portada && capa && textoPortada) {
  const CURVA = "cubic-bezier(.2,.7,.2,1)";
  const PASO_PILA = 75; // cada cuánto cae una foto en la pila
  const EN_PILA = 14; // cuántas pasan por la pila antes de abrirse
  const APERTURA = 1200; // lo que tarda el collage en abrirse
  const LEJOS = -99999;
  const puntero = { x: 0, y: 0, vx: 0, vy: 0, px: LEJOS, py: LEJOS };
  const saltos = ["wheel", "touchmove", "keydown", "pointerdown", "scroll"];
  let terminada = false;
  let viviendo = false;
  let enPantalla = true;
  let soltarDedo = 0;
  let W = 0;
  let H = 0;
  new IntersectionObserver(([e]) => (enPantalla = e.isIntersecting)).observe(capa);

  // Pseudoaleatorio con semilla: el collage sale igual en cada visita
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;

  const fotos = FOTOS.map(([nombre, ancho, alto]) => {
    const img = document.createElement("img");
    img.className = "collage__foto";
    img.src = `assets/img/collage/${nombre}.webp`;
    img.alt = "";
    img.width = ancho;
    img.height = alto;
    img.decoding = "async";
    capa.append(img);
    return { img, ratio: alto / ancho, x: 0, y: 0, w: 0, prof: 0, visible: false, luz: 0 };
  });

  // Zona libre: la frase, la bajada y los botones; arriba la barra del nombre, abajo la navegación
  function ubicar() {
    const r = capa.getBoundingClientRect();
    W = r.width;
    H = r.height;
    semilla = 7;
    const m = W < 700 ? 14 : 30;
    const textos = [...textoPortada.children].map((el) => el.getBoundingClientRect());
    const zona = {
      x1: Math.min(...textos.map((t) => t.left)) - r.left - m,
      x2: Math.max(...textos.map((t) => t.right)) - r.left + m,
      y1: Math.min(...textos.map((t) => t.top)) - r.top - m,
      y2: Math.max(...textos.map((t) => t.bottom)) - r.top + m,
    };
    const techo = (document.querySelector(".barra")?.getBoundingClientRect().bottom || 64) - r.top;
    const piso = H - (document.querySelector(".navegacion")?.offsetHeight || 72) - 8;
    const chico = W < 700;
    const base = chico ? Math.max(52, W * 0.15) : Math.min(Math.max(W * 0.068, 78), 132);
    const hueco = chico ? 8 : 16;
    const puestas = [];
    for (const f of fotos) {
      f.w = base * (0.8 + azar() * 0.45);
      const h = f.w * f.ratio;
      f.visible = false;
      for (let i = 0; i < 400; i++) {
        const x = 8 + azar() * (W - f.w - 16);
        const y = techo + azar() * (piso - h - techo);
        const choca = (z) => x < z.x2 + hueco && x + f.w > z.x1 - hueco && y < z.y2 + hueco && y + h > z.y1 - hueco;
        if (choca(zona) || puestas.some(choca)) continue;
        puestas.push({ x1: x, x2: x + f.w, y1: y, y2: y + h });
        Object.assign(f, { x, y, visible: true, prof: 0.4 + azar() * 0.9 });
        break;
      }
      f.img.style.setProperty("--ancho", `${f.w.toFixed(1)}px`);
    }
  }

  const transformar = (x, y, s = 1) => `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;

  // Estado final: cada foto se enciende cuando el puntero pasa cerca (rápido) y se apaga lento;
  // al bajar, todas se juntan hacia el centro y se apagan, y la frase también
  function pintarFinal() {
    const p = Math.min(Math.max(scrollY / (innerHeight * 0.6), 0), 1);
    const k = 1 - (1 - p) ** 3;
    puntero.vx += (puntero.x - puntero.vx) * 0.06;
    puntero.vy += (puntero.y - puntero.vy) * 0.06;
    const base = capa.getBoundingClientRect();
    const radio = Math.max(W, H) * (W < 700 ? 0.32 : 0.2);
    for (const f of fotos) {
      if (!f.visible) continue;
      const h = f.w * f.ratio;
      const cx = W / 2 - f.w / 2;
      const cy = H / 2 - h / 2;
      const dx = reducido ? 0 : -puntero.vx * 14 * f.prof;
      const dy = reducido ? 0 : -puntero.vy * 10 * f.prof;
      const x = f.x + (cx - f.x) * k * 0.92 + dx;
      const y = f.y + (cy - f.y) * k * 0.92 + dy;
      if (reducido) f.luz = 1;
      else {
        const d = Math.hypot(puntero.px - (base.left + x + f.w / 2), puntero.py - (base.top + y + h / 2));
        const t = Math.max(0, 1 - d / radio);
        const cerca = t * t * (3 - 2 * t);
        f.luz += (cerca - f.luz) * (cerca > f.luz ? 0.16 : 0.025);
      }
      f.img.style.transform = transformar(x, y, (1 - k * 0.55) * (0.9 + f.luz * 0.1));
      f.img.style.opacity = (f.luz * (1 - k * k)).toFixed(3);
    }
    if (!reducido) textoPortada.style.opacity = (1 - k).toFixed(3);
  }

  function vivir() {
    if (enPantalla) pintarFinal();
    requestAnimationFrame(vivir);
  }

  // desdeIntro: las fotos arrancan encendidas y se van apagando despacio
  function mostrarFinal(desdeIntro = false) {
    for (const f of fotos) {
      f.img.style.transition = "none";
      f.luz = desdeIntro && f.visible ? 1 : 0;
    }
    pintarFinal();
    if (!reducido && !viviendo) {
      viviendo = true;
      requestAnimationFrame(vivir);
    }
  }

  function terminar() {
    if (terminada) return;
    terminada = true;
    saltos.forEach((e) => removeEventListener(e, terminar));
    portada.classList.remove("en-intro");
    mostrarFinal(true);
  }

  function intro() {
    portada.classList.add("en-intro");
    const cx = W / 2;
    const cy = H / 2;
    for (const f of fotos) {
      const s = Math.min(W * 0.36, 190) / f.w;
      const jx = (azar() - 0.5) * 50;
      const jy = (azar() - 0.5) * 40;
      f.img.style.transition = "none";
      f.img.style.transform = transformar(cx - f.w / 2 + jx, cy - (f.w * f.ratio) / 2 + jy, s);
    }
    fotos.slice(0, EN_PILA).forEach((f, i) => setTimeout(() => !terminada && (f.img.style.opacity = 1), 120 + i * PASO_PILA));
    setTimeout(() => {
      if (terminada) return;
      for (const f of fotos) {
        const demora = Math.round(azar() * 220);
        f.img.style.transition = `transform ${APERTURA}ms ${CURVA} ${demora}ms, opacity 500ms ease ${demora}ms`;
        f.img.style.opacity = f.visible ? 1 : 0;
        f.img.style.transform = transformar(f.x, f.y, 1);
      }
      // La frase entra cuando el collage ya dejó el centro libre
      setTimeout(terminar, APERTURA + 260);
    }, 120 + EN_PILA * PASO_PILA + 250);
  }

  if (!reducido) {
    const seguir = (ev) => {
      clearTimeout(soltarDedo);
      puntero.x = ev.clientX / innerWidth - 0.5;
      puntero.y = ev.clientY / innerHeight - 0.5;
      puntero.px = ev.clientX;
      puntero.py = ev.clientY;
    };
    addEventListener("pointermove", seguir, { passive: true });
    addEventListener("pointerdown", seguir, { passive: true });
    // Con el dedo, las fotos quedan un momento y se apagan; con el mouse, al salir de la ventana
    addEventListener("pointerup", (ev) => {
      if (ev.pointerType !== "mouse") soltarDedo = setTimeout(() => (puntero.px = puntero.py = LEJOS), 900);
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => (puntero.px = puntero.py = LEJOS));
  }

  // La intro corre al cargar arriba de todo; con un #enlace o movimiento reducido, directo al final
  if ("scrollRestoration" in history && !location.hash) history.scrollRestoration = "manual";
  document.fonts.ready.then(() => {
    ubicar();
    if (!reducido && !location.hash && scrollY < 10) {
      saltos.forEach((e) => addEventListener(e, terminar, { passive: true }));
      intro();
    } else {
      terminada = true;
      portada.classList.remove("en-intro");
      mostrarFinal();
    }
  });

  // Si cambia el ancho se vuelve a repartir; en celular la barra del navegador solo cambia el alto
  let anchoPrevio = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === anchoPrevio) return;
    anchoPrevio = innerWidth;
    ubicar();
    if (terminada) mostrarFinal();
  });
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

// ---------- Trabajos: la primera hilera va hacia la izquierda y la segunda hacia la derecha ----------
const seccionTrabajos = document.querySelector("#trabajos");
const hileras = [...document.querySelectorAll("[data-hilera]")];

function moverHileras() {
  if (!seccionTrabajos || reducido) return;
  const r = seccionTrabajos.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  // Avance de 0 (la sección asoma abajo) a 1 (se va por arriba)
  const p = Math.min(Math.max((innerHeight - r.top) / (r.height + innerHeight), 0), 1);
  hileras.forEach((h, i) => {
    const sobra = Math.max(0, h.scrollWidth - innerWidth);
    const x = i === 0 ? -sobra * p : -sobra * (1 - p);
    h.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
  });
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
