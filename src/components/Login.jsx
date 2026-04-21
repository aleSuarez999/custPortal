import { useState } from 'react'
import api from '../utils/api'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    try {
      const resp = await api.post('/login', { username, password })
      localStorage.setItem('jwt_token', resp.data.token)
      navigate('/')
    } catch (err) {
      setError('Invalid credentials')
    }
  }

  return (
    <section className="container">
      <h1>Meraki Incident Portal</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="color-error">{error}</p>}

        <button className="btn btn__primary btn__solid">
          Login
        </button>
      </form>
    </section>
  )
}