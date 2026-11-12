const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

document.querySelectorAll("[data-anio]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});

// ---------- Encabezado: toma el color de la sección que tiene debajo ----------
const encabezado = document.querySelector(".encabezado");
let encabezadoPendiente = false;

function actualizarEncabezado() {
  encabezadoPendiente = false;
  const capa = document
    .elementsFromPoint(innerWidth / 2, encabezado.offsetHeight / 2)
    .map((el) => (encabezado.contains(el) ? null : el.closest(".franja, .tema-claro, .tema-oscuro")))
    .find(Boolean);
  encabezado.classList.toggle("encabezado--sobre-franja", Boolean(capa?.matches(".franja")));
  encabezado.classList.toggle("encabezado--sobre-claro", Boolean(capa?.matches(".tema-claro")));
  encabezado.classList.toggle("encabezado--en-hero", Boolean(capa?.matches(".hero")));
  // En celular el encabezado toma el color de la sección de abajo
  if (capa && !capa.matches(".franja")) encabezado.style.setProperty("--fondo-encabezado", getComputedStyle(capa).getPropertyValue("--fondo"));
}

function pedirEncabezado() {
  if (encabezadoPendiente) return;
  encabezadoPendiente = true;
  requestAnimationFrame(actualizarEncabezado);
}

addEventListener("scroll", pedirEncabezado, { passive: true });
addEventListener("resize", pedirEncabezado);
actualizarEncabezado();

// ---------- Franja: corre sola y se acelera con el scroll ----------
const pista = document.querySelector("[data-franja]");
let franjaX = 0;
if (pista) {
  const frase = pista.innerHTML;
  pista.innerHTML = frase.repeat(4);
}

// ---------- Pilares: se ilumina el más cercano al centro de la pantalla ----------
const pilares = [...document.querySelectorAll("[data-pilares] .pilar")];

function actualizarPilares() {
  const centro = innerHeight * 0.55;
  let mejor = null;
  let dist = Infinity;
  for (const li of pilares) {
    const r = li.getBoundingClientRect();
    const d = Math.abs(r.top + r.height / 2 - centro);
    if (d < dist) {
      dist = d;
      mejor = li;
    }
  }
  pilares.forEach((li) => li.classList.toggle("activo", li === mejor && dist < innerHeight * 0.4));
}

// ---------- Portada y trabajos: la frase abre y la rueda pasa los proyectos con el scroll ----------
const secTrabajos = document.querySelector("[data-trabajos]");
const carpetas = [...document.querySelectorAll("[data-carpetas] > .carpeta")].map((el) => ({ el }));
const rueda = document.querySelector("[data-rueda]");
const apertura = document.querySelector("[data-apertura]");
const fichaRueda = document.querySelector("[data-ficha]");
const controlesRueda = document.querySelector("[data-rueda-controles]");
const tituloRueda = document.querySelector("[data-rueda-titulo]");
const lienzoPortada = document.querySelector("[data-hero-fondo]");
// La rueda muestra solo los destacados y cierra con una tarjeta que abre el índice completo
const destacados = carpetas.filter((c) => c.el.hasAttribute("data-destacado"));
const PARADAS = destacados.length + 1;
const CIERRE = destacados.length;
const PASO_RUEDA = 360 / PARADAS;
const RESERVA_RUEDA = 1.7; // la última tarjeta se queda quieta este tramo, en pantallas
const INICIO_RUEDA = 0.22; // hasta acá manda la frase; después gira (igual que .trabajos__ancla en styles.css)
const TEXTO_INDICE = "Ver todos los proyectos";
const medidasRueda = { cw: 0, cyA: 0, cyB: 0, s: 1 };
let avanceRueda = 0;
let frenteRueda = -1;

const datoCarpeta = (c, clase) => c.el.querySelector(`.carpeta__${clase}`);

function progresoTrabajos() {
  const r = secTrabajos.getBoundingClientRect();
  return Math.min(Math.max(-r.top / (r.height - innerHeight * RESERVA_RUEDA), 0), 1);
}

function medirRueda() {
  if (!rueda || reducido) return;
  const W = innerWidth;
  const H = innerHeight;
  const cw = Math.min(W * (W < 768 ? 0.62 : 0.27), H * 0.42);
  const R = cw * 1.62;
  const ch = cw * 0.75;
  const s = W < 768 ? 1.32 : 1.55;
  const piso = apertura.offsetHeight + 24;
  Object.assign(medidasRueda, { cw, s, cyA: Math.max(piso, H * 0.5) + ch / 2 + R, cyB: H * (W < 768 ? 0.36 : 0.42) + R * s });
  rueda.style.setProperty("--cw", `${cw}px`);
}

destacados.forEach((c, i) => {
  const hash = c.el.querySelector("a").hash;
  const li = document.createElement("li");
  li.className = "rueda__carta";
  li.style.setProperty("--angulo", `${i * PASO_RUEDA}deg`);
  const titulo = datoCarpeta(c, "titulo").textContent;
  li.innerHTML = `<a href="${hash}" data-cursor="ver" aria-label="${titulo}"><img src="${c.el.querySelector(".carpeta__ficha img").getAttribute("src")}" alt="" width="1200" height="900"><span class="rueda__nombre">${titulo}</span></a>`;
  const enlace = li.firstElementChild;
  // Una carta de costado pasa al frente; la del frente abre su caso
  enlace.addEventListener("click", (e) => {
    e.preventDefault();
    if (!reducido && i !== frenteRueda) irACarpeta(i);
    else abrirCaso(hash);
  });
  enlace.addEventListener("focus", () => {
    if (!reducido && enlace.matches(":focus-visible")) irACarpeta(i);
  });
  rueda?.append(li);
});

// Tarjeta de cierre: un mosaico con los trabajos que no entran en la rueda
if (rueda) {
  const li = document.createElement("li");
  li.className = "rueda__carta rueda__carta--cierre";
  li.style.setProperty("--angulo", `${CIERRE * PASO_RUEDA}deg`);
  const resto = carpetas.filter((c) => !destacados.includes(c)).slice(0, 4);
  const mosaico = resto.map((c) => `<img src="${c.el.querySelector(".carpeta__ficha img").getAttribute("src")}" alt="" width="1200" height="900" loading="lazy" decoding="async">`).join("");
  li.innerHTML = `<a href="#trabajos" aria-haspopup="dialog"><span class="rueda__mosaico">${mosaico}</span><span class="rueda__nombre">${TEXTO_INDICE}</span></a>`;
  const enlace = li.firstElementChild;
  enlace.addEventListener("click", (e) => {
    e.preventDefault();
    if (!reducido && frenteRueda !== CIERRE) irACarpeta(CIERRE);
    else abrirIndice();
  });
  enlace.addEventListener("focus", () => {
    if (!reducido && enlace.matches(":focus-visible")) irACarpeta(CIERRE);
  });
  rueda.append(li);
}

const suaveSalida = (t) => 1 - (1 - t) ** 3;
const suaveAmbos = (t) => t * t * (3 - 2 * t);

function moverRueda() {
  if (!rueda || reducido) return;
  const objetivo = progresoTrabajos();
  avanceRueda += (objetivo - avanceRueda) * 0.1;
  const t = suaveSalida(Math.min(avanceRueda / INICIO_RUEDA, 1));
  const tramo = (Math.max(0, (avanceRueda - INICIO_RUEDA) / (1 - INICIO_RUEDA))) * (PARADAS - 1);
  // Se detiene derecha en cada proyecto y gira entre uno y otro
  const base = Math.floor(tramo);
  const giro = base + suaveAmbos(Math.min(Math.max((tramo - base - 0.25) / 0.5, 0), 1));
  const { cyA, cyB, s } = medidasRueda;
  const y = cyA + (cyB - cyA) * t;
  const escala = 1 + (s - 1) * t;
  rueda.style.transform = `translateY(${y.toFixed(1)}px) scale(${escala.toFixed(3)}) rotate(${(-giro * PASO_RUEDA).toFixed(2)}deg)`;

  apertura.style.opacity = 1 - suaveSalida(Math.min(avanceRueda / 0.08, 1));
  apertura.style.transform = `translateY(${(-t * 60).toFixed(1)}px)`;
  apertura.style.visibility = t > 0.9 ? "hidden" : "";
  if (lienzoPortada) lienzoPortada.style.opacity = 1 - t;

  // Antes de que suba la sección siguiente, las tarjetas de los costados se apagan para que no queden cortadas
  const tramoFinal = innerHeight * (RESERVA_RUEDA - 1);
  const pasado = -secTrabajos.getBoundingClientRect().top - (secTrabajos.offsetHeight - innerHeight * RESERVA_RUEDA);
  const costados = 1 - Math.min(Math.max(pasado / (tramoFinal * 0.8), 0), 1);
  const frente = Math.min(Math.round(tramo), PARADAS - 1);
  [...rueda.children].forEach((carta, i) => {
    carta.style.opacity = i === frente ? 1 : costados;
    carta.style.visibility = i !== frente && costados === 0 ? "hidden" : "";
  });

  const verFicha = Math.max(0, (t - 0.6) / 0.4);
  for (const el of [tituloRueda, fichaRueda, controlesRueda]) {
    el.style.opacity = el === controlesRueda ? verFicha * costados : verFicha;
    el.style.visibility = verFicha > 0 ? "" : "hidden";
  }
  // El título se resalta cuando termina de aparecer
  if (verFicha > 0.8) tituloRueda.firstElementChild.classList.add("titulo-marca--visible");

  if (frente !== frenteRueda) {
    frenteRueda = frente;
    pintarFicha(frente);
  }
}

// La ficha cuenta el proyecto del frente; en la última parada invita al índice completo
function pintarFicha(n) {
  const cierre = n === CIERRE;
  const c = destacados[n];
  const abrir = fichaRueda.querySelector("[data-ficha-abrir]");
  const tipo = fichaRueda.querySelector("[data-ficha-tipo]");
  fichaRueda.classList.toggle("ficha--cierre", cierre);
  // En el cierre queda solo el botón: el mosaico ya dice que hay más
  for (const [dato, clase] of [["categoria", "categoria"], ["titulo", "titulo"], ["frase", "frase"]]) {
    const el = fichaRueda.querySelector(`[data-ficha-${dato}]`);
    el.textContent = cierre ? "" : datoCarpeta(c, clase).textContent;
    el.hidden = cierre;
  }
  tipo.textContent = cierre ? "" : datoCarpeta(c, "tipo").textContent;
  tipo.hidden = cierre;
  tipo.classList.toggle("ficha__tipo--real", !cierre && datoCarpeta(c, "tipo").classList.contains("carpeta__tipo--real"));
  abrir.href = cierre ? "#trabajos" : c.el.querySelector("a").hash;
  abrir.textContent = cierre ? TEXTO_INDICE : "Ver proyecto";
  if (cierre) abrir.setAttribute("aria-haspopup", "dialog");
  else abrir.removeAttribute("aria-haspopup");
}

function irACarpeta(i) {
  const n = Math.min(Math.max(i, 0), PARADAS - 1);
  const r = secTrabajos.getBoundingClientRect();
  const alto = r.height - innerHeight * RESERVA_RUEDA;
  const p = INICIO_RUEDA + ((1 - INICIO_RUEDA) * n) / (PARADAS - 1);
  scrollTo({ top: scrollY + r.top + alto * p, behavior: "smooth" });
}

secTrabajos?.querySelector("[data-anterior]").addEventListener("click", () => irACarpeta(frenteRueda - 1));
secTrabajos?.querySelector("[data-siguiente]").addEventListener("click", () => irACarpeta(frenteRueda + 1));
fichaRueda?.querySelector("[data-ficha-abrir]").addEventListener("click", (e) => {
  e.preventDefault();
  if (frenteRueda === CIERRE) abrirIndice();
  else abrirCaso(e.currentTarget.hash);
});

medirRueda();
addEventListener("resize", medirRueda);
addEventListener("load", medirRueda);
document.fonts?.ready.then(medirRueda);

// ---------- Casos: paneles dentro de la página, con enlace propio (#trabajo-slug) ----------
const FLECHA = '<span class="tarjeta__flecha" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12 12 4M5.5 4H12v6.5"/></svg></span>';
let casoAbiertoAca = false;
let pasandoDeCaso = false;

function bloquearFondo() {
  // Sin barra de scroll detrás, y sin que la página salte de ancho
  document.documentElement.style.setProperty("--ancho-barra", `${innerWidth - document.documentElement.clientWidth}px`);
  document.documentElement.classList.add("indice-abierto");
}

function contar(elemento, retraso) {
  const texto = elemento.textContent;
  // Respeta lo que rodea al número ("kg", "º") y sus decimales ("339,1")
  const [, antes, cifra, despues] = texto.match(/^(\D*)(\d[\d.,]*)(.*)$/) || [];
  if (!cifra) return;
  const decimales = (cifra.split(",")[1] || "").length;
  const final = Number(cifra.replace(/\.(?=\d{3})/g, "").replace(/\.$/, "").replace(",", "."));
  const formato = { minimumFractionDigits: decimales, maximumFractionDigits: decimales };
  const duracion = 1400;
  const inicio = performance.now() + retraso;
  elemento.textContent = `${antes}0${despues}`;
  const paso = (ahora) => {
    const t = Math.min(Math.max((ahora - inicio) / duracion, 0), 1);
    const avance = 1 - (1 - t) ** 4;
    elemento.textContent = t < 1 ? `${antes}${(final * avance).toLocaleString("es-AR", formato)}${despues}` : texto;
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function casoDe(hash) {
  return hash.startsWith("#trabajo-") ? document.querySelector(`dialog${hash}`) : null;
}

function mostrarCaso(caso) {
  if (caso.open) return;
  // Las portadas de los videos se piden recién al abrir el caso
  caso.querySelectorAll("video[data-poster]").forEach((v) => {
    v.poster = v.dataset.poster;
    v.removeAttribute("data-poster");
  });
  bloquearFondo();
  caso.showModal();
  caso.scrollTop = 0;
}

function abrirCaso(hash) {
  const caso = casoDe(hash);
  if (!caso) return;
  history.pushState(null, "", hash);
  casoAbiertoAca = true;
  mostrarCaso(caso);
}

document.querySelectorAll("[data-caso]").forEach((caso) => {
  caso.querySelector("[data-cerrar-caso]").addEventListener("click", () => caso.close());
  caso.addEventListener("close", () => {
    document.documentElement.classList.remove("indice-abierto");
    caso.querySelectorAll("video").forEach((v) => v.pause());
    if (pasandoDeCaso || location.hash !== `#${caso.id}`) return;
    if (casoAbiertoAca) history.back();
    else {
      // Llegó por enlace directo: al cerrar, queda en Trabajos
      history.replaceState(null, "", "#trabajos");
      if (reducido) secTrabajos.querySelector("[data-rueda]").scrollIntoView();
      else irACarpeta(0);
    }
    casoAbiertoAca = false;
  });
  caso.querySelector("[data-caso-todos]").addEventListener("click", () => {
    caso.close();
    abrirIndice();
  });
  caso.querySelectorAll("[data-ir-a]").forEach((boton) => {
    boton.querySelector(".tarjeta__titulo").insertAdjacentHTML("afterend", FLECHA);
    boton.addEventListener("click", () => {
      const i = carpetas.findIndex((c) => c.el.querySelector(".carpeta__titulo").textContent === boton.dataset.irA);
      const hash = carpetas[i].el.querySelector("a").hash;
      if (casoDe(hash)) {
        // Reemplaza el enlace: el botón atrás vuelve a la página, no al caso anterior
        pasandoDeCaso = true;
        caso.close();
        pasandoDeCaso = false;
        history.replaceState(null, "", hash);
        mostrarCaso(casoDe(hash));
      } else {
        caso.close();
        setTimeout(() => llevarACarpeta(i), 60);
      }
    });
  });

  // Botón de sonido en los videos que lo tienen; suena uno por vez
  const conSonido = [...caso.querySelectorAll("video[data-sonido]")];
  conSonido.forEach((video) => {
    const boton = document.createElement("button");
    boton.className = "sonido";
    boton.type = "button";
    boton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"/><path class="sonido__ondas" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="sonido__tachado" d="m16 9.5 5 5m0-5-5 5"/></svg>';
    const actualizar = () => {
      boton.setAttribute("aria-pressed", String(!video.muted));
      boton.setAttribute("aria-label", video.muted ? "Activar sonido" : "Silenciar");
    };
    boton.addEventListener("click", () => {
      const activar = video.muted;
      conSonido.forEach((v) => (v.muted = true));
      video.muted = !activar;
      if (activar) video.play().catch(() => {});
    });
    video.addEventListener("volumechange", actualizar);
    actualizar();
    video.parentElement.append(boton);
  });

  // Las láminas suben al entrar y los videos corren solos solo mientras se ven
  if ("IntersectionObserver" in window && !reducido) {
    const laminas = caso.querySelectorAll(".lamina");
    laminas.forEach((l) => l.classList.add("por-entrar"));
    const alEntrar = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("entrada");
        e.target.classList.remove("por-entrar");
        alEntrar.unobserve(e.target);
      }
    }, { root: caso, rootMargin: "0px 0px -22% 0px" });
    laminas.forEach((l) => alEntrar.observe(l));

    // La primera lámina vuelve a darse vuelta cada vez que se entra al caso
    const primera = caso.querySelector(".lamina--contexto");
    if (primera) {
      caso.addEventListener("close", () => {
        primera.classList.remove("entrada");
        primera.classList.add("por-entrar");
        alEntrar.observe(primera);
      });
    }

    const videos = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.isIntersecting) e.target.play().catch(() => {});
        else e.target.pause();
      }
    }, { root: caso, threshold: 0.35 });
    caso.querySelectorAll("video[data-auto]").forEach((v) => videos.observe(v));

    // Las cifras suben hasta su valor la primera vez que se ven
    const cifras = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        cifras.unobserve(e.target);
        e.target.querySelectorAll("strong").forEach((n, i) => contar(n, i * 80));
      }
    }, { root: caso, threshold: 0.4 });
    caso.querySelectorAll(".cifras").forEach((c) => cifras.observe(c));
  } else {
    // Con movimiento reducido no corre nada solo: el video se reproduce a pedido
    caso.querySelectorAll("video[data-auto]").forEach((v) => (v.controls = true));
  }
});

