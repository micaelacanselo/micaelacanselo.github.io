// Portada: fotos de los proyectos. Se apilan en el centro una tras otra y se abren en un collage
// alrededor de la frase; después se esconden y van apareciendo solo cerca del mouse (o del dedo).
// Al bajar se juntan hacia el centro. Cualquier interacción saltea la intro.
// Con movimiento reducido el collage queda quieto y a la vista.

const hero = document.querySelector("[data-hero]");
const capa = hero?.querySelector("[data-hero-fondo]");
const apertura = hero?.querySelector("[data-apertura]");
const raiz = document.documentElement;

// Miniaturas que arma 05-Herramientas/collage.mjs: [nombre, ancho, alto]
const FOTOS = [
  ["magnolia", 360, 270], ["havanna-foto", 360, 450], ["tono-celular", 360, 480], ["itba", 360, 270],
  ["campagnola-foto", 360, 480], ["gae", 360, 270], ["itba-gondola", 360, 480], ["tono", 360, 270],
  ["adopciones-historia", 360, 480], ["burgbox", 360, 270], ["spa-celular", 360, 480], ["raiz", 360, 270],
  ["relax-spa", 360, 270], ["itba-entrega", 360, 480], ["havanna", 360, 270],
  ["raiz-celular", 360, 480], ["campagnola", 360, 270], ["instituto", 360, 270], ["adopciones", 360, 270],
  ["plantilla", 360, 270], ["escribo", 360, 270],
];

if (hero && capa && apertura) {
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CURVA = "cubic-bezier(.2,.7,.2,1)";
  const PASO_PILA = 75; // cada cuánto cae una foto en la pila
  const EN_PILA = 14; // cuántas pasan por la pila antes de abrirse
  const APERTURA = 1200; // lo que tarda el collage en abrirse

  let fotos = [];
  let terminada = false;
  let viviendo = false;
  let enPantalla = true;
  new IntersectionObserver(([e]) => (enPantalla = e.isIntersecting)).observe(capa);
  let W = 0;
  let H = 0;
  const LEJOS = -99999;
  // x/y: posición relativa para el paralaje; px/py: posición en pantalla para revelar las fotos
  const puntero = { x: 0, y: 0, vx: 0, vy: 0, px: LEJOS, py: LEJOS };
  let soltarDedo = 0;

  // Pseudoaleatorio con semilla: el collage sale igual en cada visita y no salta al recargar
  let semilla = 7;
  const azar = () => ((semilla = (semilla * 16807) % 2147483647) - 1) / 2147483646;

  fotos = FOTOS.map(([nombre, ancho, alto]) => {
    const img = document.createElement("img");
    img.className = "collage__foto";
    img.src = `assets/img/collage/${nombre}.webp`;
    img.alt = "";
    img.width = ancho;
    img.height = alto;
    img.decoding = "async";
    capa.append(img);
    return { img, ratio: alto / ancho, x: 0, y: 0, w: 0, s: 1, prof: 0, visible: false, luz: 0 };
  });

  // Zonas libres: la frase con la bajada y los botones, y la figura de Mica
  function zonasLibres() {
    const base = capa.getBoundingClientRect();
    const m = W < 700 ? 14 : 30;
    const caja = (rects, margen) => ({
      x1: Math.min(...rects.map((r) => r.left)) - base.left - margen,
      x2: Math.max(...rects.map((r) => r.right)) - base.left + margen,
      y1: Math.min(...rects.map((r) => r.top)) - base.top - margen,
      y2: Math.max(...rects.map((r) => r.bottom)) - base.top + margen,
    });
    const zonas = [caja([...apertura.querySelectorAll("h1, .hero__sub, .hero__acciones")].map((el) => el.getBoundingClientRect()), m)];
    // Mica y su globo de saludo (el globo sale de la figura, así que se mide aparte)
    const mica = [".mica__figura", ".mica__globo", "[data-mica-lugar]"].map((sel) => document.querySelector(sel)?.getBoundingClientRect()).filter((r) => r?.width);
    if (mica.length) zonas.push(caja(mica, 14));
    return zonas;
  }

  function ubicar() {
    const r = capa.getBoundingClientRect();
    W = r.width;
    H = r.height;
    semilla = 7;
    const zonas = zonasLibres();
    const techo = (document.querySelector(".encabezado")?.getBoundingClientRect().bottom || 72) - r.top + 10;
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
        const y = techo + azar() * (H - h - techo - 8);
        const choca = (a) => x < a.x2 + hueco && x + f.w > a.x1 - hueco && y < a.y2 + hueco && y + h > a.y1 - hueco;
        if (zonas.some(choca) || puestas.some(choca)) continue;
        puestas.push({ x1: x, x2: x + f.w, y1: y, y2: y + h });
        Object.assign(f, { x, y, visible: true, prof: 0.4 + azar() * 0.9 });
        break;
      }
      f.img.style.setProperty("--ancho", `${f.w.toFixed(1)}px`);
    }
  }

  const transformar = (f, x, y, s = 1) => `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${s.toFixed(3)})`;

  // Estado final: cada foto se enciende cuando el puntero pasa cerca (aparece rápido y se apaga lento)
  // y, al bajar, todas se juntan hacia el centro y se apagan
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
      f.img.style.transform = transformar(f, x, y, (1 - k * 0.55) * (0.9 + f.luz * 0.1));
      f.img.style.opacity = (f.luz * (1 - k * k)).toFixed(3);
    }
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
    quitarSaltos();
    raiz.classList.remove("intro");
    mostrarFinal(true);
  }

  // Intro: pila en el centro y después el collage se abre
  function intro() {
    const cx = W / 2;
    const cy = H / 2;
    const pila = fotos.slice(0, EN_PILA);
    for (const f of fotos) {
      const ancho = Math.min(W * 0.36, 190);
      const s = ancho / f.w;
      const jx = (azar() - 0.5) * 50;
      const jy = (azar() - 0.5) * 40;
      f.img.style.transition = "none";
      f.img.style.transform = transformar(f, cx - f.w / 2 + jx, cy - (f.w * f.ratio) / 2 + jy, s);
    }
    pila.forEach((f, i) => setTimeout(() => !terminada && (f.img.style.opacity = 1), 120 + i * PASO_PILA));
    const abre = 120 + EN_PILA * PASO_PILA + 250;
    setTimeout(() => {
      if (terminada) return;
      for (const f of fotos) {
        const demora = Math.round(azar() * 220);
        f.img.style.transition = `transform ${APERTURA}ms ${CURVA} ${demora}ms, opacity 500ms ease ${demora}ms`;
        f.img.style.opacity = f.visible ? 1 : 0;
        f.img.style.transform = transformar(f, f.x, f.y, 1);
      }
      // La frase entra cuando el collage ya dejó el centro libre
      setTimeout(() => {
        if (terminada) return;
        hero.classList.add("titulo-entra");
        raiz.classList.remove("intro");
      }, 420);
      setTimeout(terminar, APERTURA + 260);
    }, abre);
  }

  const saltos = ["wheel", "touchmove", "keydown", "pointerdown", "scroll"];
  const quitarSaltos = () => saltos.forEach((e) => removeEventListener(e, terminar));

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

  document.fonts.ready.then(() => {
    ubicar();
    if (raiz.classList.contains("intro")) {
      saltos.forEach((e) => addEventListener(e, terminar, { passive: true }));
      intro();
    } else {
      terminada = true;
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
