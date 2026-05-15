import React from 'react'
import Text from '../components/Text'

const APP_VERSION = '1.2.0'

function Footer() {
  return (
    <footer className='footer__content'>
      <div className='footer__container'>
        <Text as="p">OSPT &mdash; Meraki DashBoard &mdash; v{APP_VERSION}</Text>
      </div>
    </footer>
  )
}

export default Footer
