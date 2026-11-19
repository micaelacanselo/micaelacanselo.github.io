// Casos (#trabajo-slug), índice "Ver todos" con filtros, lecturas de Lo que escribo y burbuja "Ver".
// Salen del sistema anterior (main.js); los usa la portada minimalista.
const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

const secTrabajos = document.querySelector("[data-trabajos]");
const carpetas = [...document.querySelectorAll("[data-carpetas] > .carpeta")].map((el) => ({ el }));
const datoCarpeta = (c, clase) => c.el.querySelector(`.carpeta__${clase}`);

// Lleva a la tarjeta del trabajo en la grilla de Trabajos
function llevarAProyecto(i) {
  const hash = carpetas[i].el.querySelector("a").hash;
  const enlace = document.querySelector(`.trabajo a[href="${hash}"]`);
  secTrabajos?.scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
  enlace?.focus({ preventScroll: true });
}

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
      secTrabajos.scrollIntoView();
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
        setTimeout(() => llevarAProyecto(i), 60);
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

// ---------- Índice "Ver todos": lista los trabajos sin recorrer las carpetas ----------
const indice = document.querySelector("[data-indice]");
const listaIndice = document.querySelector("[data-indice-lista]");

// Abre el caso del trabajo si ya existe; si no, lleva a su carpeta
function irATrabajo(i) {
  const hash = carpetas[i].el.querySelector("a").hash;
  const seccion = casoDe(hash) ? null : document.querySelector(`section${hash}`);
  if (casoDe(hash)) abrirCaso(hash);
  else if (seccion) {
    // Algunos trabajos son una sección de la página (Lo que escribo): se baja hasta ella
    seccion.scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
    const titulo = seccion.querySelector("h2");
    titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  } else llevarAProyecto(i);
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

// El enlace "Trabajos" del menú también abre el índice (sin JS, baja a los proyectos)
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
  lectura.addEventListener("close", () => {
    if (!document.querySelector("dialog[open]")) document.documentElement.classList.remove("indice-abierto");
  });
});

// ---------- Transición tarjeta → caso: la portada crece hasta cubrir la pantalla y el caso aparece encima ----------
// Al cerrar hace el camino inverso y vuelve a su lugar en la hilera. Solo transform y opacidad.
const CURVA = "cubic-bezier(0.32, 0.72, 0, 1)";
const ABRIR = 650;
const CERRAR = 550;

function cubrir(r) {
  // Escala pareja para que la portada tape toda la pantalla, centrada
  const s = Math.max(innerWidth / r.width, innerHeight / r.height) * 1.02;
  const dx = innerWidth / 2 - (r.left + r.width / 2);
  const dy = innerHeight / 2 - (r.top + r.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}

function copiaDe(img) {
  const r = img.getBoundingClientRect();
  const copia = document.createElement("div");
  copia.className = "expansion";
  copia.setAttribute("aria-hidden", "true");
  Object.assign(copia.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const foto = document.createElement("img");
  foto.src = img.currentSrc || img.src;
  foto.alt = "";
  copia.append(foto);
  document.body.append(copia);
  return { copia, r };
}

function abrirDesdeTarjeta(enlace) {
  const img = enlace.querySelector("img");
  const caso = casoDe(enlace.hash);
  if (reducido || !img || !caso || !("animate" in Element.prototype)) return abrirCaso(enlace.hash);
  caso._tarjeta = enlace;
  const { copia, r } = copiaDe(img);
  img.style.visibility = "hidden";
  copia.animate([{ transform: "none" }, { transform: cubrir(r) }], { duration: ABRIR, easing: CURVA, fill: "forwards" })
    .finished.then(() => {
      caso.classList.add("caso--desde-tarjeta");
      abrirCaso(enlace.hash);
      img.style.visibility = "";
      // El caso aparece encima; recién ahí se saca la copia
      setTimeout(() => copia.remove(), 320);
    });
}

function volverATarjeta(caso) {
  const enlace = caso._tarjeta;
  caso._tarjeta = null;
  caso.classList.remove("caso--desde-tarjeta");
  const img = enlace?.querySelector("img");
  if (reducido || !img) return;
  // Espera a que la página recupere su lugar antes de medir la tarjeta
  requestAnimationFrame(() => {
    const r = img.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
    const { copia } = copiaDe(img);
    img.style.visibility = "hidden";
    copia.animate(
      [{ transform: cubrir(r), opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: "none", opacity: 1 }],
      { duration: CERRAR, easing: CURVA }
    ).finished.then(() => {
      img.style.visibility = "";
      copia.remove();
    });
  });
}

document.querySelectorAll("[data-caso]").forEach((caso) => {
  caso.addEventListener("close", () => {
    if (caso._tarjeta && !pasandoDeCaso) volverATarjeta(caso);
    else caso.classList.remove("caso--desde-tarjeta");
  });
});

// Las tarjetas de Trabajos abren su caso sin salir de la página
document.querySelectorAll('.trabajo a[href^="#trabajo-"], .obra a[href^="#trabajo-"]').forEach((enlace) => {
  enlace.addEventListener("click", (e) => {
    if (!casoDe(enlace.hash)) return;
    e.preventDefault();
    if (document.querySelector(".expansion")) return;
    abrirDesdeTarjeta(enlace);
  });
});

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

if (usarCursor) {
  const seguir = () => {
    c.rx += (c.x - c.rx) * 0.16;
    c.ry += (c.y - c.ry) * 0.16;
    cursor.style.transform = `translate(${c.rx}px, ${c.ry}px)`;
    requestAnimationFrame(seguir);
  };
  requestAnimationFrame(seguir);
}
