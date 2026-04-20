type Record = {
  code: string;
  lines: number;
};

type Props = {
  block: string;
  records: Record[];
};

export function BlockCard({ block, records }: Props) {
  return (
    <div className="block-card">
      <h3>Bloco {block}</h3>

      {records.map(r => (
        <label key={r.code} className="record-item">
          <input type="checkbox" defaultChecked />
          <span className="record-code">{r.code}</span>
          <span className="record-lines">{r.lines} linhas</span>
        </label>
      ))}
    </div>
  );
}
