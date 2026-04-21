import { createElement } from "react"

const textElements = {
    h1: "h1",
    h2: "h2",
    h3: "h3",
    h4: "h4",
    h5: "h5",
    h6: "h6",
    p: "p",
    span: "span",
    b: "b",
    strong: "strong",
    label: "label",
}

function Text({ as = "p", ...props}) {
    return (
        createElement(textElements[as] || "p", props)
    )
}

export default Text