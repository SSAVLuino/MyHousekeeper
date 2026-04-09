// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New Service Worker found, installing...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ New content available, please refresh!');
              // You could show a toast notification here
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Install prompt handling
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💾 Install prompt triggered');
  e.preventDefault();
  deferredPrompt = e;
  
  // Show install button/banner (you can customize this)
  showInstallPromotion();
});

window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully!');
  deferredPrompt = null;
});

function showInstallPromotion() {
  // This function can show a custom install prompt
  // You can create a banner or button in your UI
  const installBanner = document.getElementById('install-banner');
  if (installBanner) {
    installBanner.style.display = 'block';
  }
}

// Handle install button click
async function installApp() {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User response to install prompt: ${outcome}`);
  deferredPrompt = null;
}

// Expose install function globally
window.installApp = installApp;

// Check if running as PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

if (isPWA()) {
  console.log('🚀 Running as PWA');
  document.body.classList.add('is-pwa');
}

// Network status monitoring
window.addEventListener('online', () => {
  console.log('🌐 Back online!');
  // You could show a success message
});

window.addEventListener('offline', () => {
  console.log('📡 Gone offline');
  // You could show an offline indicator
});
