// Mica: la figura de líneas saluda arriba de la frase y, al bajar, acompaña el recorrido desde la esquina.
const mica = document.querySelector("[data-mica]");
const lugar = document.querySelector("[data-mica-lugar]");
const hero = document.querySelector("[data-hero]");

if (mica && lugar && hero) {
  const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const globo = mica.querySelector("[data-mica-globo]");
  const SALUDO = "¡Hola, soy Mica!";
  const FRASES = [
    ["contacto", "¡Escribime!"],
    ["herramientas", "Con esto trabajo"],
    ["escritos", "Esto lo escribí yo"],
    ["que-hago", "Esto es lo que hago"],
    ["sobre-mi", "Esta es mi historia"],
  ].map(([id, texto]) => [document.getElementById(id), texto]);
  const pos = { x: 0, y: 0, s: 1, listo: false };
  let scrollPrevio = scrollY;
  let inclinacion = 0;
  let frase = "";
  let ocultarGlobo = 0;

  function fraseActual(acompana) {
    if (!acompana) return SALUDO;
    for (const [seccion, texto] of FRASES) {
      if (seccion && seccion.getBoundingClientRect().top < innerHeight * 0.55) return texto;
    }
    return "Mirá mis proyectos";
  }

  // En celular acompaña toda la página, pero se aparta mientras tiene contenido debajo
  const CONTENIDO = "p, h1, h2, h3, h4, li, a, button, img, video, input, textarea, label, small, span, svg, figure";
  let ocupada = false;
  let libreDesde = 0;
  let proximaRevision = 0;

  function hayContenido(x, y, lado) {
    const puntos = [[0.2, 0.2], [0.8, 0.2], [0.5, 0.5], [0.2, 0.8], [0.8, 0.8]];
    return puntos.some(([px, py]) => {
      const el = document.elementFromPoint(x + lado * px, y + lado * py);
      return el?.closest(CONTENIDO) && !el.closest("[data-mica]");
    });
  }

  function cuadro(ahora) {
    const acompana = -hero.getBoundingClientRect().top > innerHeight * 0.1;
    const chico = innerWidth < 768;
    const ancho = mica.offsetWidth;
    const r = lugar.getBoundingClientRect();
    const margen = chico ? 10 : 22;
    const s = acompana ? (chico ? 0.5 : 0.72) : 1;
    const x = acompana ? margen : r.left + r.width / 2 - ancho * 0.92;
    const yEsquina = innerHeight - mica.offsetHeight * s - margen;

    // Revisa la esquina unas veces por segundo; vuelve recién cuando lleva un rato libre
    if (!acompana || !chico) ocupada = false;
    else if (ahora >= proximaRevision) {
      proximaRevision = ahora + 150;
      if (hayContenido(x, yEsquina, ancho * s)) {
        ocupada = true;
        libreDesde = 0;
      } else if (ocupada) {
        libreDesde ||= ahora;
        if (ahora - libreDesde > 500) ocupada = false;
      }
    }
    const escondida = acompana && chico && ocupada;
    const y = escondida ? innerHeight + margen : acompana ? yEsquina : r.top;
    const paso = reducido || !pos.listo ? 1 : 0.07;
    pos.x += (x - pos.x) * paso;
    pos.y += (y - pos.y) * paso;
    pos.s += (s - pos.s) * paso;
    pos.listo = true;

    // Se balancea según lo rápido que se baja
    if (!reducido) inclinacion += (Math.max(-9, Math.min(9, (scrollY - scrollPrevio) * 0.25)) - inclinacion) * 0.08;
    scrollPrevio = scrollY;
    mica.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px) scale(${pos.s.toFixed(3)}) rotate(${inclinacion.toFixed(2)}deg)`;
    mica.classList.toggle("mica--acompana", acompana);
    mica.classList.toggle("mica--escondida", escondida);

    const nueva = fraseActual(acompana);
    if (nueva !== frase) {
      frase = nueva;
      globo.textContent = nueva;
      ocultarGlobo = ahora + 3200;
    }
    mica.classList.toggle("mica--con-globo", !acompana || ahora < ocultarGlobo);
    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);
}
