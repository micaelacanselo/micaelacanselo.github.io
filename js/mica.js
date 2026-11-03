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

  function cuadro(ahora) {
    const acompana = -hero.getBoundingClientRect().top > innerHeight * 0.1;
    const ancho = mica.offsetWidth;
    const r = lugar.getBoundingClientRect();
    const margen = innerWidth < 768 ? 10 : 22;
    const s = acompana ? (innerWidth < 768 ? 0.5 : 0.72) : 1;
    const x = acompana ? margen : r.left + r.width / 2 - ancho * 0.92;
    const y = acompana ? innerHeight - mica.offsetHeight * s - margen : r.top;
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