// El botón atrás cierra el caso; un enlace directo lo abre
addEventListener("popstate", () => {
  const abierto = document.querySelector("dialog[data-caso][open]");
  if (abierto && location.hash !== `#${abierto.id}`) {
    casoAbiertoAca = false;
    abierto.close();
  }
  const pedido = casoDe(location.hash);
  if (pedido) mostrarCaso(pedido);
});
if (casoDe(location.hash)) mostrarCaso(casoDe(location.hash));

// ---------- Secciones: cada bloque aparece al entrar en pantalla ----------
if ("IntersectionObserver" in window && !reducido) {
  const bloques = [...document.querySelectorAll(
    "#sobre-mi h2, #sobre-mi .sobre-mi__texto > p, #sobre-mi .datos > div, .certificados__titulo, .certificados__ventana, .certificados__pausa, #que-hago h2, #que-hago .seccion__bajada, #que-hago .pilar, #escritos h2, #escritos .seccion__bajada, #escritos .escrito, #herramientas h2, #herramientas .seccion__bajada, #herramientas .herramienta, #contacto h2, #contacto .seccion__bajada, #contacto .hero__acciones"
  )];
  const verBloque = new IntersectionObserver((entradas) => {
    // Los que entran juntos salen escalonados
    entradas.filter((e) => e.isIntersecting).forEach((e, i) => {
      verBloque.unobserve(e.target);
      const el = vigilado.get(e.target) || e.target;
      el.style.setProperty("--orden", i);
      el.classList.add("apareciendo");
      el.classList.remove("por-aparecer");
      setTimeout(() => {
        el.classList.remove("apareciendo", "barrido", "desde-derecha");
        el.style.removeProperty("--orden");
      }, 2200);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  // Un título recortado no cuenta como visible: se vigila su contenedor
  const vigilado = new Map();
  bloques.forEach((el) => {
    // Títulos: barrido; listas y logos: desde la derecha; textos: desde la izquierda
    if (el.matches("h2")) el.classList.add("barrido");
    else if (el.matches(".pilar, .herramienta, .datos > div, .hero__acciones")) el.classList.add("desde-derecha");
    el.classList.add("por-aparecer");
    const testigo = el.matches("h2") ? el.parentElement : el;
    if (testigo !== el) vigilado.set(testigo, el);
    verBloque.observe(testigo);
  });
}

// ---------- Títulos: el resaltado se pinta la primera vez que se ven ----------
if ("IntersectionObserver" in window) {
  const verTitulo = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("titulo-marca--visible");
      verTitulo.unobserve(e.target);
    }
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-titulo-marca]").forEach((t) => verTitulo.observe(t));
}

// ---------- Certificados: cuatro copias para que la fila no tenga corte; se puede pausar ----------
const certificados = document.querySelector("[data-certificados]");
if (certificados && !reducido) {
  const pista = certificados.querySelector(".certificados__pista");
  const originales = [...pista.children];
  for (let i = 0; i < 3; i++) {
    originales.forEach((item) => {
      const copia = item.cloneNode(true);
      copia.setAttribute("aria-hidden", "true");
      copia.querySelector("a").tabIndex = -1;
      pista.append(copia);
    });
  }
  certificados.querySelector("[data-pausar-certificados]").addEventListener("click", (e) => {
    const pausada = certificados.classList.toggle("certificados--pausada");
    e.currentTarget.setAttribute("aria-pressed", String(pausada));
    e.currentTarget.textContent = pausada ? "Seguir" : "Pausar";
  });
}

// ---------- Índice "Ver todos": lista los trabajos sin recorrer las carpetas ----------
const indice = document.querySelector("[data-indice]");
const listaIndice = document.querySelector("[data-indice-lista]");

function llevarACarpeta(i) {
  // i es la posición en el índice; la rueda solo tiene los destacados
  const enRueda = destacados.indexOf(carpetas[i]);
  if (enRueda < 0) return;
  const enlace = rueda.children[enRueda].firstElementChild;
  if (reducido) enlace.scrollIntoView({ block: "center" });
  else irACarpeta(i);
  enlace.focus({ preventScroll: true });
}

// Abre el caso del trabajo si ya existe; si no, lleva a su carpeta
function irATrabajo(i) {
  const hash = carpetas[i].el.querySelector("a").hash;
  if (casoDe(hash)) abrirCaso(hash);
  else llevarACarpeta(i);
}

carpetas.forEach((c, i) => {
  const dato = (clase) => c.el.querySelector(`.carpeta__${clase}`);
  const fila = document.createElement("li");
  fila.dataset.temas = c.el.dataset.temas;
  const boton = document.createElement("button");
  boton.className = "tarjeta";
  boton.type = "button";

  const imagen = dato("ficha").querySelector("img");
  if (imagen) {
    const copia = imagen.cloneNode();
    copia.className = "tarjeta__imagen";
    boton.append(copia);
  }
  const titulo = document.createElement("span");
  titulo.className = "tarjeta__titulo";
  titulo.textContent = dato("titulo").textContent;
  const categoria = document.createElement("span");
  categoria.className = "tarjeta__categoria";
  categoria.textContent = dato("categoria").textContent;
  if (dato("tipo").classList.contains("carpeta__tipo--real")) {
    const real = document.createElement("span");
    real.className = "tarjeta__tipo--real";
    real.textContent = ` · ${dato("tipo").textContent}`;
    categoria.append(real);
  }
  boton.append(titulo);
  boton.insertAdjacentHTML("beforeend", FLECHA);
  boton.append(categoria);

  boton.addEventListener("click", () => {
    indice.close();
    irATrabajo(i);
  });
  fila.append(boton);
  listaIndice.append(fila);
});

// Filtros del índice: salen de los temas de cada carpeta
const contenedorFiltros = document.querySelector("[data-filtros]");
const temas = ["Todo", ...new Set(carpetas.flatMap((c) => c.el.dataset.temas.split("|")))];

temas.forEach((tema) => {
  const item = document.createElement("li");
  const filtro = document.createElement("button");
  filtro.className = "filtro";
  filtro.type = "button";
  filtro.textContent = tema;
  filtro.setAttribute("aria-pressed", String(tema === "Todo"));
  filtro.addEventListener("click", () => {
    contenedorFiltros.querySelectorAll(".filtro").forEach((f) => f.setAttribute("aria-pressed", String(f === filtro)));
    for (const fila of listaIndice.children) {
      fila.hidden = tema !== "Todo" && !fila.dataset.temas.split("|").includes(tema);
    }
  });
  item.append(filtro);
  contenedorFiltros.append(item);
});

// El enlace "Trabajos" del menú también abre el índice (sin JS, baja a la rueda)
function abrirIndice(e) {
  e?.preventDefault();
  bloquearFondo();
  indice.showModal();
}

document.querySelectorAll("[data-ver-todos]").forEach((boton) => boton.addEventListener("click", abrirIndice));
document.querySelector("[data-cerrar-indice]")?.addEventListener("click", () => indice.close());
indice?.addEventListener("close", () => {
  document.documentElement.classList.remove("indice-abierto");
  // Si se abrió desde un link filtrado, al cerrar se limpia la dirección
  if (filtroDelEnlace()) history.replaceState(null, "", location.pathname + location.search);
});

// Links para compartir con el índice ya filtrado: /#marketing, /#comunicacion, /#diseno-web…
const aSlug = (texto) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, "-");

function filtroDelEnlace() {
  const pedido = decodeURIComponent(location.hash.slice(1));
  if (!pedido) return null;
  return [...contenedorFiltros.querySelectorAll(".filtro")].find((f) => aSlug(f.textContent) === pedido) || null;
}

function abrirIndiceFiltrado() {
  const filtro = filtroDelEnlace();
  if (!filtro || !indice) return;
  filtro.click();
  if (!indice.open) abrirIndice();
}

abrirIndiceFiltrado();
addEventListener("hashchange", abrirIndiceFiltrado);

// ---------- Lo que escribo: cada pieza abre su texto entero ----------
document.querySelectorAll("[data-lectura]").forEach((pieza) => {
  pieza.addEventListener("click", () => {
    const lectura = document.getElementById(`lectura-${pieza.dataset.lectura}`);
    if (!lectura) return;
    bloquearFondo();
    lectura.showModal();
    lectura.scrollTop = 0;
  });
});
document.querySelectorAll("[data-lectura-dialogo]").forEach((lectura) => {
  lectura.querySelector("[data-cerrar-lectura]").addEventListener("click", () => lectura.close());
  lectura.addEventListener("close", () => document.documentElement.classList.remove("indice-abierto"));
});

// ---------- Formulario de contacto: envía sin recargar ----------
const panelContacto = document.querySelector("[data-contacto]");
const formulario = panelContacto?.querySelector("[data-formulario]");

// El título entra letra por letra; el lector de pantalla lee la frase entera
const tituloContacto = panelContacto?.querySelector("[data-letras]");
if (tituloContacto) {
  const texto = tituloContacto.firstChild.textContent;
  tituloContacto.setAttribute("aria-label", texto);
  let i = 0;
  const palabras = texto.split(" ").map((palabra) => {
    const letras = [...palabra].map((l) => `<span class="letra" style="--i: ${i++}">${l}</span>`).join("");
    return `<span class="palabra-entera" aria-hidden="true">${letras}</span>`;
  });
  tituloContacto.firstChild.remove();
  tituloContacto.insertAdjacentHTML("afterbegin", palabras.join(" "));
}

// La tarjeta se endereza y el título entra letra por letra la primera vez que se ve
if (panelContacto && !reducido && "IntersectionObserver" in window) {
  panelContacto.classList.add("por-entrar");
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting) return;
    panelContacto.classList.replace("por-entrar", "entra");
    obs.disconnect();
  }, { threshold: 0.2 }).observe(panelContacto);
}

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
    if (!formulario.dataset.envio || !datos.access_key) throw new Error("Sin servicio de envío");
    const respuesta = await fetch(formulario.dataset.envio, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...datos, subject: `Portfolio: ${datos.motivo}`, from_name: "Portfolio de Micaela" }),
    });
    // Se confía en success, no solo en el código HTTP
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || String(resultado.success) !== "true") throw new Error(resultado.message || String(respuesta.status));
    formulario.reset();
    avisar("¡Gracias! Ya me llegó tu mensaje y te respondo pronto.", false);
  } catch {
    avisar("No se pudo enviar. Tu mensaje sigue acá: probá de nuevo en un rato.", true);
  }
  boton.disabled = false;
});

