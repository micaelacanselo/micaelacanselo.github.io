// Página de servicios: apariciones al bajar, encabezado que sigue a la sección, luz de la tarjeta destacada y formulario

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const conMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;
const raiz = document.documentElement;

// ---------- Apariciones: cada bloque se asienta una sola vez al entrar en pantalla ----------
const bloques = [...document.querySelectorAll("[data-aparecer]")];
const marcas = [...document.querySelectorAll("[data-titulo-marca]")];

if (!reducido && "IntersectionObserver" in window) {
  raiz.classList.add("js-aparecer");

  // Los hermanos que entran juntos se escalonan; lo que entra solo no espera
  const ordenes = new Map();
  for (const el of bloques) {
    const padre = el.parentElement;
    const n = ordenes.get(padre) ?? 0;
    el.style.setProperty("--orden", Math.min(n, 5));
    ordenes.set(padre, n + 1);
  }

  const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("visible");
      // Cuando termina de entrar, la tarjeta recupera su hover rápido
      e.target.addEventListener("transitionend", () => e.target.classList.add("asentado"), { once: true });
      observador.unobserve(e.target);
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

  bloques.forEach((el) => observador.observe(el));
}

// El resaltado de los títulos se pinta una vez, como en el portfolio
if ("IntersectionObserver" in window) {
  const obsMarca = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      // El de la portada espera a que el renglón termine de subir
      const espera = e.target.closest(".portada") && !reducido ? 650 : 0;
      setTimeout(() => e.target.classList.add("titulo-marca--visible"), espera);
      obsMarca.unobserve(e.target);
    }
  }, { threshold: 0.6 });
  marcas.forEach((el) => obsMarca.observe(el));
} else {
  marcas.forEach((el) => el.classList.add("titulo-marca--visible"));
}

// ---------- Encabezado: crema sobre lo claro, espresso sobre lo oscuro ----------
const encabezado = document.querySelector("[data-encabezado]");
const oscuras = [...document.querySelectorAll("main .tema-oscuro:not(.servicio), .pie")];
let pendiente = false;

function actualizarEncabezado() {
  pendiente = false;
  const linea = encabezado.offsetHeight / 2;
  const sobreOscuro = oscuras.some((s) => {
    const caja = s.getBoundingClientRect();
    return caja.top <= linea && caja.bottom >= linea;
  });
  encabezado.classList.toggle("encabezado--sobre-oscuro", sobreOscuro);
  encabezado.classList.toggle("encabezado--sobre-claro", !sobreOscuro);
  encabezado.classList.toggle("encabezado--con-borde", scrollY > 8 && !sobreOscuro);
}

if (encabezado) {
  addEventListener("scroll", () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(actualizarEncabezado);
  }, { passive: true });
  actualizarEncabezado();
}

// ---------- Tarjeta destacada: una luz caramelo sigue al puntero, con un poco de retraso ----------
const destacada = document.querySelector("[data-luz-tarjeta]");

if (destacada && conMouse && !reducido) {
  const luz = { x: 30, y: 0, ax: 30, ay: 0 };
  let andando = false;

  const mover = () => {
    luz.ax += (luz.x - luz.ax) * 0.12;
    luz.ay += (luz.y - luz.ay) * 0.12;
    destacada.style.setProperty("--luz-x", `${luz.ax.toFixed(2)}%`);
    destacada.style.setProperty("--luz-y", `${luz.ay.toFixed(2)}%`);
    if (Math.abs(luz.x - luz.ax) + Math.abs(luz.y - luz.ay) > 0.1) {
      requestAnimationFrame(mover);
    } else {
      andando = false;
    }
  };

  const apuntar = (x, y) => {
    luz.x = x;
    luz.y = y;
    if (!andando) {
      andando = true;
      requestAnimationFrame(mover);
    }
  };

  destacada.addEventListener("pointermove", (e) => {
    const caja = destacada.getBoundingClientRect();
    apuntar(((e.clientX - caja.left) / caja.width) * 100, ((e.clientY - caja.top) / caja.height) * 100);
  });
  destacada.addEventListener("pointerleave", () => apuntar(30, 0));
}

// ---------- Formulario: envía sin recargar (mismo servicio que el portfolio) ----------
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
    if (!formulario.dataset.envio || !datos.access_key) throw new Error("Sin servicio de envío");
    const respuesta = await fetch(formulario.dataset.envio, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...datos, subject: `Servicios: ${datos.servicio}`, from_name: "Página de servicios" }),
    });
    // Se confía en success, no solo en el código HTTP
    const resultado = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || String(resultado.success) !== "true") throw new Error(resultado.message || String(respuesta.status));
    formulario.reset();
    avisar("¡Gracias! Ya me llegó tu consulta y te respondo pronto.", false);
  } catch {
    avisar("No se pudo enviar. Tu mensaje sigue acá: probá de nuevo en un rato o escribime por WhatsApp.", true);
  }
  boton.disabled = false;
});

// ---------- Año del pie ----------
const anio = document.querySelector("[data-anio]");
if (anio) anio.textContent = new Date().getFullYear();

// Videos: se cargan y reproducen solo cuando se ven; con "reducir movimiento" queda la imagen fija
const videos = [...document.querySelectorAll("video[data-video]")];

function cargar(video) {
  if (!video.getAttribute("src") && video.dataset.src) video.src = video.dataset.src;
}

if (!reducido && "IntersectionObserver" in window) {
  const obsVideo = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      const v = e.target;
      if (e.isIntersecting) {
        cargar(v);
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, { rootMargin: "120px 0px", threshold: 0.15 });
  videos.forEach((v) => obsVideo.observe(v));
}

// Visor de trabajos: cada pestaña cambia los videos y el texto
const visor = document.querySelector("[data-visor]");

if (visor) {
  const pestanas = [...visor.querySelectorAll('[role="tab"]')];
  const compu = visor.querySelector("[data-visor-compu]");
  const celu = visor.querySelector("[data-visor-celu]");
  const campo = (n) => visor.querySelector(`[data-visor-${n}]`);

  const cambiarVideo = (video, base) => {
    video.poster = `${base}.webp`;
    video.dataset.src = `${base}.mp4`;
    if (video.getAttribute("src")) {
      video.src = video.dataset.src;
      if (!reducido) video.play().catch(() => {});
    }
  };

  const elegir = (p, enfocar) => {
    pestanas.forEach((x) => {
      const activa = x === p;
      x.setAttribute("aria-selected", String(activa));
      x.tabIndex = activa ? 0 : -1;
    });
    cambiarVideo(compu, p.dataset.compu);
    cambiarVideo(celu, p.dataset.celu);
    campo("titulo").textContent = p.dataset.titulo;
    campo("categoria").textContent = p.dataset.categoria;
    campo("frase").textContent = p.dataset.frase;
    campo("enlace").href = p.dataset.enlace;
    const enlace = campo("enlace");
    enlace.textContent = p.dataset.texto || "Ver cómo lo pensé";
    if ("externo" in p.dataset) {
      enlace.target = "_blank";
      enlace.rel = "noopener";
    } else {
      enlace.removeAttribute("target");
      enlace.removeAttribute("rel");
    }
    if (enfocar) p.focus();
  };

  pestanas.forEach((p, i) => {
    p.addEventListener("click", () => elegir(p));
    p.addEventListener("keydown", (e) => {
      const paso = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!paso) return;
      e.preventDefault();
      elegir(pestanas[(i + paso + pestanas.length) % pestanas.length], true);
    });
  });
}
