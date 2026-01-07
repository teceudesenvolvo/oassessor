// Services.js
export default function Services() {
  const items = ["Procon", "Atendimento Jurídico", "Balcão do Cidadão", "Ouvidoria", "Vereadores", "Procuradoria da Mulher"];
  
  return (
    <section className="services-section">
      <div className="services-grid">
        {items.map((item, index) => (
          <div key={index} className="service-card">
            <div className="icon-placeholder"></div>
            <p>{item}</p>
          </div>
        ))}
      </div>
      
      <h3 className="section-title">Nossos Vereadores</h3>
      <div className="team-grid">
        {[1, 2, 3, 4].map(v => (
          <div key={v} className="team-card">
            <div className="avatar"></div>
            <h4>Nome Vereador</h4>
            <span>Vereador(a)</span>
          </div>
        ))}
      </div>
    </section>
  );
}