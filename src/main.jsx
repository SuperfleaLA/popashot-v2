import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './.jsx' // Note: app matches your filename
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)