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

// ---------- Proyectos: dos hileras que se deslizan de costado, en sentidos opuestos, al scrollear ----------
const secTrabajos = document.querySelector("[data-trabajos]");
const carpetas = [...document.querySelectorAll("[data-carpetas] > .carpeta")].map((el) => ({ el }));
const destacados = carpetas.filter((c) => c.el.hasAttribute("data-destacado"));
const pistas = [...document.querySelectorAll("[data-hilera]")];
const DESLIZA = 0.7; // px de costado por cada px de scroll
const hileras = [];
let hilerasVisibles = false;

const datoCarpeta = (c, clase) => c.el.querySelector(`.carpeta__${clase}`);

function tarjetaProyecto(c, copia) {
  const hash = c.el.querySelector("a").hash;
  const tipo = datoCarpeta(c, "tipo");
  const li = document.createElement("li");
  li.className = "hilera__item";
  if (copia) {
    li.setAttribute("aria-hidden", "true");
    li.inert = true;
  }
  li.innerHTML = `<a class="proyecto" href="${hash}" data-cursor="ver">
      <span class="proyecto__imagen"><img src="${c.el.querySelector(".carpeta__ficha img").getAttribute("src")}" alt="" width="1200" height="900" loading="lazy" decoding="async"></span>
      <span class="proyecto__texto">
        <span class="proyecto__titulo">${datoCarpeta(c, "titulo").textContent}</span>
        <span class="proyecto__categoria">${datoCarpeta(c, "categoria").textContent}</span>
        <span class="proyecto__tipo${tipo.classList.contains("carpeta__tipo--real") ? " proyecto__tipo--real" : ""}">${tipo.textContent}</span>
      </span>
    </a>`;
  li.firstElementChild.addEventListener("click", (e) => {
    if (!casoDe(hash)) return; // Lo que escribo es una sección: el enlace baja solo
    e.preventDefault();
    abrirCaso(hash);
  });
  return li;
}

// Primera hilera: los destacados primero; la segunda, el resto
const mitad = Math.ceil(carpetas.length / 2);
const orden = [...destacados, ...carpetas.filter((c) => !destacados.includes(c))];
[orden.slice(0, mitad), orden.slice(mitad)].forEach((grupo, n) => {
  const pista = pistas[n];
  if (!pista) return;
  grupo.forEach((c) => pista.append(tarjetaProyecto(c, false)));
  // Una copia de relleno para que la hilera no tenga fin; con movimiento reducido se recorre a mano
  if (!reducido) grupo.forEach((c) => pista.append(tarjetaProyecto(c, true)));
  const h = { pista, x: 0, ajuste: 0, inicio: n === 0 ? 0 : 0.5, sentido: n === 0 ? -1 : 1, ancho: 0 };
  // Con teclado, la tarjeta enfocada se corre hasta quedar a la vista
  pista.addEventListener("focusin", (e) => {
    if (reducido) return;
    const r = e.target.getBoundingClientRect();
    const margen = innerWidth * 0.08;
    if (r.left < margen) h.ajuste += margen - r.left;
    else if (r.right > innerWidth - margen) h.ajuste -= r.right - (innerWidth - margen);
  });
  hileras.push(h);
});

function medirHileras() {
  for (const h of hileras) h.ancho = h.pista.scrollWidth / 2;
}

// La posición sale del scroll: la primera hilera va a la izquierda y la segunda a la derecha.
// Se acerca suave a su lugar, así el movimiento sigue un instante después de frenar
function moverHileras() {
  if (reducido || !hilerasVisibles) return;
  const recorrido = innerHeight - secTrabajos.getBoundingClientRect().top;
  for (const h of hileras) {
    if (!h.ancho) continue;
    const objetivo = -h.inicio * h.ancho + recorrido * DESLIZA * h.sentido + h.ajuste;
    h.x += (objetivo - h.x) * 0.12;
    // Las copias de relleno hacen que nunca se vea el final
    const visible = (((h.x % h.ancho) + h.ancho) % h.ancho) - h.ancho;
    h.pista.style.transform = `translate3d(${visible.toFixed(1)}px, 0, 0)`;
  }
}

if (secTrabajos && !reducido) {
  medirHileras();
  addEventListener("resize", medirHileras);
  addEventListener("load", medirHileras);
  new IntersectionObserver(([e]) => (hilerasVisibles = e.isIntersecting)).observe(secTrabajos);
}


// Lleva a la tarjeta de un proyecto en las hileras (desde el índice)
function llevarAProyecto(i) {
  const enlace = [...document.querySelectorAll(".hilera__item:not([aria-hidden]) .proyecto")].find((a) => a.hash === carpetas[i].el.querySelector("a").hash);
  if (!enlace) return;
  secTrabajos.scrollIntoView({ behavior: reducido ? "auto" : "smooth" });
  enlace.focus({ preventScroll: true });
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
  moverHileras();
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
