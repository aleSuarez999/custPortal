import React from 'react'
import Box from '../components/Box'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook, faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons'
import Text from '../components/Text'
import { NavLink } from 'react-router'
import Navbar from './Navbar'

function Header() {
  return (
    <header className='header__content' >  
        <div className='header__container'>
            <Navbar />
        </div>
    </header>
  )
}

export default Header