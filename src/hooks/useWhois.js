import { useState, useCallback } from 'react';

// Reutiliza la misma base URL que el resto de la app
const isProduction = import.meta.env.VITE_PRODUCTION === 'true';
const BASE_URL = isProduction
  ? 'http://consultasnoc.int.fibercorp.com.ar/help2/merakiApp/api'
  : 'http://localhost:4000/api';

// Cache en memoria (evita repetir llamadas en la misma sesión)
const cache = {};

/**
 * Hook para obtener el ISP de una IP.
 * La consulta se hace al backend propio (/api/whois/:ip)
 * que actúa como proxy, evitando el bloqueo CORS del browser.
 */
export function useWhois() {
  const [whoisData, setWhoisData] = useState({});

  const fetchWhois = useCallback(async (ip) => {
    if (!ip || !ip.trim() || ip === '0.0.0.0') return;

    // Cache hit → actualizar estado y salir
    if (cache[ip]) {
      setWhoisData(prev => ({ ...prev, [ip]: cache[ip] }));
      return;
    }

    // Marcar como cargando
    const loading = { isp: null, country: null, loading: true, error: null };
    cache[ip] = loading;
    setWhoisData(prev => ({ ...prev, [ip]: loading }));

    try {
      const res = await fetch(`${BASE_URL}/whois/${ip}`, {
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();

      const result = json.ok
        ? { isp: json.isp, country: json.country, loading: false, error: null }
        : { isp: null, country: null, loading: false, error: json.error || 'Sin datos' };

      cache[ip] = result;
      setWhoisData(prev => ({ ...prev, [ip]: result }));

    } catch {
      const err = { isp: null, country: null, loading: false, error: 'Sin respuesta' };
      cache[ip] = err;
      setWhoisData(prev => ({ ...prev, [ip]: err }));
    }
  }, []);

  return { whoisData, fetchWhois };
}
