import { PanoramaNode, Connection, MapMode } from '../types/panorama';

function isSameConnection(
  c1: { fromId: string, toId: string } | null, 
  c2: { fromId: string, toId: string } | null
): boolean {
  if (!c1 || !c2) return false;
  return (c1.fromId === c2.fromId && c1.toId === c2.toId) || 
         (c1.fromId === c2.toId && c1.toId === c2.fromId);
}

export interface IPanoramaOverlayManager {
  setMode(mode: MapMode): void;
  updateNodes(
    nodes: PanoramaNode[], 
    connections: Connection[], 
    activeNodeId: string | null,
    selectedConnection?: { fromId: string, toId: string } | null
  ): void;
  draw(): void;
  setMap(map: any): void;
}

export function createPanoramaOverlayManager(options: {
  nodes: PanoramaNode[];
  connections: Connection[];
  activeNodeId: string | null;
  selectedConnection?: { fromId: string, toId: string } | null;
  onNodeClick: (nodeId: string) => void;
  onNodeDrag: (nodeId: string, lat: number, lng: number) => void;
  onRotateActiveNode?: (newHeading: number) => void;
  onQuickConnect?: (fromId: string, toId: string) => void;
  onConnectionSelect?: (fromId: string | null, toId: string | null) => void;
}): IPanoramaOverlayManager {

  class PanoramaOverlayManager extends window.google.maps.OverlayView {
    private container: HTMLDivElement;
    private svg: SVGSVGElement;
    private nodesContainer: HTMLDivElement;
    
    private nodes: PanoramaNode[] = [];
    private connections: Connection[] = [];
    private activeNodeId: string | null = null;
    private selectedConnection: { fromId: string, toId: string } | null = null;
    private mode: MapMode = 'select';
    
    private onNodeClick: (nodeId: string) => void;
    private onNodeDrag: (nodeId: string, lat: number, lng: number) => void;
    private onRotateActiveNode?: (newHeading: number) => void;
    private onQuickConnect?: (fromId: string, toId: string) => void;
    private onConnectionSelect?: (fromId: string | null, toId: string | null) => void;

    // Keyboard & Mouse Tracking State for Quick Connect
    private ctrlPressed = false;
    private currentMousePos: { x: number, y: number } | null = null;
    private hoveredNodeId: string | null = null;
    
    // Caching node DOM elements to avoid full recreations on scroll/pan
    private nodeElements = new Map<string, HTMLDivElement>();
    
    // Drag & Rotate State
    private isDragging = false;
    private isRotating = false;
    private activeDragNodeId: string | null = null;
    private wasDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
 
    // Window listeners for smooth global tracking during drag
    private boundGlobalMouseMove: (e: MouseEvent) => void;
    private boundGlobalMouseUp: (e: MouseEvent) => void;
    private boundKeyDown: (e: KeyboardEvent) => void;
    private boundKeyUp: (e: KeyboardEvent) => void;
    private boundWindowBlur: () => void;
 
    constructor() {
      super();
      this.nodes = options.nodes;
      this.connections = options.connections;
      this.activeNodeId = options.activeNodeId;
      this.selectedConnection = options.selectedConnection ?? null;
      this.onNodeClick = options.onNodeClick;
      this.onNodeDrag = options.onNodeDrag;
      this.onRotateActiveNode = options.onRotateActiveNode;
      this.onQuickConnect = options.onQuickConnect;
      this.onConnectionSelect = options.onConnectionSelect;

      // 1. Create main container spanning overlay pane
      this.container = document.createElement('div');
      this.container.style.position = 'absolute';
      this.container.style.top = '0';
      this.container.style.left = '0';
      this.container.style.width = '100%';
      this.container.style.height = '100%';
      this.container.style.pointerEvents = 'none'; // Map clicks pass through empty space

      // 2. Create SVG layer for lines and indicators
      this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.svg.style.position = 'absolute';
      this.svg.style.top = '0';
      this.svg.style.left = '0';
      this.svg.style.width = '100%';
      this.svg.style.height = '100%';
      this.svg.style.pointerEvents = 'none';
      this.container.appendChild(this.svg);

      // Define arrowhead markers in SVG defs
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      
      // Standard Red Arrow
      const arrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      arrowMarker.setAttribute('id', 'arrow');
      arrowMarker.setAttribute('viewBox', '0 0 10 10');
      arrowMarker.setAttribute('refX', '8');
      arrowMarker.setAttribute('refY', '5');
      arrowMarker.setAttribute('markerWidth', '6');
      arrowMarker.setAttribute('markerHeight', '6');
      arrowMarker.setAttribute('orient', 'auto-start-reverse');
      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', 'M 0 1.5 L 9 5 L 0 8.5 z');
      arrowPath.setAttribute('fill', '#ef4444');
      arrowMarker.appendChild(arrowPath);
      defs.appendChild(arrowMarker);

      // Locked Red Arrow
      const lockedArrowMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      lockedArrowMarker.setAttribute('id', 'arrow-locked');
      lockedArrowMarker.setAttribute('viewBox', '0 0 10 10');
      lockedArrowMarker.setAttribute('refX', '8');
      lockedArrowMarker.setAttribute('refY', '5');
      lockedArrowMarker.setAttribute('markerWidth', '6');
      lockedArrowMarker.setAttribute('markerHeight', '6');
      lockedArrowMarker.setAttribute('orient', 'auto-start-reverse');
      const lockedArrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      lockedArrowPath.setAttribute('d', 'M 0 1.5 L 9 5 L 0 8.5 z');
      lockedArrowPath.setAttribute('fill', '#7f1d1d');
      lockedArrowMarker.appendChild(lockedArrowPath);
      defs.appendChild(lockedArrowMarker);

      this.svg.appendChild(defs);

      // 3. Create sub-container for absolutely positioned HTML nodes
      this.nodesContainer = document.createElement('div');
      this.nodesContainer.style.position = 'absolute';
      this.nodesContainer.style.top = '0';
      this.nodesContainer.style.left = '0';
      this.nodesContainer.style.width = '100%';
      this.nodesContainer.style.height = '100%';
      this.nodesContainer.style.pointerEvents = 'none';
      this.container.appendChild(this.nodesContainer);

      this.boundGlobalMouseMove = this.handleGlobalMouseMove.bind(this);
      this.boundGlobalMouseUp = this.handleGlobalMouseUp.bind(this);
      this.boundKeyDown = this.handleKeyDown.bind(this);
      this.boundKeyUp = this.handleKeyUp.bind(this);
      this.boundWindowBlur = this.handleWindowBlur.bind(this);

      // Handle clicks on SVG to cancel quick connect
      this.svg.addEventListener('click', (e) => {
        if (this.ctrlPressed) {
          this.ctrlPressed = false;
          this.svg.style.pointerEvents = 'none';
          this.currentMousePos = null;
          this.hoveredNodeId = null;
          this.updateCursor();
          requestAnimationFrame(() => this.draw());
        }
      });
    }

    setMode(mode: MapMode) {
      this.mode = mode;
      this.updateCursor();
      requestAnimationFrame(() => this.draw());
    }

    onAdd(): void {
      const panes = this.getPanes();
      if (panes) {
        panes.overlayMouseTarget.appendChild(this.container);
        window.addEventListener('mousemove', this.boundGlobalMouseMove);
        window.addEventListener('mouseup', this.boundGlobalMouseUp);
        window.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('keyup', this.boundKeyUp);
        window.addEventListener('blur', this.boundWindowBlur);
      }
    }

    onRemove(): void {
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      window.removeEventListener('mousemove', this.boundGlobalMouseMove);
      window.removeEventListener('mouseup', this.boundGlobalMouseUp);
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
      window.removeEventListener('blur', this.boundWindowBlur);
      
      // Clean up cached nodes
      this.nodeElements.forEach(el => el.remove());
      this.nodeElements.clear();
    }

    setMap(map: any): void {
      super.setMap(map);
    }

    draw(): void {
      const projection = this.getProjection();
      if (!projection) return;

      const map = this.getMap();
      if (!map) return;

      // Keep the main container positioned at 0, 0 of the pane
      this.container.style.left = '0px';
      this.container.style.top = '0px';
      this.container.style.width = '100%';
      this.container.style.height = '100%';

      // Calculate bounding box of all nodes in div pixel coordinates for optimal SVG sizing
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      const nodePositions = new Map<string, { x: number, y: number }>();

      for (const node of this.nodes) {
        const p = this.latLngToDivPixel(node.lat, node.lng);
        if (p) {
          nodePositions.set(node.id, p);
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
      }

      const PADDING = 500; // Generous padding to prevent heading indicators from clipping
      if (minX === Infinity) {
        minX = 0; minY = 0; maxX = 100; maxY = 100;
      } else {
        minX -= PADDING;
        minY -= PADDING;
        maxX += PADDING;
        maxY += PADDING;
      }

      const svgWidth = maxX - minX;
      const svgHeight = maxY - minY;

      // Position SVG overlay container exactly over the nodes bounding area
      this.svg.style.left = minX + 'px';
      this.svg.style.top = minY + 'px';
      this.svg.style.width = svgWidth + 'px';
      this.svg.style.height = svgHeight + 'px';

      // Clear SVG layers (lines, groups, and heading dots)
      const elementsToClear = this.svg.querySelectorAll('circle, line, g.connection-group, path:not([fill])');
      elementsToClear.forEach(c => c.remove());

      // 1. Draw SVG Connection Lines
      for (const conn of this.connections) {
        const p1 = nodePositions.get(conn.fromId);
        const p2 = nodePositions.get(conn.toId);
        if (!p1 || !p2) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 2) {
          const ux = dx / dist;
          const uy = dy / dist;
          
          const isFromActive = conn.fromId === this.activeNodeId;
          const fromOffset = isFromActive ? 10 : 7;
          
          const isToActive = conn.toId === this.activeNodeId;
          const toOffset = isToActive ? 10 : 7;

          let startX = p1.x;
          let startY = p1.y;
          let endX = p2.x;
          let endY = p2.y;

          if (dist > fromOffset + toOffset + 5) {
            startX = p1.x + ux * fromOffset;
            startY = p1.y + uy * fromOffset;
            endX = p2.x - ux * (toOffset + 1.5);
            endY = p2.y - uy * (toOffset + 1.5);
          } else {
            startX = p1.x + ux * (dist * 0.25);
            startY = p1.y + uy * (dist * 0.25);
            endX = p2.x - ux * (dist * 0.35);
            endY = p2.y - uy * (dist * 0.35);
          }

          // Offset connection line coordinates into the SVG's local viewport coordinate space
          const svgStartX = startX - minX;
          const svgStartY = startY - minY;
          const svgEndX = endX - minX;
          const svgEndY = endY - minY;

          const isSelected = isSameConnection(this.selectedConnection, conn);

          // Group both visible line and wider hit-line
          const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          group.setAttribute('class', 'connection-group');
          group.style.cursor = 'pointer';

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', svgStartX.toString());
          line.setAttribute('y1', svgStartY.toString());
          line.setAttribute('x2', svgEndX.toString());
          line.setAttribute('y2', svgEndY.toString());
          line.setAttribute('stroke', isSelected ? '#000000' : (conn.isLocked ? '#ef4444' : '#3b82f6'));
          line.setAttribute('stroke-width', isSelected ? '7' : '4');
          line.setAttribute('class', 'connection-line transition-all duration-200');
          group.appendChild(line);

          // Generous hit area for easy mouse click / hover interaction
          const hitLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          hitLine.setAttribute('x1', svgStartX.toString());
          hitLine.setAttribute('y1', svgStartY.toString());
          hitLine.setAttribute('x2', svgEndX.toString());
          hitLine.setAttribute('y2', svgEndY.toString());
          hitLine.setAttribute('stroke', 'transparent');
          hitLine.setAttribute('stroke-width', '16');
          hitLine.setAttribute('class', 'connection-hit-line');
          hitLine.style.pointerEvents = 'auto';
          group.appendChild(hitLine);

          // Add interactive hover states
          group.addEventListener('mouseenter', () => {
            if (!isSelected) {
              line.setAttribute('stroke', '#475569'); // turn dark slate on hover
              line.setAttribute('stroke-width', '6');  // thicken to guide action
            }
          });
          group.addEventListener('mouseleave', () => {
            if (!isSelected) {
              line.setAttribute('stroke', conn.isLocked ? '#ef4444' : '#3b82f6');
              line.setAttribute('stroke-width', '4');
            }
          });

          // Handle click to select
          group.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.onConnectionSelect) {
              this.onConnectionSelect(conn.fromId, conn.toId);
            }
          });

          this.svg.appendChild(group);
        }
      }

      // Draw Quick Connect Line
      if (this.ctrlPressed && this.activeNodeId) {
        const p1 = nodePositions.get(this.activeNodeId);
        const p2 = this.hoveredNodeId ? nodePositions.get(this.hoveredNodeId) : this.currentMousePos;
        if (p1 && p2) {
          const startX = p1.x - minX;
          const startY = p1.y - minY;
          const endX = p2.x - minX;
          const endY = p2.y - minY;

          const quickLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          quickLine.setAttribute('x1', startX.toString());
          quickLine.setAttribute('y1', startY.toString());
          quickLine.setAttribute('x2', endX.toString());
          quickLine.setAttribute('y2', endY.toString());
          quickLine.setAttribute('stroke-dasharray', '5,5');

          if (this.hoveredNodeId) {
            quickLine.setAttribute('stroke', '#10b981');
            quickLine.setAttribute('stroke-width', '8');
            quickLine.setAttribute('class', 'animate-pulse');
            quickLine.style.pointerEvents = 'auto';
            quickLine.style.cursor = 'pointer';

            quickLine.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.activeNodeId && this.hoveredNodeId && this.onQuickConnect) {
                this.onQuickConnect(this.activeNodeId, this.hoveredNodeId);
                this.hoveredNodeId = null;
                this.currentMousePos = null;
                this.ctrlPressed = false;
                this.svg.style.pointerEvents = 'none';
                this.updateCursor();
                requestAnimationFrame(() => this.draw());
              }
            });
          } else {
            quickLine.setAttribute('stroke', '#f59e0b');
            quickLine.setAttribute('stroke-width', '4');
            quickLine.style.pointerEvents = 'none';
          }

          this.svg.appendChild(quickLine);
        }
      }

      // 2. Manage and Render HTML Node Elements
      const visitedNodeIds = new Set<string>();

      for (const node of this.nodes) {
        const p = nodePositions.get(node.id);
        if (!p) continue;

        visitedNodeIds.add(node.id);
        const isActive = node.id === this.activeNodeId;

        let el = this.nodeElements.get(node.id);
        if (!el) {
          el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.pointerEvents = 'auto';
          el.className = 'absolute select-none transition-transform duration-200 hover:scale-105';
          this.nodesContainer.appendChild(el);
          this.nodeElements.set(node.id, el);

          el.addEventListener('mousedown', (e) => this.handleNodeMouseDown(e, node.id));
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!this.wasDragging) {
              this.onNodeClick(node.id);
            }
          });
        }

        // Position node exactly in div pixel coordinates
        el.style.left = `${p.x}px`;
        el.style.top = `${p.y}px`;
        el.style.zIndex = isActive ? '50' : '10';

        el.innerHTML = this.renderNodeHTML(node, isActive);

        // 3. Draw Active Node Heading Ray in SVG
        if (isActive) {
          const headingRad = (node.heading - 90) * Math.PI / 180;
          const DOT_COUNT = 5;
          const DOT_SPACING = 15;

          for (let i = 1; i <= DOT_COUNT; i++) {
            const dist = 14 + i * DOT_SPACING;
            const dotX = p.x + Math.cos(headingRad) * dist;
            const dotY = p.y + Math.sin(headingRad) * dist;
            const radius = Math.max(1.5, 4.5 - i * 0.6);
            const alpha = Math.max(0.15, 1 - i * 0.16);

            // Offset dots into the SVG's local viewport coordinate space
            const svgDotX = dotX - minX;
            const svgDotY = dotY - minY;

            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', svgDotX.toString());
            dot.setAttribute('cy', svgDotY.toString());
            dot.setAttribute('r', radius.toString());
            dot.setAttribute('fill', `rgba(239, 68, 68, ${alpha})`);
            dot.setAttribute('class', 'shadow-sm animate-pulse');
            this.svg.appendChild(dot);
          }
        }
      }

      // Cleanup removed nodes
      this.nodeElements.forEach((el, id) => {
        if (!visitedNodeIds.has(id)) {
          el.remove();
          this.nodeElements.delete(id);
        }
      });
    }

    updateNodes(
      nodes: PanoramaNode[], 
      connections: Connection[], 
      activeNodeId: string | null,
      selectedConnection?: { fromId: string, toId: string } | null
    ): void {
      this.nodes = nodes;
      this.connections = connections;
      this.activeNodeId = activeNodeId;
      this.selectedConnection = selectedConnection ?? null;
      requestAnimationFrame(() => this.draw());
    }

    private latLngToDivPixel(lat: number, lng: number): { x: number, y: number } | null {
      const projection = this.getProjection();
      if (!projection) return null;
      
      const latLng = new window.google.maps.LatLng(lat, lng);
      const point = projection.fromLatLngToDivPixel(latLng);
      if (!point) return null;
      
      return { x: point.x, y: point.y };
    }

    private renderNodeHTML(node: PanoramaNode, isActive: boolean): string {
      // Wrapper centered at exact node coordinate
      let html = `<div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing" style="width: 0px; height: 0px;">`;

      // 1. Draw Centered Circle Dot
      if (isActive) {
        // Active node circle style: larger red circle with white inner ring and center red dot
        html += `
          <div class="absolute bg-red-600 rounded-full shadow-lg flex items-center justify-center z-10" style="width: 20px; height: 20px; left: 0px; top: 0px; transform: translate(-50%, -50%);">
            <div class="bg-white rounded-full flex items-center justify-center" style="width: 14px; height: 14px;">
              <div class="bg-red-600 rounded-full" style="width: 8px; height: 8px;"></div>
            </div>
          </div>
        `;
        
        // Rotating compass dashed outer line
        html += `
          <div class="absolute border border-dashed border-red-500/50 rounded-full flex items-center justify-center pointer-events-none animate-spin-slow" style="width: 40px; height: 40px; left: 0px; top: 0px; transform: translate(-50%, -50%);"></div>
          
          <!-- Directional Arrow Pin attached to Compass Ring -->
          <div class="absolute pointer-events-none transition-transform duration-75" style="width: 48px; height: 48px; left: 0px; top: 0px; transform: translate(-50%, -50%) rotate(${node.heading}deg);">
            <div class="absolute top-0 left-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-red-600 drop-shadow" style="transform: translate(-50%, -50%);"></div>
          </div>
        `;
      } else {
        // Inactive node circle style: solid red circle with a white border
        html += `
          <div class="absolute bg-red-600 rounded-full border-2 border-white shadow-md z-10" style="width: 14px; height: 14px; left: 0px; top: 0px; transform: translate(-50%, -50%);"></div>
        `;
      }

      // 2. The Speech Bubble Label (floats to the right of the center circle) - only when label is toggled visible
      if (node.label) {
        const offsetLeft = isActive ? 14 : 10;
        html += `
          <div class="absolute bg-white border border-slate-400 text-slate-800 text-[10px] font-black px-1.5 py-0.5 shadow-sm rounded-sm flex items-center justify-center min-w-[22px] h-[18px] z-20" style="left: ${offsetLeft}px; top: 0px; transform: translateY(-50%);">
            <!-- Speech bubble pointing tail (gray border) -->
            <div class="absolute w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[5px] border-r-slate-400" style="left: -5px; top: 50%; transform: translateY(-50%);"></div>
            <!-- Speech bubble pointing tail fill (white) -->
            <div class="absolute w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-r-[5px] border-r-white" style="left: -4px; top: 50%; transform: translateY(-50%);"></div>
            
            <span class="leading-none text-slate-800 font-bold select-none">${node.label}</span>
          </div>
        `;
      }

      // 3. Connection count badge (placed at top-left so it doesn't overlap the speech bubble) - only when label is toggled visible
      if (node.label && node.connectionCount > 0) {
        html += `
          <div class="absolute bg-blue-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-md border border-white z-30" style="width: 18px; height: 18px; left: -14px; top: -14px; transform: translate(-50%, -50%);">
            ${node.connectionCount}
          </div>
        `;
      }

      // 4. Rotate handle in 'rotate' mode
      if (isActive && this.mode === 'rotate') {
        html += `
          <div class="absolute rounded-full bg-slate-800 border border-white text-white flex items-center justify-center cursor-grab hover:bg-slate-700 shadow-lg pointer-events-auto rotate-handle transition-transform hover:scale-110 active:cursor-grabbing z-30" style="width: 20px; height: 20px; left: -28px; top: -10px; transform: translateY(-50%);" title="Drag to Rotate Direction">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 fill-current" viewBox="0 0 24 24">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          </div>
        `;
      }

      // 5. Hover Tooltip for active node
      if (isActive) {
        html += `
          <div class="absolute bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg border border-slate-700/50 whitespace-nowrap opacity-90 transition-opacity pointer-events-none" style="left: 0px; bottom: 24px; transform: translateX(-50%);">
            Scene ${node.label} (${Math.round(node.heading)}°)
          </div>
        `;
      }

      html += `</div>`;
      return html;
    }

    private handleNodeMouseDown(e: MouseEvent, nodeId: string): void {
      const isRotateHandle = (e.target as HTMLElement).closest('.rotate-handle');
      
      // Stop mapping drag events
      e.stopPropagation();

      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;

      const isLocked = this.connections.some(c => c.isLocked);
      if (isLocked) {
        // If locked, we don't start dragging or rotating, but clicking will still select the node
        if (!isRotateHandle) {
          this.activeDragNodeId = nodeId;
          this.wasDragging = false;
        }
        e.preventDefault();
        return;
      }

      if (isRotateHandle) {
        // Start rotation logic
        this.isRotating = true;
        this.activeDragNodeId = nodeId;
        this.wasDragging = false;
        
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
          this.isRotating = true;
        }
        e.preventDefault();
        return;
      }

      // If we are in 'select' or 'rotate' mode, start node drag repositioning
      if (this.mode === 'select' || this.mode === 'rotate') {
        this.isDragging = true;
        this.activeDragNodeId = nodeId;
        this.wasDragging = false;
        e.preventDefault();
      }
    }

    private handleGlobalMouseMove(e: MouseEvent): void {
      if (this.ctrlPressed && this.activeNodeId) {
        const rect = this.container.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        this.currentMousePos = { x: localX, y: localY };

        let closestNodeId: string | null = null;
        let minDistance = 25; // 25px snapping radius

        for (const node of this.nodes) {
          if (node.id === this.activeNodeId) continue;
          const p = this.latLngToDivPixel(node.lat, node.lng);
          if (!p) continue;
          const dx = localX - p.x;
          const dy = localY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDistance) {
            minDistance = dist;
            closestNodeId = node.id;
          }
        }
        this.hoveredNodeId = closestNodeId;
        this.updateCursor();
        requestAnimationFrame(() => this.draw());
      }

      if (!this.activeDragNodeId) return;

      if (!this.wasDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        if (dx * dx + dy * dy < 25) return; // 5px drag threshold (squared)
        this.wasDragging = true;
      }

      const projection = this.getProjection();
      if (!projection) return;

      const map = this.getMap();
      if (!map) return;

      // Find node
      const node = this.nodes.find(n => n.id === this.activeDragNodeId);
      if (!node) return;

      // Extract raw mouse relative to our overlay container (which is 0, 0 of the pane, meaning div pixel coords!)
      const rect = this.container.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      if (this.isDragging) {
        // DRAGGING / REPOSITIONING NODE
        const divPoint = new window.google.maps.Point(localX, localY);
        const latLng = projection.fromDivPixelToLatLng(divPoint);
        if (latLng) {
          node.lat = latLng.lat();
          node.lng = latLng.lng();
          
          // Instantly redraw lines/dots reactively
          requestAnimationFrame(() => this.draw());
        }
      } else if (this.isRotating) {
        // ROTATING NODE HEADING DIRECTION
        // Calculate the vector from active node center to current mouse pointer
        const nodeDiv = this.nodeElements.get(node.id);
        if (nodeDiv) {
          const nodeX = parseFloat(nodeDiv.style.left);
          const nodeY = parseFloat(nodeDiv.style.top);
          
          const angleRad = Math.atan2(localY - nodeY, localX - nodeX);
          let heading = (angleRad * 180 / Math.PI) + 90; // Align forward indicator
          if (heading < 0) heading += 360;
          heading = heading % 360;

          node.heading = heading;
          if (this.onRotateActiveNode) {
            this.onRotateActiveNode(heading);
          }
          
          // Instant heading vector redraw
          requestAnimationFrame(() => this.draw());
        }
      }
    }

    private handleGlobalMouseUp(e: MouseEvent): void {
      if (!this.activeDragNodeId) return;

      const node = this.nodes.find(n => n.id === this.activeDragNodeId);
      
      if (this.wasDragging && node) {
        if (this.isDragging) {
          // Reposition finished, save to Supabase
          this.onNodeDrag(node.id, node.lat, node.lng);
        }
      }

      this.isDragging = false;
      this.isRotating = false;
      this.activeDragNodeId = null;
      setTimeout(() => {
        this.wasDragging = false;
      }, 0);
      this.updateCursor();
    }

    private handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Control' && !this.ctrlPressed) {
        this.ctrlPressed = true;
        this.svg.style.pointerEvents = 'auto';
        this.updateCursor();
        requestAnimationFrame(() => this.draw());
      }
    }

    private handleKeyUp(e: KeyboardEvent): void {
      if (e.key === 'Control') {
        this.ctrlPressed = false;
        this.svg.style.pointerEvents = 'none';
        this.currentMousePos = null;
        this.hoveredNodeId = null;
        this.updateCursor();
        requestAnimationFrame(() => this.draw());
      }
    }

    private handleWindowBlur(): void {
      if (this.ctrlPressed) {
        this.ctrlPressed = false;
        this.svg.style.pointerEvents = 'none';
        this.currentMousePos = null;
        this.hoveredNodeId = null;
        this.updateCursor();
        requestAnimationFrame(() => this.draw());
      }
    }

    private updateCursor(): void {
      if (this.ctrlPressed) {
        const cursorStyle = this.hoveredNodeId ? 'pointer' : 'crosshair';
        this.nodesContainer.style.cursor = cursorStyle;
        this.svg.style.cursor = cursorStyle;
      } else if (this.mode === 'connect') {
        this.nodesContainer.style.cursor = 'crosshair';
        this.svg.style.cursor = 'crosshair';
      } else {
        this.nodesContainer.style.cursor = 'default';
        this.svg.style.cursor = 'default';
      }
    }
  }

  return new PanoramaOverlayManager();
}
