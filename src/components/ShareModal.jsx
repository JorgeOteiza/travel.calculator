import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaRegCopy,
  FaTiktok,
  FaWhatsapp,
} from "react-icons/fa6";
import { buildShareText, formatShareValues } from "../utils/resultStorage";

const ShareModal = ({ result, onClose }) => {
  const [notice, setNotice] = useState("");
  const text = buildShareText(result);
  const values = formatShareValues(result);

  useEffect(() => {
    const closeWithEscape = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [onClose]);

  const copyText = async (message = "Resumen copiado.") => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(message);
      return true;
    } catch {
      setNotice("No se pudo copiar automáticamente.");
      return false;
    }
  };

  const openAfterCopy = async (url, platform) => {
    await copyText(`Resumen copiado. Pégalo en ${platform}.`);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="share-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <header><div><span>Comparte tu estimación</span><h2 id="share-title">Compartir resumen</h2></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>
        <div className="share-preview">
          <p>{result.originLabel || "Origen"} <span>→</span> {result.destinationLabel || "Destino"}</p>
          <dl>
            <div><dt>Distancia</dt><dd>{values.distance}</dd></div>
            <div><dt>Combustible</dt><dd>{values.fuel}</dd></div>
            <div><dt>Consumo ajustado</dt><dd>{values.consumption}</dd></div>
            <div className="share-cost"><dt>Costo estimado</dt><dd>{values.cost}</dd></div>
          </dl>
        </div>
        <div className="share-options">
          <button className="share-whatsapp" type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")}><b><FaWhatsapp /></b><span>WhatsApp</span></button>
          <button className="share-instagram" type="button" onClick={() => openAfterCopy("https://www.instagram.com/", "Instagram")}><b><FaInstagram /></b><span>Instagram</span></button>
          <button className="share-tiktok" type="button" onClick={() => openAfterCopy("https://www.tiktok.com/", "TikTok")}><b><FaTiktok /></b><span>TikTok</span></button>
          <button className="share-facebook" type="button" onClick={() => openAfterCopy("https://www.facebook.com/", "Facebook")}><b><FaFacebookF /></b><span>Facebook</span></button>
          <a className="share-email" href={`mailto:?subject=${encodeURIComponent("Resumen de mi viaje")}&body=${encodeURIComponent(text)}`}><b><FaEnvelope /></b><span>Correo</span></a>
          <button className="share-copy" type="button" onClick={() => copyText()}><b><FaRegCopy /></b><span>Copiar resumen</span></button>
        </div>
        <p className="share-help">En Instagram, TikTok y Facebook copiaremos el resumen y abriremos la plataforma para que puedas pegarlo en una publicación o mensaje.</p>
        {notice && <div className="share-notice" role="status">{notice}</div>}
      </section>
    </div>
  );
};

ShareModal.propTypes = { result: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired };
export default ShareModal;