// ---------- Retratos: la ventana y la foto se asientan al entrar en pantalla ----------
const retratos = [...document.querySelectorAll("[data-revelar]")].map((el) => ({ el, actual: 0 }));

function actualizarRetratos() {
  for (const r of retratos) {
    const caja = r.el.getBoundingClientRect();
    const p = (innerHeight - caja.top) / (innerHeight * 0.8);
    const objetivo = Math.min(1, Math.max(0, p - 0.1));
    r.actual += (objetivo - r.actual) * 0.08;
    r.el.style.setProperty("--revelado", r.actual.toFixed(4));
  }
}

// ---------- Burbuja "Ver" que sigue al mouse sobre las carpetas ----------
const cursor = document.querySelector(".cursor");
const c = { x: -100, y: -100, rx: -100, ry: -100 };
const usarCursor = conMouse && !reducido && cursor;

if (usarCursor) {
  document.documentElement.classList.add("con-cursor");
  addEventListener("pointermove", (e) => {
    c.x = e.clientX;
    c.y = e.clientY;
    cursor.classList.toggle("ver", !!e.target.closest("[data-cursor='ver']"));
  });
}

// ---------- Secciones apiladas: la siguiente sube por encima de la anterior ----------
// ---------- Un solo bucle para todo lo que depende del scroll ----------
const luzPortada = document.querySelector("[data-luz]");
const luz = { x: 0, y: 0, rx: 0, ry: 0 };
if (luzPortada && conMouse && !reducido) {
  addEventListener("pointermove", (e) => {
    if (!luzPortada.classList.contains("hero__luz--activa")) {
      luz.rx = e.clientX;
      luz.ry = e.clientY;
      luzPortada.classList.add("hero__luz--activa");
    }
    luz.x = e.clientX;
    luz.y = e.clientY;
  }, { passive: true });
}
let scrollPrevio = scrollY;
let velScroll = 0;

