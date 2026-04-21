import axios from "axios";

const isProduction = import.meta.env.VITE_PRODUCTION === 'true';
const subFolder = import.meta.env.VITE_BASE;
const baseURL = isProduction ? `http://consultasnoc.int.fibercorp.com.ar/help2/${subFolder}/api` : 'http://localhost:4000/api';
const locationHREF = isProduction ? `/help2/${subFolder}/login` : '/login';

const axiosInstance = axios.create({
  //baseURL: "http://localhost:4000/api"
  baseURL: `${baseURL}`
});

// Interceptor para agregar el token en cada request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('jwt_token');
      localStorage.setItem('logout_reason', 'expirado');
      window.location.href = `${locationHREF}`;
      
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;


export const getOrgs = async () => {
    const resp = await axiosInstance.get("/organizations")
    //console.log(resp.data.orgs)
    if (resp.data.ok)
    {
        //{ok=true, orgs=[]}
        return resp.data.orgs
    }
}

export const getOrgsSinFiltro = async () => {
    const resp = await axiosInstance.get("/organizations/sinFiltro")
    //console.log(resp.data.orgs)
    if (resp.data.ok)
    {
        //{ok=true, orgs=[]}
        return resp.data.orgs
    }
}

export const getNetworksByOrg = async (orgId) => {
    try{

        const resp = await axiosInstance.get(`/organizations/${orgId}/networks`)
        if (resp.data.ok)
        {
            return resp.data.networks
        }
    }
    catch(error) {
        console.error(error.message)
        return []
    }

}

export const getOrganizationDevicesStatusesOverview = async(orgId) => {

    try {

        const resp = await axiosInstance.get(`/organizations/${orgId}/devices/statuses/overview`)

        //console.log("api.js uplinkStatuses", resp.data)
        if (resp.data.ok)
        {
            //return resp.data.statuses
              const {alerting, dormant, offline, online} = resp.data.statuses.counts.byStatus
              const res = {
                    ok: true,
                    counts: {
                        byStatus:{
                            "online":online,
                            "alerting":alerting, // aca se pueden eliminar datos
                            "dormant":dormant,
                            "offline":offline
                        }
                    }
                }
            return res 
        }
        else{
           // console.log("NOOK", resp.data.ok)
            
            const res = {
                    error: true,
                    counts: {
                        byStatus:{
                            "alerting":0,
                            "dormant":0,
                            "offline":0,
                            "online":0
                        }
                    }
                }
        return res    
        }
    } catch (error) {
       // console.log(`No hay permiso en orgId ${orgId}`)
            const res = {
                    error: true,
                    counts: {
                        byStatus:{
                            "alerting":0,
                            "dormant":0,
                            "offline":0,
                            "online":0
                        }
                    }
                }
        return res
    }
}

export const getOrganizationApplianceUplinkStatuses = async (orgId) => {
  try {
    const resp = await axiosInstance.get(`/organizations/${orgId}/appliance/uplink/statuses`);
    const networks = Array.isArray(resp.data.networks) ? resp.data.networks : [];

    return {
      ok: true,
      networks
    };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return {
      ok: false,
      networks: []
    };
  }
};

export const getOrganizationApplianceUplinkStatusesAll = async (orgId) => {
  try {
    const resp = await axiosInstance.get(`/organizations/${orgId}/appliance/uplink/statusesAll`);
    const networks = Array.isArray(resp.data.networks) ? resp.data.networks : [];
   // console.log("REDES->", resp.data)
   //console.log("api.js getOrganizationApplianceUplinkStatusesAll", resp.data)
    return {
      ok: true,
      networks
    };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return {
      ok: false,
      networks: []
    };
  }
};


export const getOrganizationApplianceUplinkStatusesd = async(orgId) => {
     //console.log("appliance consult:", orgId)
     let res = []
    try {
        const resp = await axiosInstance.get(`/organizations/${orgId}/appliance/uplink/statuses`)
        
        const networks = Array.isArray(resp.data.networks) ? resp.data.networks : [];

     //   console.log("uplinkStatuses", orgId, networks)
    //    if (resp.data.ok)
        {
           // console.log("ok", resp.data.ok)
             return {
                    ok: true,
                    networks
            }
      
        }
     
            
          
       // }
             
    } catch (error) {
        console.log(`Errpr ${error.message}`)
            const res = {
                    ok: false,
                    networks: [],
                    counts: 0
                }
        return res
    }
}

