import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => {
        const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || "";
        return scriptUrl.endsWith("/service-worker.js") ? registration.update() : registration.unregister();
      })))
      .then(() => navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" }))
      .then((registration) => registration.update())
      .catch(() => {
        // Dashboard should still work if service worker registration fails.
      });
  });
}
