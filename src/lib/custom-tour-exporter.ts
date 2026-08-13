import JSZip from "jszip";

// Define interface for export parameters
export interface ExportTourParams {
  tour: {
    id: string;
    name: string;
    custom_settings?: string | null;
  };
  photos: Array<{
    id: string;
    file_url: string;
    filename: string | null;
    heading: number | null;
  }>;
  connections: Array<{
    id: string;
    from_photo_id: string;
    to_photo_id: string;
    heading: number | null;
    metadata?: string | null;
  }>;
  logoUrl?: string;
  nadirType?: string;
  nadirSize?: string;
  nadirPos?: string;
  processNadirFn?: (
    photoUrl: string,
    nadirType: string,
    nadirSize: string,
    nadirPos: string,
    logoUrl?: string | null,
  ) => Promise<Blob>;
}

// Inline SVGs matching getSvgForIcon
const SVG_ICONS: Record<string, string> = {
  'arrow': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
  'double-arrow': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2L4.5 14l.71.71L12 11.5l6.79 3.21.71-.71zM12 10L4.5 22l.71.71L12 19.5l6.79 3.21.71-.71z"/></svg>',
  'chevron': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 5.86L6.5 11.36l1.42 1.41L12 8.69l4.08 4.08 1.42-1.41zM12 13L6.5 18.5l1.42 1.42L12 15.83l4.08 4.09 1.42-1.42z"/></svg>',
  'info': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  'help': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>',
  'cart': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
  'pin': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
  'door': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>',
  'camera': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 9c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4zm0 6c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2zm9-11h-3.17l-1.83-2h-8l-1.83 2h-3.17c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-12c0-1.1-.9-2-2-2zm0 14h-18v-12h18v12z"/></svg>',
  'eye': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
};

// Boilerplate sources
const HTML_SOURCE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Virtual Tour</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="pano"></div>

  <!-- Branding Overlay Logo -->
  <div id="branding-container">
    <a id="branding-link" href="#" target="_blank">
      <img id="branding-logo" src="" alt="Logo" style="display:none;">
      <span id="branding-text"></span>
    </a>
  </div>

  <!-- Zoom Controls Overlay -->
  <div id="zoom-controls" style="display:none;">
    <button id="zoom-in" class="control-btn" title="Zoom In">+</button>
    <button id="zoom-out" class="control-btn" title="Zoom Out">−</button>
  </div>

  <!-- Background Music Player & Toggle -->
  <audio id="bg-music" loop style="display:none;"></audio>
  <button id="music-toggle" class="control-btn" title="Toggle Background Music" style="display:none;">
    <svg id="music-icon-on" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
    <svg id="music-icon-off" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:none;"><path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V14.27l7.73 7.73L21 20.73 4.27 3zM14 7h4V3h-6v5.18l2 2V7z"/></svg>
  </button>

  <!-- WhatsApp Floating Widget -->
  <div id="whatsapp-widget" style="display:none;">
    <a id="whatsapp-link" href="#" target="_blank">
      <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.023-5.101-2.885-6.966S14.16 1.01 11.532 1.01c-5.441 0-9.867 4.414-9.87 9.85-.001 1.76.46 3.477 1.336 4.98L1.983 20.15l4.664-1.223c.002.002.002.002 0 0zm11.362-5.408c-.3-.15-1.774-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.774.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.794-1.49-1.775-1.665-2.075-.175-.3-.019-.462.13-.611.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 3.075-1.05 3.175 0 .1.1 1.95 1.5 3.2 1.4 1.25 3.175 1.9 4.9 1.8 1.825-.1 3.575-.9 4.125-2 .55-1.1.55-2.05.375-2.225-.175-.175-.475-.275-.775-.425z"/>
      </svg>
    </a>
  </div>

  <!-- Watermark -->
  <div id="watermark" style="display:none;">
    <span>Powered by <a href="https://panopublish.com" target="_blank">PanoPublish</a></span>
  </div>

  <script src="pano-viewer.js"></script>
  <script src="data.js"></script>
  <script src="index.js"></script>
</body>
</html>`;

const CSS_SOURCE = `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  height: 100dvh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #000;
  -webkit-text-size-adjust: 100%;
}

