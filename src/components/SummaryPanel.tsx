export function SummaryPanel() {
  return (
    <div className="summary-panel">
      <h3>Resumo</h3>

      <div className="summary-item">
        <span>Arquivo:</span>
        <strong>EFD_ICMS.txt</strong>
      </div>

      <div className="summary-item">
        <span>Registros selecionados:</span>
        <strong>45</strong>
      </div>

      <button className="export-button">
        Exportar Excel
      </button>
    </div>
  );
}
