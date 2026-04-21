import React, { useContext, useEffect, useState } from 'react'
import { NavLink } from 'react-router'
import Context from '../context/Context'
import DrawerAside from '../components/DrawerAside'
// aside conformato por las organizaciones

const replaceText = (originalString) => 
{
  let newString = originalString.replace("TECO -", "").replace("TECO-", "")
  return newString
}

function Aside() {
  //drawer para poder contraer el aside
  const [openAsideDrawer, setopenAsideDrawer] = useState(false)
  const orgs = useContext(Context)
  useEffect(() => {
    console.info(orgs)
    
  }, [])
  

  return (
    <>
    
    <button onClick={() => setopenAsideDrawer(!openAsideDrawer)}>
        {openAsideDrawer ? "Cerrar" : "Orgs"}
    </button>

    <DrawerAside show={openAsideDrawer} closeAside={() => setopenAsideDrawer(false)}>
      <aside>
          <nav>
            {
              orgs && orgs.map((org) => ( 
                    <NavLink key={org.id} to={`/category/${org.id}`} >
                      {replaceText(org.name)}
                    </NavLink>
                )
              )
            }
          </nav>
      </aside>
    </DrawerAside>
    </>

  )
}

export default Aside