import { useEffect, useState } from "react"

import Context from "./Context"
import {  getOrgs } from "../utils/api"


function Provider({children}) {

  const [orgs, setOrgs] = useState([])
  const [networks, setNetworks] = useState([])
// esto es solo una vez
// cargo las organizaciones
    useEffect(() => {
       getOrgs() // las orgs las traigo una vez cuando arranca la web desde la api de meraki
       .then(data => setOrgs(data))
       .catch(error => { console.log(error.message)} )  
    }, [])


    useEffect(() => {
        if (orgs.length < 1)
            return
        const allNetworks = [];


       setNetworks(allNetworks)

    }, [orgs])


     return (
        <Context.Provider value={orgs}>
            {children}
        </Context.Provider>
  )
}

export default Provider