#pano {
  width: 100%;
  height: 100%;
  height: 100dvh;
  position: fixed;
  top: 0;
  left: 0;
}

/* Glassmorphism theme */
.glass-panel {
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

/* Branding Overlay */
#branding-container {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 100;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  pointer-events: auto;
}

#branding-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
}

#branding-logo {
  max-height: 32px;
  width: auto;
  border-radius: 6px;
  object-fit: contain;
}

/* Zoom controls */
#zoom-controls {
  position: absolute;
  right: 16px;
  top: 16px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#music-toggle {
  position: absolute;
  right: 16px;
  top: 112px;
  z-index: 100;
}

.control-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
  user-select: none;
}

.control-btn:hover {
  background: rgba(15, 23, 42, 0.85);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

/* Floating WhatsApp button */
#whatsapp-widget {
  position: absolute;
  z-index: 100;
  transition: all 0.3s ease;
}

#whatsapp-link {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background-color: #25d366;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(37, 211, 102, 0.4);
  transition: all 0.3s ease;
  text-decoration: none;
}

#whatsapp-link:hover {
  transform: scale(1.1) rotate(5deg);
  background-color: #20ba5a;
  box-shadow: 0 8px 24px rgba(37, 211, 102, 0.6);
}

#whatsapp-link:active {
  transform: scale(0.95);
}

.wa-icon {
  width: 28px;
  height: 28px;
}

/* Watermark styles */
#watermark {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 8px;
  border-radius: 6px;
  pointer-events: auto;
}

#watermark a {
  color: #2196f3;
  text-decoration: none;
  font-weight: bold;
}

/* Hotspot / Chevron styling */
.custom-hotspot {
  cursor: pointer;
  pointer-events: auto;
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
}

.hotspot-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background-color: var(--theme-color, #0277bd);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 2px solid white;
}

.custom-hotspot:hover .hotspot-icon-wrapper {
  transform: scale(1.15) translateY(-2px);
  box-shadow: 0 0 15px var(--theme-color, #0277bd);
}

.hotspot-tooltip {
  background: rgba(0,0,0,0.85);
  color: white;
  font-size: 11px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.1);
}

.custom-hotspot:hover .hotspot-tooltip {
  opacity: 1;
}

