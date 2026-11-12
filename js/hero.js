// Portada: "de la idea a la experiencia". Entra en sand con un boom de íconos que, en unos
// 3 segundos, van disminuyendo y se convierten en las letras del título. Unos pocos
// quedan flotando muy lento y se avivan cerca del cursor. Cualquier interacción saltea la intro.

const hero = document.querySelector("[data-hero]");
const cv = hero?.querySelector("[data-hero-fondo]");
const titulo = hero?.querySelector("h1");
const raiz = document.documentElement;

if (hero && cv && titulo) {
  const ctx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const simbolos = ["idea", "marca", "copy", "web", "UX", "relato", "tono", "boceto", "brief", "voz", "forma"];
  const estilos = getComputedStyle(raiz);
  const acento = estilos.getPropertyValue("--tostado").trim();
  const neutro = estilos.getPropertyValue("--marron").trim();
  const tinta = estilos.getPropertyValue("--tinta").trim();

  // Línea de tiempo en milisegundos
  const FIN_BOOM = 800; // hasta acá solo hay explosión
  const ELIGE_QUEDAN = 1700; // de los que siguen en el aire, algunos se quedan de fondo
  const FIN_ICONOS = 2500; // el último ícono ya salió hacia su letra
  const VUELO = 500; // lo que tarda cada ícono en llegar a su letra
  const DUR_POLVO = 1100; // lo que tarda cada partícula en asentarse
  const FIN_POLVO = 3000; // la última partícula llega a su letra
  const FUNDIDO = 700; // el texto real reemplaza a las partículas
  const ALFA_FINAL = 0.3; // los íconos que quedan de fondo
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0;
  let H = 0;
  let iconos = [];
  let polvo = [];
  let inicio = 0;
  let terminada = false;
  let textoVisible = false;
  let quedanElegidos = false;
  let zonas = [];
  let visible = true;
  const puntero = { x: -9999, y: -9999 };

  function medir() {
    const r = cv.getBoundingClientRect();
    W = cv.width = Math.round(r.width * dpr);
    H = cv.height = Math.round(r.height * dpr);
  }

  // Puntos de destino: se dibuja cada palabra en un canvas auxiliar y se muestrean sus píxeles
  function objetivosTexto() {
    const pts = [];
    const base = cv.getBoundingClientRect();
    const cs = getComputedStyle(titulo);
    const tam = parseFloat(cs.fontSize);
    const alto = parseFloat(cs.lineHeight) || tam * 0.95;

    titulo.querySelectorAll(".palabra").forEach((el) => {
      const r = el.getBoundingClientRect();
      const color = tinta;
      const off = document.createElement("canvas");
      off.width = Math.ceil(r.width * dpr) + 20;
      off.height = Math.ceil(r.height * dpr) + 20;
      const o = off.getContext("2d", { willReadFrequently: true });
      o.font = `${cs.fontWeight} ${tam * dpr}px ${cs.fontFamily}`;
      o.letterSpacing = `${(parseFloat(cs.letterSpacing) || 0) * dpr}px`;
      o.fillStyle = "#fff";
      const m = o.measureText(el.textContent);
      const linea = (alto * dpr - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
      o.fillText(el.textContent, 0, linea);
      const datos = o.getImageData(0, 0, off.width, off.height).data;
      const paso = Math.max(3, Math.round(2 * dpr));
      for (let y = 0; y < off.height; y += paso) {
        for (let x = 0; x < off.width; x += paso) {
          if (datos[(y * off.width + x) * 4 + 3] > 140) {
            pts.push({ x: (r.left - base.left) * dpr + x, y: (r.top - base.top) * dpr + y, color });
          }
        }
      }
    });
    return pts;
  }

  // Zonas que los íconos esquivan: cada palabra del título, el saludo, la bajada y los botones
  function medirZonas() {
    const base = cv.getBoundingClientRect();
    const margen = 24 * dpr;
    zonas = [...hero.querySelectorAll(".palabra, .hero__sub, .hero__acciones, .rueda__carta")].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        x1: (r.left - base.left) * dpr - margen,
        x2: (r.right - base.left) * dpr + margen,
        y1: (r.top - base.top) * dpr - margen,
        y2: (r.bottom - base.top) * dpr + margen,
      };
    });
  }

  const zonaEn = (x, y) => zonas.find((z) => x > z.x1 && x < z.x2 && y > z.y1 && y < z.y2);

  // Elige los que se quedan y les da un lugar libre, repartidos por la pantalla
  function elegirQuedan(t = 0) {
    quedanElegidos = true;
    medirZonas();
    const margen = 30 * dpr;
    const techo = 90 * dpr;
    const separacion = (innerWidth < 700 ? 90 : 130) * dpr;
    const maximo = 0;
    const lugares = [];
    for (let i = 0; i < 600 && lugares.length < maximo; i++) {
      const x = margen + Math.random() * (W - margen * 2);
      const y = techo + Math.random() * (H - techo - margen);
      if (!zonaEn(x, y) && lugares.every((o) => Math.hypot(o.x - x, o.y - y) > separacion)) lugares.push({ x, y });
    }
    const candidatos = iconos.filter((p) => p.parte > t);
    lugares.forEach((lugar, i) => {
      const p = candidatos[i];
      if (!p) return;
      p.queda = true;
      p.t = "✦"; // las que quedan de fondo son solo estrellitas
      p.fin = lugar;
    });
  }

  function preparar() {
    medir();
    const pts = objetivosTexto();
    const destino = () => pts[Math.floor(Math.random() * pts.length)] || { x: W / 2, y: H / 2 };
    iconos = crearIconos(destino, true);
    polvo = pts.map((p) => ({
      ...p,
      ox: Math.random() * W,
      oy: Math.random() * H,
      parte: FIN_BOOM + 300 + Math.random() * (FIN_POLVO - DUR_POLVO - FIN_BOOM - 300),
    }));
  }

  function crearIconos(destino, desdeElCentro) {
    const n = innerWidth < 700 ? 80 : 190;
    return Array.from({ length: n }, () => {
      const a = Math.random() * 6.28;
      const v = (12 + Math.random() * 45) * dpr;
      return {
        x: desdeElCentro ? W / 2 : Math.random() * W,
        y: desdeElCentro ? H / 2 : Math.random() * H,
        queda: false,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        z: 0.35 + Math.random() * 1.1,
        t: simbolos[Math.floor(Math.random() * simbolos.length)],
        rot: Math.random() * 6.28,
        esAcento: Math.random() < 0.28,
        parte: FIN_BOOM + Math.random() * (FIN_ICONOS - FIN_BOOM),
        destino: destino(),
      };
    });
  }

  const corriente = (x, y, t) =>
    Math.sin(x * 0.0016 + t * 0.00025) * 2.2 + Math.cos(y * 0.0021 - t * 0.0002) * 2.2 + Math.sin((x + y) * 0.0009 + t * 0.0003);
  const suave = (k) => 1 - Math.pow(1 - k, 3);

  function dibujarIconos(t) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of iconos) {
      if (p.queda) {
        // No va a ninguna letra: frena y se apaga hasta quedar de fondo
        const c = Math.min(Math.max((t - ELIGE_QUEDAN) / (FIN_POLVO - ELIGE_QUEDAN), 0), 1);
        const ang = corriente(p.x, p.y, t);
        p.vx += (Math.cos(ang) * dpr - p.vx) * 0.025;
        p.vy += (Math.sin(ang) * dpr - p.vy) * 0.025;
        p.x += p.vx * (1 - c) + (p.fin.x - p.x) * c * 0.05;
        p.y += p.vy * (1 - c) + (p.fin.y - p.y) * c * 0.05;
        const alfa = Math.min(1, 0.35 + p.z * 0.4);
        pintar(p, alfa + (ALFA_FINAL - alfa) * c, 1);
        continue;
      }
      const k = Math.min(Math.max((t - p.parte) / VUELO, 0), 1);
      if (k >= 1) continue;
      if (k > 0) {
        // Vuela hacia su letra y se achica hasta volverse parte de ella
        const e = k * k;
        p.x += (p.destino.x - p.x) * e;
        p.y += (p.destino.y - p.y) * e;
      } else {
        const ang = corriente(p.x, p.y, t);
        const vel = (0.8 + p.z * 1.2) * dpr;
        p.vx += (Math.cos(ang) * vel - p.vx) * 0.025;
        p.vy += (Math.sin(ang) * vel - p.vy) * 0.025;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += 0.01;
      }
      pintar(p, Math.min(1, 0.35 + p.z * 0.4) * (1 - k * k), 1 - k * 0.85);
    }
  }

  function pintar(p, alfa, escala) {
    ctx.globalAlpha = alfa;
    ctx.fillStyle = p.esAcento ? acento : neutro;
    ctx.font = `${Math.round((12 + p.z * 15) * dpr * escala)}px "DM Mono", monospace`;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(p.rot) * 0.5);
    ctx.fillText(p.t, 0, 0);
    ctx.restore();
  }

  // Estado final: los íconos de fondo flotan muy lento, esquivan el texto y se avivan cerca del cursor
  function dibujarFinal(ahora = 0) {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const m = 40 * dpr;
    for (const p of iconos) {
      if (!p.queda) continue;
      if (!reducido) {
        const ang = corriente(p.x, p.y, ahora);
        const vel = (0.1 + p.z * 0.14) * dpr;
        p.vx += (Math.cos(ang) * vel - p.vx) * 0.02;
        p.vy += (Math.sin(ang) * vel - p.vy) * 0.02;
        const z = zonaEn(p.x, p.y);
        if (z) p.vy += Math.sign(p.y - (z.y1 + z.y2) / 2 || 1) * 0.03 * dpr;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += 0.002;
        if (p.x < -m) p.x = W + m;
        if (p.x > W + m) p.x = -m;
        if (p.y < -m) p.y = H + m;
        if (p.y > H + m) p.y = -m;
      }
      const cerca = Math.max(0, 1 - Math.hypot(p.x - puntero.x, p.y - puntero.y) / (220 * dpr));
      pintar(p, ALFA_FINAL + cerca * 0.4, 1);
    }
    ctx.globalAlpha = 1;
  }

  function vivir(ahora) {
    // Cuando la rueda tapa la portada, main.js deja el lienzo en opacidad 0: no hace falta dibujar
    if (visible && cv.style.opacity !== "0") dibujarFinal(ahora);
    requestAnimationFrame(vivir);
  }

  function arrancarFondo() {
    if (reducido) return;
    new IntersectionObserver(([en]) => (visible = en.isIntersecting)).observe(hero);
    addEventListener("pointermove", (ev) => {
      const r = cv.getBoundingClientRect();
      puntero.x = (ev.clientX - r.left) * dpr;
      puntero.y = (ev.clientY - r.top) * dpr;
    }, { passive: true });
    requestAnimationFrame(vivir);
  }

  function armarFinal() {
    medir();
    iconos = crearIconos(() => null, false);
    elegirQuedan();
    for (const p of iconos) {
      if (!p.queda) continue;
      p.x = p.fin.x;
      p.y = p.fin.y;
      p.vx = p.vy = 0;
    }
    dibujarFinal();
  }

  function dibujarPolvo(t, salida) {
    const lado = 2 * dpr;
    for (const q of polvo) {
      const k = Math.min(Math.max((t - q.parte) / DUR_POLVO, 0), 1);
      if (k <= 0) continue;
      const e = 1 - Math.pow(1 - k, 5);
      ctx.globalAlpha = (0.35 + e * 0.65) * (1 - salida);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.ox + (q.x - q.ox) * e - dpr, q.oy + (q.y - q.oy) * e - dpr, lado, lado);
    }
  }

  function terminar() {
    if (terminada) return;
    terminada = true;
    raiz.classList.remove("intro");
    quitarSaltos();
    if (!quedanElegidos) armarFinal();
    else medirZonas();
    arrancarFondo();
  }

  function cuadro(ahora) {
    if (terminada) return;
    if (!inicio) inicio = ahora;
    const t = ahora - inicio;
    if (t >= ELIGE_QUEDAN && !quedanElegidos) elegirQuedan(t);
    ctx.clearRect(0, 0, W, H);
    dibujarIconos(t);
    const salida = Math.min(Math.max((t - FIN_POLVO) / FUNDIDO, 0), 1);
    dibujarPolvo(t, salida);
    ctx.globalAlpha = 1;
    // El texto real aparece debajo de las partículas ya armadas
    if (t >= FIN_POLVO && !textoVisible) {
      textoVisible = true;
      raiz.classList.remove("intro");
    }
    if (salida >= 1) {
      terminar();
      return;
    }
    requestAnimationFrame(cuadro);
  }

  const saltos = ["wheel", "touchmove", "keydown", "pointerdown", "scroll", "resize"];
  const quitarSaltos = () => saltos.forEach((e) => removeEventListener(e, terminar));

  if (raiz.classList.contains("intro")) {
    saltos.forEach((e) => addEventListener(e, terminar, { passive: true }));
    document.fonts.ready.then(() => {
      if (terminada) return;
      preparar();
      requestAnimationFrame(cuadro);
    });
  } else {
    // Movimiento reducido o página ya scrolleada: directo al estado final
    terminada = true;
    document.fonts.ready.then(() => {
      armarFinal();
      arrancarFondo();
    });
  }

  // Si cambia el ancho se rearma el fondo; en celular la barra del navegador solo cambia el alto
  let anchoPrevio = innerWidth;
  addEventListener("resize", () => {
    if (innerWidth === anchoPrevio) return;
    anchoPrevio = innerWidth;
    if (terminada) armarFinal();
  });
}