export const getNetworkVlans = async (networkId) => {
    try{

        const resp = await axiosInstance.get(`/networks/${networkId}/vlans`)
        if (resp.data.ok)
        {
           // console.log("resp.data.networks", resp.data.networks)
            return resp.data.networks
        }
    }
    catch(error) {
        console.error(error.message)
        return []
    }

}

export const getNetworkSsids = async (networkId) => {
    try{

        const resp = await axiosInstance.get(`/networks/${networkId}/wireless/ssids`)
        if (resp.data.ok)
        {
            console.log("resp.data", resp.data)
            return resp.data
        }
    }
    catch(error) {
        console.error(error.message)
        return []
    }

}

export const copyVlans = async (vlans, targetNetworkId) => {
    console.info("api copiar vlans")
    // vlans sería el body
    try {
        const resp = await axiosInstance.post(`/networks/${targetNetworkId}/vlans`, {vlans})
        console.info("resp post vlan: ", resp.data)
        return resp.data
        
    } catch (error) {
      console.error("error post vlan: ", error.message)
      return error
    }
  
} 


export const copySsids = async (ssids, targetNetworkId) => {
    console.info("api copiar vlans")
    // vlans sería el body
    try {
        const resp = await axiosInstance.post(`/networks/${targetNetworkId}/wireless/ssids`, {ssids})
        console.info("resp post ssids: ", resp.data)
        return resp.data
        
    } catch (error) {
      console.error("error post vlan: ", error.message)
      return error
    }
  
} 


/**
 * GET /api/cu/parque
 * Foto actual del parque de dispositivos.
 * @param {string} [cliente] - Filtra por nombre o CUIT/serviceProvider
 */
export const getCUParque_ant = async ({ cliente } = {}) => {
  try {
    const params = new URLSearchParams();
    if (cliente) params.append("cliente", cliente);
    const resp = await axiosInstance.get(`/cu/parque?${params}`);
    return resp.data.ok ? resp.data : null;
  } catch (err) {
    console.error("getCUParque error:", err.message);
    return null;
  }
};

export const getCUParque = async ({ serviceProvider, groupId } = {}) => {
  try {
    const params = new URLSearchParams();
    if (serviceProvider) params.append("serviceProvider", serviceProvider);
    if (groupId)         params.append("groupId", groupId);
    const resp = await axiosInstance.get(`/cu/parque?${params}`);
    return resp.data.ok ? resp.data : null;
  } catch (err) {
    console.error("getCUParque error:", err.message);
    return null;
  }
};

/**
 * GET /api/cu/altas/diarias
 * Altas por día.
 * @param {Object} [filters] - { fechaDesde: "YYYY-MM-DD", fechaHasta: "YYYY-MM-DD", cliente }
 */
export const getCUAltasDiarias = async (filters = {}) => {
  try {
    const params = buildCUParams(filters);
    const resp = await axiosInstance.get(`/cu/altas/diarias?${params}`);
    return resp.data.ok ? resp.data.data : [];
  } catch (err) {
    console.error("getCUAltasDiarias error:", err.message);
    return [];
  }
};

/**
 * GET /api/cu/altas/semanales
 */
export const getCUAltasSemanales = async (filters = {}) => {
  try {
    const params = buildCUParams(filters);
    const resp = await axiosInstance.get(`/cu/altas/semanales?${params}`);
    return resp.data.ok ? resp.data.data : [];
  } catch (err) {
    console.error("getCUAltasSemanales error:", err.message);
    return [];
  }
};

/**
 * GET /api/cu/altas/mensuales
 */
export const getCUAltasMensuales = async (filters = {}) => {
  try {
    const params = buildCUParams(filters);
    const resp = await axiosInstance.get(`/cu/altas/mensuales?${params}`);
    return resp.data.ok ? resp.data.data : [];
  } catch (err) {
    console.error("getCUAltasMensuales error:", err.message);
    return [];
  }
};

/**
 * GET /api/cu/clientes
 * Crecimiento de clientes acumulado por mes.
 */
