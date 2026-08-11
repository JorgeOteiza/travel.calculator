import { Link, useNavigate } from "react-router-dom";
import { demoTrip } from "../data/demoTrip";
import "../styles/Landing.css";

const Landing = () => {
  const navigate = useNavigate();

  const openDemo = () => {
    sessionStorage.setItem("travelCalculator:lastResult", JSON.stringify(demoTrip));
    navigate("/resultado", { state: { result: demoTrip } });
  };

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-kicker">Planificación inteligente de viajes</span>
          <h1>Anticipa el consumo y costo real de tu próxima ruta.</h1>
          <p>
            Travel Calculator combina vehículo, distancia, clima, carga y elevación
            para entregar una estimación explicable antes de salir.
          </p>
          <div className="hero-actions">
            <Link className="primary-cta" to="/calculadora">Calcular un viaje</Link>
            <button className="secondary-cta" type="button" onClick={openDemo}>
              Ver resultado de demostración
            </button>
          </div>
          <div className="hero-proof" aria-label="Características principales">
            <span>✓ Rutas reales</span><span>✓ Perfil de elevación</span><span>✓ Clima</span>
          </div>
        </div>
        <div className="hero-preview" aria-hidden="true">
          <div className="preview-route"><span>A</span><i /><span>B</span></div>
          <div className="preview-metric"><small>Distancia</small><strong>42,1 km</strong></div>
          <div className="preview-metric"><small>Consumo</small><strong>3,61 L</strong></div>
          <div className="preview-metric accent"><small>Costo estimado</small><strong>$5.054</strong></div>
        </div>
      </section>

      <section className="landing-features">
        <article><span>01</span><h2>Datos del vehículo</h2><p>Usa consumo, motor y peso para construir una base realista.</p></article>
        <article><span>02</span><h2>Contexto de ruta</h2><p>Analiza pendientes, distancia, pasajeros, carga y condiciones climáticas.</p></article>
        <article><span>03</span><h2>Resultado explicable</h2><p>Visualiza métricas, elevación y consumo por segmento en una vista clara.</p></article>
      </section>

      <section className="landing-stack">
        <p>Construido con</p>
        <div><span>React</span><span>Flask</span><span>PostgreSQL</span><span>Google Maps</span><span>OpenWeather</span></div>
      </section>
    </div>
  );
};

export default Landing;
