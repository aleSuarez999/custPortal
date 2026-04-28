import { NavLink } from 'react-router'
import Box from '../components/Box'
import Text from '../components/Text'
import { jwtDecode } from "jwt-decode"
import logo from '../assets/personal-tech-logo-blanco.svg'
import ciscoLogo from '../assets/logocisco.svg'

function Navbar() {
  let username = ""
  let role = ""

  try {
    const token = localStorage.getItem('jwt_token')
    if (token) {
      const decoded = jwtDecode(token)
      username = decoded.username
      role = decoded.role
    }
  } catch (error) {
    console.error("Error decodificando token", error.message)
  }

  return (
    <Box className="navbar__container" style={{ position: 'relative' }}>

      {/* izquierda — logo Cisco */}
      <div className='d-flex align-center'>
            <img src={ciscoLogo} alt="Cisco Meraki" className="login-cisco pr-2" />
            <div className="mds-header-branding-name pl-2"><a target='_blank' href="https://n356.dashboard.meraki.com/o/3Dn5zb/manage/dashboard">Meraki</a></div>
      </div>

      {/* centro — logo, absolutamente centrado */}
      <NavLink to="/" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img src={logo} alt="logo" className="navbar__logo" />
      </NavLink>

      {/* derecha — usuario + logout */}
      <Box as="nav" style={{ marginLeft: 'auto', justifyContent: 'flex-end' }}>
        <NavLink>
          <Text as="span" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            <strong style={{ color: '#e2e8f0' }}>{username}</strong>
            {role && <span style={{ color: '#64748b' }}> · {role}</span>}
          </Text>
        </NavLink>
        <NavLink onClick={() => {
          const prod = import.meta.env.VITE_PRODUCTION === 'true'
          const base = import.meta.env.VITE_BASE
          localStorage.removeItem('jwt_token')
          window.location.href = prod ? `/help2/${base}/` : '/'
        }}>
          <Text as="span" style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Logout</Text>
        </NavLink>
      </Box>

    </Box>
  )
}

export default Navbar
