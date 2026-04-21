import Text from '../components/Text'
import { NavLink } from 'react-router'
import Box from '../components/Box'
import { jwtDecode } from "jwt-decode"
import logo from "../assets/logo.webp";
import { useNavigate } from 'react-router';

function Navbar() {
    const navigate = useNavigate();
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
                    localStorage.removeItem('jwt_token');
                    localStorage.setItem('logout_reason', 'manual');
                   // window.location.href = '/login'
                     navigate('/login');  // ← sin recarga de página
                }}>

                    <Text as="span" style={{ fontSize: '0.9rem', color: '#fff'}}>Logout</Text>
                </NavLink>
            </Box>
            
        </Box>
    
  )
}

export default Navbar