export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ui-skeleton" style={{ height: 44, width: "40%" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="ui-skeleton" style={{ height: 132 }} />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="ui-skeleton" style={{ height: 110 }} />
      ))}
    </div>
  );
}
