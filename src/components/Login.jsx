import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/personal-tech-logo-blanco.svg'
//import logo from '../assets/logo.webp'
import ciscoLogo from '../assets/logocisco.svg'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const navigate      = useNavigate()
  const alreadyHandled = useRef(false)

  useEffect(() => {
    if (alreadyHandled.current) return
    alreadyHandled.current = true
    const reason = localStorage.getItem('logout_reason')
    if (reason === 'expirado') {
      setError('Sesión expirada. Por favor, iniciá sesión nuevamente.')
      localStorage.removeItem('logout_reason')
    }
  }, [])

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      const resp = await api.post('/login', { username, password })
      localStorage.setItem('jwt_token', resp.data.token)
      navigate('/', { replace: true })
    } catch {
      setError('Credenciales inválidas')
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-brand">
        <img src={logo} alt="logo" className="login-logo" />
        <span className="login-sdwan">SD-WAN</span>
        <div className='d-flex'>
        <img src={ciscoLogo} alt="Cisco Meraki" className="login-cisco pr-2" />
        <div class="mds-header-branding-name pl-2"><a href="https://n356.dashboard.meraki.com/o/3Dn5zb/manage/dashboard">Meraki</a></div>
        </div>
      </div>

      <div className="login__container">
        <form onSubmit={handleSubmit}>
          <h2>Iniciar sesión</h2>
          <input
            type="text"
            placeholder="Usuario"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Clave"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button type="submit">Ingresar</button>
          {error && <p className="login-error">{error}</p>}
        </form>
      </div>
    </div>
  )
}