/* SVGs inside hotspots */
.hotspot-svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
  stroke: currentColor;
  stroke-width: 0.5;
}`;

const JS_SOURCE = `(function() {
  'use strict';

  var PanoEngine = window.PanoViewer || window.Marzipano;
  var APP_DATA = window.APP_DATA;

  if (!APP_DATA || !PanoEngine) {
    console.error("No tour data or engine found.");
    return;
  }

  // Set Theme Color
  var themeColor = APP_DATA.settings.themeColor || "#0277bd";
  document.documentElement.style.setProperty('--theme-color', themeColor);

  // Initialize Viewer
  var panoElement = document.getElementById('pano');
  var viewerOpts = {
    controls: {
      mouseViewMode: APP_DATA.settings.mouseViewMode || 'drag'
    },
    stage: {
      progressive: true
    }
  };
  var viewer = new PanoEngine.Viewer(panoElement, viewerOpts);

  // Handle WebGL context lost & restored on mobile browsers
  var currentSceneId = null;
  var stageCanvas = panoElement ? panoElement.querySelector('canvas') : null;
  if (stageCanvas) {
    stageCanvas.addEventListener('webglcontextlost', function(e) {
      e.preventDefault();
      console.warn('WebGL context lost, waiting for recovery...');
    }, false);
    stageCanvas.addEventListener('webglcontextrestored', function() {
      console.log('WebGL context restored');
      if (currentSceneId && scenes[currentSceneId]) {
        switchScene(currentSceneId);
      }
    }, false);
  }

  // Auto-rotate settings
  var autorotate = null;
  if (APP_DATA.settings.autorotateEnabled) {
    autorotate = PanoEngine.autorotate({
      yawSpeed: APP_DATA.settings.autorotateSpeed || 0.01,
      targetPitch: 0,
      targetFov: Math.PI/2
    });
    viewer.startMovement(autorotate);
  }

  // Detect WebGL MAX_TEXTURE_SIZE on mobile GPUs
  var maxTextureSize = 4096;
  try {
    var testCanvas = document.createElement('canvas');
    var testGl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (testGl) {
      maxTextureSize = testGl.getParameter(testGl.MAX_TEXTURE_SIZE) || 4096;
    }
  } catch(e) {}

  var targetGeomWidth = Math.min(4096, maxTextureSize);

  function createSmartSource(imageUrl) {
    var isAbsolute = (imageUrl || '').indexOf('http://') === 0 || (imageUrl || '').indexOf('https://') === 0;
    return isAbsolute
      ? PanoEngine.ImageUrlSource.fromString(imageUrl, { crossOrigin: 'anonymous' })
      : PanoEngine.ImageUrlSource.fromString(imageUrl);
  }

  // Create Scenes
  var scenes = {};
  var EquirectGeom = PanoEngine.EquirectGeometry || PanoEngine.EquirectangularGeometry;

  APP_DATA.scenes.forEach(function(sceneData) {
    var source = createSmartSource(sceneData.image);
    var geometry = new EquirectGeom([{ width: targetGeomWidth }]);
    
    // Limits
    var limitor = PanoEngine.RectilinearView.limit.traditional(2048, 100*Math.PI/180);
    var view = new PanoEngine.RectilinearView(sceneData.initialViewParameters, limitor);
    
    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view
    });

    scenes[sceneData.id] = {
      scene: scene,
      data: sceneData
    };

    // Render Hotspots
    sceneData.hotspots.forEach(function(hotspotData) {
      var container = document.createElement('div');
      container.className = 'custom-hotspot';

      // Tooltip
      if (hotspotData.label) {
        var tooltip = document.createElement('div');
        tooltip.className = 'hotspot-tooltip';
        tooltip.innerText = hotspotData.label;
        container.appendChild(tooltip);
      }

      // Icon Wrapper
      var iconWrapper = document.createElement('div');
      iconWrapper.className = 'hotspot-icon-wrapper';

      // Custom SVGs based on icon type
      var svgIcon = getSvgForIcon(hotspotData.icon || 'arrow');
      iconWrapper.innerHTML = svgIcon;
      container.appendChild(iconWrapper);

      // Add to scene
      scene.hotspotContainer().createHotspot(container, {
        yaw: hotspotData.yaw,
        pitch: hotspotData.pitch
      });

      // Click event
      container.addEventListener('click', function() {
        if (hotspotData.icon === 'info' && hotspotData.infoContent) {
          // Show info popup instead of navigating
          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;';
          overlay.addEventListener('click', function(e) {
            if (e.target === overlay) document.body.removeChild(overlay);
          });
          var panel = document.createElement('div');
          panel.style.cssText = 'background:rgba(15,23,42,0.95);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:16px;padding:24px;max-width:360px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
          var header = document.createElement('div');
          header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;';
          var title = document.createElement('div');
          title.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;';
          title.innerHTML = '<svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:#38bdf8;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>' + (hotspotData.label || 'Information');
          var closeBtn = document.createElement('button');
          closeBtn.innerHTML = '&times;';
          closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.5);font-size:20px;cursor:pointer;padding:0 4px;line-height:1;';
          closeBtn.onclick = function() { document.body.removeChild(overlay); };
          header.appendChild(title);
          header.appendChild(closeBtn);
          var body = document.createElement('p');
          body.style.cssText = 'font-size:13px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap;';
          body.innerText = hotspotData.infoContent;
          panel.appendChild(header);
          panel.appendChild(body);
          overlay.appendChild(panel);
          document.body.appendChild(overlay);
        } else {
          switchScene(hotspotData.target);
        }
      });
    });
  });

  // Smart lazy-preloading: preload only adjacent connected scenes to prevent mobile VRAM exhaustion
  var preloadedMap = {};
  function preloadAdjacentScenes(sceneId) {
    var sObj = scenes[sceneId];
    if (!sObj || !sObj.data || !sObj.data.hotspots) return;
    sObj.data.hotspots.forEach(function(h) {
      if (h.target && !preloadedMap[h.target]) {
        var targetScene = scenes[h.target];
        if (targetScene && targetScene.data) {
          preloadedMap[h.target] = true;
          if (targetScene.data.facePattern) {
            ['f', 'b', 'u', 'd', 'l', 'r'].forEach(function(fKey) {
              var img = new Image();
              img.src = targetScene.data.facePattern.replace('{f}', fKey);
            });
          } else if (targetScene.data.image) {
            var img = new Image();
            img.src = targetScene.data.image;
          }
        }
      }
    });
  }

  // Switch Scene with smooth transition
  function switchScene(id) {
    var sceneObj = scenes[id];
    if (!sceneObj) return;

    currentSceneId = id;

    if (autorotate) {
      viewer.stopMovement();
    }
    
    sceneObj.scene.switchTo({
      transitionDuration: 400
    });

    if (autorotate) {
      viewer.startMovement(autorotate);
    }

    // Preload neighbor scenes on demand
    preloadAdjacentScenes(id);
  }

  // Switch to the first scene initially
  if (APP_DATA.scenes.length > 0) {
    switchScene(APP_DATA.scenes[0].id);
  }

  // Initialize Overlays (Logo, WhatsApp, Zoom buttons)
  setupOverlays();

  function setupOverlays() {
    // Branding Logo
    var brand = APP_DATA.branding;
    if (brand) {
      var brandLink = document.getElementById('branding-link');
      if (brand.link) brandLink.href = brand.link;
      
      var brandText = document.getElementById('branding-text');
      brandText.innerText = brand.name || '';

      if (brand.logo) {
        var brandLogo = document.getElementById('branding-logo');
        brandLogo.src = brand.logo;
        brandLogo.style.display = 'block';
      }
    }

    // Zoom Buttons
    if (APP_DATA.settings.zoomEnabled) {
      var zoomControls = document.getElementById('zoom-controls');
      zoomControls.style.display = 'flex';
      
      document.getElementById('zoom-in').addEventListener('click', function() {
        var view = viewer.view();
        if (view) view.setFov(view.fov() * 0.85);
      });
      document.getElementById('zoom-out').addEventListener('click', function() {
        var view = viewer.view();
        if (view) view.setFov(view.fov() * 1.15);
      });
    }

    // WhatsApp Floating Button
    var wa = APP_DATA.whatsapp;
    if (wa && wa.enabled && wa.number) {
      var waWidget = document.getElementById('whatsapp-widget');
      waWidget.style.display = 'block';
      
      // Apply Position
      var pos = wa.position || 'bottom-right';
      waWidget.style.bottom = (pos.indexOf('bottom') !== -1) ? '20px' : 'auto';
      waWidget.style.top = (pos.indexOf('top') !== -1) ? '20px' : 'auto';
      waWidget.style.right = (pos.indexOf('right') !== -1) ? '20px' : 'auto';
      waWidget.style.left = (pos.indexOf('left') !== -1) ? '20px' : 'auto';

      var waLink = document.getElementById('whatsapp-link');
      var cleanNum = wa.number.replace(/[^0-9]/g, '');
      var msgText = wa.message ? encodeURIComponent(wa.message) : '';

      var targetUrl = 'https://api.whatsapp.com/send?phone=' + cleanNum + (msgText ? '&text=' + msgText : '');
      waLink.href = targetUrl;
      waLink.setAttribute('target', '_blank');

      waLink.addEventListener('click', function(e) {
        e.preventDefault();
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      });
    }

    // Watermark
    if (APP_DATA.settings.showWatermark) {
      document.getElementById('watermark').style.display = 'block';
    }

    // Background Music Player
    var music = APP_DATA.music;
    if (music && music.enabled && music.url) {
      var audioEl = document.getElementById('bg-music');
      var musicBtn = document.getElementById('music-toggle');
      var iconOn = document.getElementById('music-icon-on');
      var iconOff = document.getElementById('music-icon-off');

      if (audioEl && musicBtn) {
        audioEl.src = music.url;
        audioEl.volume = (music.volume != null ? music.volume : 50) / 100;
        musicBtn.style.display = 'flex';

        var isPlaying = false;

        function playAudio() {
          audioEl.play().then(function() {
            isPlaying = true;
            if (iconOn) iconOn.style.display = 'block';
            if (iconOff) iconOff.style.display = 'none';
          }).catch(function() {
            isPlaying = false;
            if (iconOn) iconOn.style.display = 'none';
            if (iconOff) iconOff.style.display = 'block';
          });
        }

        function pauseAudio() {
          audioEl.pause();
          isPlaying = false;
          if (iconOn) iconOn.style.display = 'none';
          if (iconOff) iconOff.style.display = 'block';
        }

        musicBtn.addEventListener('click', function() {
          if (isPlaying) {
            pauseAudio();
          } else {
            playAudio();
          }
        });

        if (music.autoplay !== false) {
          playAudio();
          var onFirstClick = function() {
            if (!isPlaying) {
              playAudio();
            }
            document.removeEventListener('click', onFirstClick);
          };
          document.addEventListener('click', onFirstClick);
        }
      }
    }
  }

  // Helper to return the SVG HTML based on selected icon name
  function getSvgForIcon(icon) {
    var svgs = {
      'arrow': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>',
      'double-arrow': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2L4.5 14l.71.71L12 11.5l6.79 3.21.71-.71zM12 10L4.5 22l.71.71L12 19.5l6.79 3.21.71-.71z"/></svg>',
      'chevron': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 5.86L6.5 11.36l1.42 1.41L12 8.69l4.08 4.08 1.42-1.41zM12 13L6.5 18.5l1.42 1.42L12 15.83l4.08 4.09 1.42-1.42z"/></svg>',
      'info': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
      'help': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/></svg>',
      'cart': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
      'pin': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
      'door': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 10c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>',
      'camera': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 9c-2.209 0-4 1.791-4 4s1.791 4 4 4 4-1.791 4-4-1.791-4-4-4zm0 6c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2zm9-11h-3.17l-1.83-2h-8l-1.83 2h-3.17c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-12c0-1.1-.9-2-2-2zm0 14h-18v-12h18v12z"/></svg>',
      'eye': '<svg class="hotspot-svg" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
    };
    return svgs[icon] || svgs['arrow'];
  }

})();`;

/**
 * Helper to optimize 360 photo quality capped at max 4096px width.
 * Ensures 100% mobile WebGL GPU compatibility across all smartphones, tablets, and desktop browsers.
 */
async function optimizePanoramaBlob(blob: Blob, maxWidth = 4096): Promise<Blob> {
  if (typeof window === "undefined") return blob;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous"; // CRITICAL: Prevent canvas tainting during export!
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    URL.revokeObjectURL(url);

    if (img.width <= maxWidth) {
      return blob; // Preserve 100% untouched original photo blob!
    }

    const scale = maxWidth / img.width;
    const targetWidth = maxWidth;
    const targetHeight = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const resizedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.96)
    );
    return resizedBlob || blob;
  } catch (err) {
    console.warn("Failed to optimize panorama blob, preserving original:", err);
    return blob;
  }
}

export async function exportCustomTour(
  params: ExportTourParams,
  onProgress?: (msg: string, pct: number) => void
): Promise<Blob> {
  const { tour, photos, connections } = params;
  const zip = new JSZip();
  
  // Parse custom settings
  let settings: any = {};
  try {
    if (tour.custom_settings) {
      settings = JSON.parse(tour.custom_settings);
    }
  } catch (e) {
    console.error("Failed to parse custom settings", e);
  }

  const zoomEnabled = settings.controls?.zoom_in_out !== false;
  const scrollZoom = settings.controls?.scroll_zoom !== false;
  const autorotateEnabled = !!settings.controls?.autorotate;
  const autorotateSpeed = settings.controls?.autorotate_speed != null ? settings.controls.autorotate_speed / 1000 : 0.01;
  const themeColor = settings.branding?.theme_color || "#0277bd";
  const showWatermark = settings.branding?.show_watermark !== false;

  const brandingName = settings.branding?.name || tour.name;
  const brandingLink = settings.branding?.link || "";
  const logoUrl = settings.branding?.logo_url || "";

  const whatsapp = settings.whatsapp || {};
  const whatsappEnabled = !!whatsapp.enabled;
  const whatsappNumber = whatsapp.phone_number || "";
  const whatsappMessage = whatsapp.message || "";
  const whatsappPosition = whatsapp.position || "bottom-right";

  const music = settings.music || {};
  const musicEnabled = !!music.enabled;
  const musicUrl = music.track_url || "";
  const musicTitle = music.track_name || "";
  const musicVolume = music.volume ?? 50;
  const musicAutoplay = music.autoplay !== false;

  onProgress?.("Downloading custom 360 viewer engine...", 10);
  
  // 1. Fetch Viewer Library from jsDelivr
  let viewerJs = "";
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/marzipano@0.10.2/dist/marzipano.js");
    if (!res.ok) throw new Error("Status " + res.status);
    viewerJs = await res.text();
  } catch (err) {
    console.warn("Failed to fetch viewer library from CDN, using fallback loader", err);
  }

  // 2. Fetch Logo if customized
  let logoFileName = "";
  if (logoUrl) {
    onProgress?.("Downloading custom logo...", 20);
    try {
      const logoRes = await fetch(logoUrl);
      if (logoRes.ok) {
        const logoBlob = await logoRes.blob();
        const ext = logoUrl.split(".").pop()?.split("?")[0] || "png";
        logoFileName = `logo.${ext}`;
        zip.file(logoFileName, logoBlob);
      }
    } catch (e) {
      console.error("Failed to fetch branding logo", e);
    }
  }

  // 3. Process scenes & download panoramas
  const scenes: any[] = [];
  const totalPhotos = photos.length;
  
  for (let i = 0; i < totalPhotos; i++) {
    const photo = photos[i];
    const stepPct = 25 + Math.floor((i / totalPhotos) * 65);
    onProgress?.(`Downloading scene ${i + 1} of ${totalPhotos}: ${photo.filename || photo.id}`, stepPct);

    try {
      let imgBlob: Blob;
      const effectiveNadirType = params.nadirType || settings.nadir?.type || "None";
      const effectiveNadirSize = params.nadirSize || settings.nadir?.size || "13%";
      const effectiveNadirPos = params.nadirPos || settings.nadir?.pos || "btm";

      if (
        effectiveNadirType &&
        effectiveNadirType.toLowerCase().trim() !== "none" &&
        params.processNadirFn
      ) {
        onProgress?.(`Applying ${effectiveNadirType} Nadir to scene ${i + 1} of ${totalPhotos}...`, stepPct);
        imgBlob = await params.processNadirFn(
          photo.file_url,
          effectiveNadirType,
          effectiveNadirSize,
          effectiveNadirPos,
          logoUrl
        );
      } else {
        const imgRes = await fetch(photo.file_url);
        if (!imgRes.ok) throw new Error("Status " + imgRes.status);
        imgBlob = await imgRes.blob();
      }

      // Optimizing scene image for maximum mobile & desktop WebGL compatibility
      onProgress?.(`Optimizing scene ${i + 1} of ${totalPhotos} for mobile rendering...`, stepPct);
      imgBlob = await optimizePanoramaBlob(imgBlob, 4096);

      const fileName = `images/${photo.id}.jpg`;
      zip.file(fileName, imgBlob);

      // Map hotspots/connections for this scene
      const sceneConns = connections.filter((c) => c.from_photo_id === photo.id);
      const hotspots = sceneConns.map((c) => {
        let meta: any = {};
        try {
          if (c.metadata) {
            meta = JSON.parse(c.metadata);
          }
        } catch {}

        const yaw = ((c.heading || 0) * Math.PI) / 180;
        const pitchDeg = meta.pitch ?? 0;
        const pitch = (pitchDeg * Math.PI) / 180;
        
        return {
          yaw,
          pitch,
          target: c.to_photo_id,
          icon: meta.icon_type || "arrow",
          label: meta.label || "",
          infoContent: meta.info_content || ""
        };
      });

      scenes.push({
        id: photo.id,
        name: photo.filename || `Scene ${i}`,
        image: fileName,
        initialViewParameters: {
          yaw: ((photo.heading || 0) * Math.PI) / 180,
          pitch: 0,
          fov: Math.PI / 2
        },
        hotspots
      });
    } catch (err: any) {
      console.error(`Failed to download photo ${photo.id}:`, err);
    }
  }

  // 4. Generate data.js
  const appData = {
    settings: {
      mouseViewMode: "drag",
      autorotateEnabled,
      autorotateSpeed,
      zoomEnabled,
      scrollZoom,
      themeColor,
      showWatermark
    },
    branding: {
      name: brandingName,
      logo: logoFileName,
      link: brandingLink
    },
    whatsapp: {
      enabled: whatsappEnabled,
      number: whatsappNumber,
      message: whatsappMessage,
      position: whatsappPosition
    },
    music: {
      enabled: musicEnabled,
      url: musicUrl,
      title: musicTitle,
      volume: musicVolume,
      autoplay: musicAutoplay
    },
    scenes
  };

  onProgress?.("Assembling virtual tour files...", 95);

  const dataJsContent = `var APP_DATA = ${JSON.stringify(appData, null, 2)};`;

  // Write files to ZIP
  zip.file("index.html", HTML_SOURCE);
  zip.file("style.css", CSS_SOURCE);
  zip.file("index.js", JS_SOURCE);
  zip.file("data.js", dataJsContent);
  
  if (viewerJs) {
    zip.file("pano-viewer.js", viewerJs);
  } else {
    zip.file("pano-viewer.js", `/* Viewer engine loader fallback */\n` +
      `document.write('<script src="https://cdn.jsdelivr.net/npm/marzipano@0.10.2/dist/marzipano.js"></script>');`);
  }

  onProgress?.("Packaging ZIP archive...", 98);
  const blob = await zip.generateAsync({ type: "blob" });
  
  onProgress?.("Export complete!", 100);
  return blob;
}

// Generates an iframe previewable standalone build data URL
export function generateLivePreviewUrl(params: Omit<ExportTourParams, "photos"> & { photos: Array<{ id: string; file_url: string; filename: string | null; heading: number | null }> }): string {
  const { tour, photos, connections } = params;
  
  let settings: any = {};
  try {
    if (tour.custom_settings) {
      settings = JSON.parse(tour.custom_settings);
    }
  } catch {}

  const zoomEnabled = settings.controls?.zoom_in_out !== false;
  const scrollZoom = settings.controls?.scroll_zoom !== false;
  const autorotateEnabled = !!settings.controls?.autorotate;
  const autorotateSpeed = settings.controls?.autorotate_speed != null ? settings.controls.autorotate_speed / 1000 : 0.01;
  const themeColor = settings.branding?.theme_color || "#0277bd";
  const showWatermark = settings.branding?.show_watermark !== false;
  const brandingName = settings.branding?.name || tour.name;
  const brandingLink = settings.branding?.link || "";
  const logoUrl = settings.branding?.logo_url || "";

  const whatsapp = settings.whatsapp || {};
  const whatsappEnabled = !!whatsapp.enabled;
  const whatsappNumber = whatsapp.phone_number || "";
  const whatsappMessage = whatsapp.message || "";
  const whatsappPosition = whatsapp.position || "bottom-right";

  const music = settings.music || {};
  const musicEnabled = !!music.enabled;
  const musicUrl = music.track_url || "";
  const musicTitle = music.track_name || "";
  const musicVolume = music.volume ?? 50;
  const musicAutoplay = music.autoplay !== false;

  const scenes = photos.map((photo, i) => {
    const sceneConns = connections.filter((c) => c.from_photo_id === photo.id);
    const hotspots = sceneConns.map((c) => {
      let meta: any = {};
      try {
        if (c.metadata) {
          meta = JSON.parse(c.metadata);
        }
      } catch {}

      const yaw = ((c.heading || 0) * Math.PI) / 180;

      // Pitch from metadata — the builder stores this in degrees (negative = below horizon)
      const pitchDeg = meta.pitch ?? 0;
      const pitch = (pitchDeg * Math.PI) / 180;

      return {
        yaw,
        pitch,
        target: c.to_photo_id,
        icon: meta.icon_type || "arrow",
        label: meta.label || "",
        infoContent: meta.info_content || ""
      };
    });

    return {
      id: photo.id,
      name: photo.filename || `Scene ${i}`,
      image: photo.file_url, // For preview, load directly from R2 URL!
      initialViewParameters: {
        yaw: ((photo.heading || 0) * Math.PI) / 180,
        pitch: 0,
        fov: Math.PI / 2
      },
      hotspots
    };
  });

  const appData = {
    settings: {
      mouseViewMode: "drag",
      autorotateEnabled,
      autorotateSpeed,
      zoomEnabled,
      scrollZoom,
      themeColor,
      showWatermark
    },
    branding: {
      name: brandingName,
      logo: logoUrl, // For preview, display R2 url directly
      link: brandingLink
    },
    whatsapp: {
      enabled: whatsappEnabled,
      number: whatsappNumber,
      message: whatsappMessage,
      position: whatsappPosition
    },
    music: {
      enabled: musicEnabled,
      url: musicUrl,
      title: musicTitle,
      volume: musicVolume,
      autoplay: musicAutoplay
    },
    scenes
  };

  const iframeContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Virtual Tour Preview</title>
  <script>
    // Force crossOrigin anonymous on all image elements inside the iframe to prevent WebGL/CORS texture errors.
    (function() {
      var OriginalImage = window.Image;
      window.Image = function() {
        var img = new OriginalImage();
        img.crossOrigin = "anonymous";
        return img;
      };
      var originalCreateElement = document.createElement;
      document.createElement = function(tagName, options) {
        var element = originalCreateElement.call(document, tagName, options);
        if (tagName && tagName.toLowerCase() === 'img') {
          element.crossOrigin = 'anonymous';
        }
        return element;
      };
    })();
  </script>
  <style>
    ${CSS_SOURCE}
  </style>
  <script src="https://cdn.jsdelivr.net/npm/marzipano@0.10.2/dist/marzipano.js"></script>
</head>
<body>
  <div id="pano"></div>
  <div id="branding-container">
    <a id="branding-link" href="#" target="_blank">
      <img id="branding-logo" src="" alt="Logo" style="display:none;">
      <span id="branding-text"></span>
    </a>
  </div>
  <div id="zoom-controls" style="display:none;">
    <button id="zoom-in" class="control-btn" title="Zoom In">+</button>
    <button id="zoom-out" class="control-btn" title="Zoom Out">−</button>
  </div>
  <audio id="bg-music" loop style="display:none;"></audio>
  <button id="music-toggle" class="control-btn" title="Toggle Background Music" style="display:none;">
    <svg id="music-icon-on" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
    <svg id="music-icon-off" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style="display:none;"><path d="M4.27 3L3 4.27l9 9v.28c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V14.27l7.73 7.73L21 20.73 4.27 3zM14 7h4V3h-6v5.18l2 2V7z"/></svg>
  </button>
  <div id="whatsapp-widget" style="display:none;">
    <a id="whatsapp-link" href="#" target="_blank">
      <svg class="wa-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.413 9.863-9.847.001-2.63-1.023-5.101-2.885-6.966S14.16 1.01 11.532 1.01c-5.441 0-9.867 4.414-9.87 9.85-.001 1.76.46 3.477 1.336 4.98L1.983 20.15l4.664-1.223c.002.002.002.002 0 0zm11.362-5.408c-.3-.15-1.774-.875-2.048-.975-.274-.1-.474-.15-.674.15-.2.3-.774.975-.95 1.175-.175.2-.35.225-.65.075-.3-.15-1.265-.467-2.41-1.485-.89-.794-1.49-1.775-1.665-2.075-.175-.3-.019-.462.13-.611.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8 1.05-.275.975-1.05 3.075-1.05 3.175 0 .1.1 1.95 1.5 3.2 1.4 1.25 3.175 1.9 4.9 1.8 1.825-.1 3.575-.9 4.125-2 .55-1.1.55-2.05.375-2.225-.175-.175-.475-.275-.775-.425z"/>
      </svg>
    </a>
  </div>
  <div id="watermark" style="display:none;">
    <span>Powered by <a href="https://panopublish.com" target="_blank">PanoPublish</a></span>
  </div>
  <script>
    window.APP_DATA = ${JSON.stringify(appData)};
    ${JS_SOURCE}
  </script>
</body>
</html>`;

  if (typeof window !== "undefined" && window.URL && window.Blob) {
    const blob = new Blob([iframeContent], { type: "text/html" });
    return URL.createObjectURL(blob);
  }
  return `data:text/html;charset=utf-8,${encodeURIComponent(iframeContent)}`;
}
