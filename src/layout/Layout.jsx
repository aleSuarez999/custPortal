import React from 'react'

import Footer from './Footer'
import { Outlet } from 'react-router'

import Container from '../components/Container'
import Header from './Header'

function Layout() {
  return (
    <>
      <Header />        
        
          <Container>
          { <Outlet /> }
          </Container>
        <Footer />
    </>
  )
}

export default Layout