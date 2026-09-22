import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Lleva la página al tope SOLO en navegaciones nuevas (PUSH) -- nunca en
// POP (Atrás/Adelante), para conservar la restauración de scroll nativa del
// navegador ahí. location.key cambia en cada entrada de historial (incluso
// para la misma ruta), a diferencia de pathname, que no cambia si dos
// navegaciones seguidas caen en la misma ruta.
//
// src/styles/index.css define `overflow-x: hidden` tanto en html como en
// body. Eso hace que el navegador promueva overflow-y a "auto" en AMBOS
// elementos, y como html ya tiene su propio overflow explícito, no aplica
// la propagación normal de body hacia el viewport: el scroll real termina
// ocurriendo en el propio <body> (confirmado: document.body.scrollTop
// cambia con la rueda del mouse; window.scrollY se queda siempre en 0).
// Por eso no basta con window.scrollTo(0,0) -- hay que resetear
// explícitamente document.documentElement/body.scrollTop también, para
// cubrir motores donde el contenedor de scroll real sea uno u otro.
const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "PUSH") {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [location.key, navigationType]);

  return null;
};

export default ScrollToTop;
