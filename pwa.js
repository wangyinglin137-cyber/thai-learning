const BASE = new URL('./', import.meta.url);
if (window.isSecureContext && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('sw.js', BASE), {scope:BASE.pathname,updateViaCache:'none'}).then(registration => {
    const activate = () => registration.waiting?.postMessage({type:'ACTIVATE_UPDATE'});
    activate();
    registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', activate));
  }).catch(console.warn);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!reloading) {reloading = true; location.reload();}
  });
}
