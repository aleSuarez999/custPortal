import { createElement } from 'react'

const boxElements = {
    div: "div",
    main: "main",
    aside: "aside",
    footer: "footer",
    nav: "nav",
}

function Box({ as = "div", ...props}) {
    return (
        createElement(boxElements[as] || "div", props)
    )
}

export default Box