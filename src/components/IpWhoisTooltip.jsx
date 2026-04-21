import { useRef, useState } from 'react';
import { useWhois } from '../hooks/useWhois';

/**
 * Renderiza una IP como texto interactivo.
 * Al hacer hover dispara la consulta WHOIS y muestra un tooltip con el ISP.
 */
function IpWhoisTooltip({ ip }) {
  const { whoisData, fetchWhois } = useWhois();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const info = whoisData[ip];

  const handleMouseEnter = () => {
    fetchWhois(ip);
    timerRef.current = setTimeout(() => setVisible(true), 120); // pequeño delay
  };

  const handleMouseLeave = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <span
      className="ip-whois-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="ip-whois-text">{ip}</span>

      {visible && (
        <span className="ip-whois-tooltip">
          {!info || info.loading ? (
            <span className="ip-whois-tooltip__loading">Consultando...</span>
          ) : info.error ? (
            <span className="ip-whois-tooltip__error">{info.error}</span>
          ) : (
            <>
              <span className="ip-whois-tooltip__isp">{info.isp}</span>
              {info.country && (
                <span className="ip-whois-tooltip__country">{info.country}</span>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}

export default IpWhoisTooltip;
