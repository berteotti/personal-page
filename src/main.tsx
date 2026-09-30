import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Blog, DeskLayout, Detail, NotFound } from './site'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeskLayout />}>
          <Route path="about" element={<Detail kind="about" />} />
          <Route path="photos/:photoId" element={<Detail kind="photo" />} />
          <Route path="travels" element={<Detail kind="travels" />} />
          <Route path="blog" element={<Blog />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
