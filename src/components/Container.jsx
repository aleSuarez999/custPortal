import Box from './Box'

function Container({ className = "", ...props }) {
    return (
        <Box {...props} className={`container ${className}`}/>
    )
}

export default Container