import React from 'react'
import { createRoot } from 'react-dom/client'
import LegoBatmanVoxelGame from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div id="game-root" style={{ width: '100vw', height: '100vh' }}>
      <LegoBatmanVoxelGame />
    </div>
  </React.StrictMode>,
)
