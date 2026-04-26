import Text from '../components/Text'
import { NavLink } from 'react-router'
import Box from '../components/Box'
import { jwtDecode } from "jwt-decode"
import logo from "../assets/logo.webp";

function Navbar() {
    let username = "";
    let role = ""; 

    try {
        const token = localStorage.getItem('jwt_token')
        if (token) {
            //console.log("token token->", token)
            const decoded = jwtDecode(token)
            //console.log("token data->", decoded)
            username = decoded.username
            role = decoded.role
        }   
    }catch (error) {
        console.error("Error decodificando token", error.message)
    }

  return (
       <Box className="navbar__container" >
             <img src={logo} alt="logo" />


            <NavLink to="/" >
               
                <Text as="h1" className="merakiFont" >Meraki Dashboard</Text>
            </NavLink>
            <Box as="nav">


                {/* Reports dropdown — históricos y acumulados */}




                <NavLink to="/Contacto" ></NavLink>

                <NavLink>
                    <Box>
                        <Text as="span" style={ {fontSize: '0.7rem', color: '#fff'}}    >

                            User: <strong>{username}</strong> | Rol: <strong>{role}</strong> 
                        </Text>
                    </Box>     
                </NavLink>
                <NavLink onClick={() => {
                    const prod = import.meta.env.VITE_PRODUCTION === 'true';
                    const base = import.meta.env.VITE_BASE;
                    localStorage.removeItem('jwt_token');
                    window.location.href = prod ? `/help2/${base}/` : '/';
                }}>

                    <Text as="span" style={{ fontSize: '0.9rem', color: '#fff'}}>Logout</Text>
                </NavLink>
            </Box>
            
        </Box>
    
  )
}

export default Navbar