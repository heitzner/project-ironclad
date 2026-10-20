import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '../../index.css'
import AdminPreview from './preview.jsx'

const root = createRoot(document.getElementById('root'))
root.render(<BrowserRouter><AdminPreview /></BrowserRouter>)
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount())