export const getCUClientesAcumulados = async (filters = {}) => {
  try {
    const params = buildCUParams(filters);
    const resp = await axiosInstance.get(`/cu/clientes?${params}`);
    return resp.data.ok ? resp.data.data : [];
  } catch (err) {
    console.error("getCUClientesAcumulados error:", err.message);
    return [];
  }
};

/**
 * GET /api/cu/clientes/lista
 * Lista de clientes para autocomplete.
 * @param {string} q - Texto de búsqueda
 */
export const getCUClientesLista = async (q = "") => {
  try {
    const resp = await axiosInstance.get(`/cu/clientes/lista?q=${encodeURIComponent(q)}`);
    return resp.data.ok ? resp.data.data : [];
  } catch (err) {
    console.error("getCUClientesLista error:", err.message);
    return [];
  }
};

/** Util: construye URLSearchParams para filtros CU */
function buildCUParams({ fechaDesde, fechaHasta, serviceProvider, groupId } = {}) {
  const p = new URLSearchParams();
  if (fechaDesde)      p.append("fechaDesde", fechaDesde);
  if (fechaHasta)      p.append("fechaHasta", fechaHasta);
  if (serviceProvider) p.append("serviceProvider", serviceProvider);
  if (groupId)         p.append("groupId", groupId);
  return p;
}

export const getCUEmpresasLista = async (q = "") => {
  try {
    const resp = await axiosInstance.get(`/cu/empresas/lista?q=${encodeURIComponent(q)}`);
    return resp.data.ok ? resp.data.data : [];
  } catch (err) { return []; }
};

export const getCUSucursalesLista = async (q = "", empresa = "") => {
  try {
    const resp = await axiosInstance.get(
      `/cu/sucursales/lista?q=${encodeURIComponent(q)}&empresa=${encodeURIComponent(empresa)}`
    );
    return resp.data.ok ? resp.data.data : [];
  } catch (err) { return []; }
};

// GET /api/incidents/orgs → lista orgs con filtro del dashboard
export const getIncidentOrgs = async () => {
    try {
        const resp = await axiosInstance.get('/incidents/orgs')
        return resp.data.ok ? resp.data.orgs : []
    } catch (error) {
        console.error('getIncidentOrgs error:', error.message)
        return []
    }
}

// GET /api/incidents/report?orgId=X&days=N
export const getIncidentReport = async (orgId = null, days = 30) => {
    try {
        const params = new URLSearchParams({ days })
        if (orgId) params.append('orgId', orgId)
        const resp = await axiosInstance.get(`/incidents/report?${params}`)
        return resp.data.ok ? resp.data : null
    } catch (error) {
        console.error('getIncidentReport error:', error.message)
        return null
    }
}

// PATCH /api/incidents/:id/status
export const updateIncidentWorkStatus = async (id, { workStatus, claimNumber, resolutionNotes }) => {
    try {
        const resp = await axiosInstance.patch(`/incidents/${id}/status`, { workStatus, claimNumber, resolutionNotes })
        return resp.data.ok ? resp.data.incident : null
    } catch (error) {
        console.error('updateIncidentWorkStatus error:', error.message)
        return null
    }
}

// GET /api/incidents/resolved-report?orgId=X&days=N
export const getResolvedIncidentsReport = async (orgId = null, days = 30) => {
    try {
        const params = new URLSearchParams({ days })
        if (orgId) params.append('orgId', orgId)
        const resp = await axiosInstance.get(`/incidents/resolved-report?${params}`)
        return resp.data.ok ? resp.data : null
    } catch (error) {
        console.error('getResolvedIncidentsReport error:', error.message)
        return null
    }
}

// GET /api/incidents/history?orgId=X&days=7|14|30
export const getIncidentHistory = async (orgId = null, days = 7) => {
    try {
        const params = new URLSearchParams({ days })
        if (orgId) params.append('orgId', orgId)
        const resp = await axiosInstance.get(`/incidents/history?${params}`)
        return resp.data.ok ? resp.data : null
    } catch (error) {
        console.error('getIncidentHistory error:', error.message)
        return null
    }
}

// GET /api/incidents/recurrence?orgId=X&days=7|14|30
export const getRecurrenceReport = async (orgId = null, days = 30) => {
    try {
        const params = new URLSearchParams({ days })
        if (orgId) params.append('orgId', orgId)
        const resp = await axiosInstance.get(`/incidents/recurrence?${params}`)
        return resp.data.ok ? resp.data : null
    } catch (error) {
        console.error('getRecurrenceReport error:', error.message)
        return null
    }
}

