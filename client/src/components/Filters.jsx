import React from "react";

export default function Filters({ query, setQuery, classFilter, setClassFilter, classes }) {
  return (
    <section className="filters">
      <div className="filters__search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          placeholder="Buscar por #, piloto, clase o vehículo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar"
        />
        {query && (
          <button className="filters__clear" onClick={() => setQuery("")} aria-label="Limpiar">
            ×
          </button>
        )}
      </div>

      <div className="filters__classes" role="tablist" aria-label="Filtrar por clase">
        <button
          className={`chip ${classFilter === "ALL" ? "chip--active" : ""}`}
          onClick={() => setClassFilter("ALL")}
        >
          Todas
        </button>
        {classes.map((c) => (
          <button
            key={c}
            className={`chip ${classFilter === c ? "chip--active" : ""}`}
            onClick={() => setClassFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