function cuadro() {
  velScroll += (scrollY - scrollPrevio - velScroll) * 0.15;
  scrollPrevio = scrollY;

  if (pista && !reducido) {
    const dir = velScroll < 0 ? -1 : 1;
    franjaX -= (1 + Math.abs(velScroll) * 0.25) * dir;
    const ancho = pista.scrollWidth / 4;
    if (franjaX < -ancho) franjaX += ancho;
    if (franjaX > 0) franjaX -= ancho;
    pista.style.transform = `translateX(${franjaX}px)`;
  }

  actualizarPilares();
  moverRueda();
  if (luzPortada?.classList.contains("hero__luz--activa")) {
    luz.rx += (luz.x - luz.rx) * 0.05;
    luz.ry += (luz.y - luz.ry) * 0.05;
    luzPortada.style.transform = `translate(${luz.rx.toFixed(1)}px, ${luz.ry.toFixed(1)}px)`;
  }
  if (!reducido) actualizarRetratos();

  if (usarCursor) {
    c.rx += (c.x - c.rx) * 0.16;
    c.ry += (c.y - c.ry) * 0.16;
    cursor.style.transform = `translate(${c.rx}px, ${c.ry}px)`;
  }

  requestAnimationFrame(cuadro);
}

requestAnimationFrame(cuadro);