// ── VPN ───────────────────────────────────────────────────────────────────────

export const getVpnOrgs = async () => {
  try {
    const resp = await axiosInstance.get('/vpn/orgs')
    return resp.data.ok ? resp.data.orgs : []
  } catch (e) { console.error('getVpnOrgs:', e.message); return [] }
}

export const getVpnStatus = async (orgId) => {
  try {
    const resp = await axiosInstance.get(`/vpn/status?orgId=${orgId}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { console.error('getVpnStatus:', e.message); return null }
}

export const getVpnOpenIncidents = async (orgId) => {
  try {
    const resp = await axiosInstance.get(`/vpn/incidents?orgId=${orgId}`)
    return resp.data.ok ? resp.data.incidents : []
  } catch (e) { console.error('getVpnOpenIncidents:', e.message); return [] }
}

export const updateVpnIncidentStatus = async (id, { workStatus, claimNumber, resolutionNotes }) => {
  try {
    const resp = await axiosInstance.patch(`/vpn/incidents/${id}/status`, { workStatus, claimNumber, resolutionNotes })
    return resp.data.ok ? resp.data.incident : null
  } catch (e) { console.error('updateVpnIncidentStatus:', e.message); return null }
}

export const getVpnRecurrence = async (orgId, days = 30) => {
  try {
    const params = new URLSearchParams({ days })
    if (orgId) params.append('orgId', orgId)
    const resp = await axiosInstance.get(`/vpn/recurrence?${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { console.error('getVpnRecurrence:', e.message); return null }
}

// ── VPN Events ────────────────────────────────────────────────────────────────

export const getVpnEventNetworks = async (orgId) => {
  try {
    const resp = await axiosInstance.get(`/vpn-events/networks?orgId=${orgId}`)
    return resp.data.ok ? resp.data.networks : []
  } catch (e) { return [] }
}

export const getVpnEventsRecent = async (orgId, networkId = null, hours = 24) => {
  try {
    const params = new URLSearchParams({ hours })
    if (orgId)     params.append('orgId',     orgId)
    if (networkId) params.append('networkId', networkId)
    const resp = await axiosInstance.get(`/vpn-events/recent?${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}

export const getVpnTunnelAnalysis = async (orgId, days = 7, networkId = null) => {
  try {
    const params = new URLSearchParams({ days })
    if (orgId)     params.append('orgId',     orgId)
    if (networkId) params.append('networkId', networkId)
    const resp = await axiosInstance.get(`/vpn-events/tunnel-analysis?${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}

export const getVpnEventStats = async (orgId, days = 7) => {
  try {
    const params = new URLSearchParams({ days })
    if (orgId) params.append('orgId', orgId)
    const resp = await axiosInstance.get(`/vpn-events/stats?${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}

// ── Customer Portal ───────────────────────────────────────────────────────────

export const getPortalOrgs = async () => {
  try {
    const resp = await axiosInstance.get('/portal/orgs')
    return resp.data.ok ? resp.data.orgs : []
  } catch (e) { return [] }
}

export const getPortalStatusMap = async (orgId = null) => {
  try {
    const params = orgId ? `?orgId=${orgId}` : ''
    const resp = await axiosInstance.get(`/portal/status-map${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}

export const getPortalPathControl = async (orgId, networkId = null) => {
  try {
    const params = new URLSearchParams({ orgId })
    if (networkId) params.append('networkId', networkId)
    const resp = await axiosInstance.get(`/portal/path-control?${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}

export const getPortalUsage = async (orgId) => {
  try {
    const resp = await axiosInstance.get(`/portal/usage?orgId=${orgId}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}

export const getPortalInventory = async (orgId, filters = {}) => {
  try {
    const params = new URLSearchParams({ orgId })
    if (filters.networkId)   params.append('networkId',   filters.networkId)
    if (filters.productType) params.append('productType', filters.productType)
    if (filters.status)      params.append('status',      filters.status)
    const resp = await axiosInstance.get(`/portal/inventory?${params}`)
    return resp.data.ok ? resp.data : null
  } catch (e) { return null }
}
