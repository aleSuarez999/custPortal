export default function IncidentCard({ incident, onUpdate }) {
  return (
    <div className="incident-card">
      <span className="incident-status">
        {incident.status}
      </span>

      <div className="incident-actions">
        <button
          className="btn btn-warning"
          onClick={() => onUpdate("IN_PROGRESS")}
        >
          Tomar
        </button>

        <button
          className="btn btn-success"
          onClick={() => onUpdate("RESOLVED")}
        >
          Resolver
        </button>
      </div>
    </div>
  );
}

