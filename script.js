/* script.js
   - #stage-canvas (800x500) es el área de trabajo.
   - El tamaño en metros es solo informativo.
   - Preferencias permiten cambiar canales/envíos con aviso.
   - Cambiar nombre de gira actualiza el Rider (sin pisar título personalizado).
   - Nota larga bajo el plano (rider-stage-notes) se guarda/carga.
*/

document.addEventListener('DOMContentLoaded', () => {
  // ---------- Referencias globales ----------
  const projectInitScreen = document.getElementById('project-init-screen');
  const mainNav = document.getElementById('main-nav');
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabScreens = document.querySelectorAll('.tab-screen');
  const projectForm = document.getElementById('project-form');
  const themeToggleButton = document.getElementById('theme-toggle');
  const body = document.body;
  const newProjectBtn = document.getElementById('new-project-btn');
  const saveProjectBtn = document.getElementById('save-project-btn');
  const loadProjectBtn = document.getElementById('load-project-btn');
  const exportProjectBtn = document.getElementById('export-project-btn');
  const printRiderBtn = document.getElementById('print-rider-btn');

  let projectConfig = {};

  // Preferencias / Barra superior
  const preferencesBtn = document.getElementById('preferences-btn');
  const preferencesScreen = document.getElementById('preferences-screen');
  const closePreferencesBtn = document.getElementById('close-preferences-btn');
  const projectPreferencesForm = document.getElementById('project-preferences-form');

  // Plano y listas
  const stageCanvas = document.getElementById('stage-canvas');
  const canvasRulers = document.getElementById('canvas-rulers');
  const workArea = stageCanvas;   // EL CANVAS ES EL ÁREA DE TRABAJO
  const inputListBody = document.getElementById('input-list-body');
  const sendsListBody = document.getElementById('sends-list-body');

  // Panel de configuración
  const configPanel = document.getElementById('element-config-panel');
  const elementControls = document.getElementById('element-controls');
  const elementNameInput = document.getElementById('element-name-input');
  const colorPicker = document.getElementById('color-picker');
  const shapeSelector = document.getElementById('shape-selector');
  const zIndexSelector = document.getElementById('z-index-selector');
  const selectedElementTitle = document.getElementById('selected-element-title');
  const deleteElementBtn = document.getElementById('delete-element-btn');
  const gridToggle = document.getElementById('grid-toggle');
  const showLabelCheckbox = document.getElementById('show-label-checkbox');

  const labelsToggleBtn = document.getElementById('labels-toggle');

  // Duplicate / copy / paste
  const duplicateBtn = document.getElementById('duplicate-element-btn');
  const copyBtn = document.getElementById('copy-element-btn');
  const pasteBtn = document.getElementById('paste-element-btn');

  // Rider preview container and fields
  const riderPreview = document.getElementById('rider-preview');
  const riderTitleInput = document.getElementById('rider-tour-title');
  const riderEditor = document.getElementById('rider-editor');
  const riderStageNotesInput = document.getElementById('rider-stage-notes');

  // Palette custom icon input
  const customIconInput = document.getElementById('custom-icon-input');

  // Paleta
  const paletteTabButtons = document.querySelectorAll('.palette-tab-button');
  const paletteCategories = document.querySelectorAll('.palette-category');

  // Buttons for adding rows/columns
  const addChannelBtn = document.getElementById('add-input-channel-btn');
  const addSendBtn = document.getElementById('add-send-btn');
  const addInputColumnBtn = document.getElementById('add-input-column-btn');
  const addSendColumnBtn = document.getElementById('add-send-column-btn');

  // Estado
  let selectedElement = null;
  const selectedElements = new Set();
  let iconCounter = 1;
  let draggedRow = null;

  let clipboardElementData = null;

  const customIcons = new Map();
  let customIconCounter = 1;

  const subSnakeColorMap = new Map();

  let inputExtraColumns = [];
  let sendExtraColumns = [];

  let labelsVisible = true;

  const dragState = {
    active: false,
    multi: false,
    element: null,
    startMouse: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    initialPositions: null
  };

  // ---------- Theme initialization ----------
  initTheme();
  body.classList.add('init-screen');
  if (projectInitScreen) projectInitScreen.classList.add('active');

  if (stageCanvas) stageCanvas.classList.add('show-grid');
  if (gridToggle) {
    gridToggle.addEventListener('change', () => {
      if (gridToggle.checked) stageCanvas.classList.add('show-grid');
      else stageCanvas.classList.remove('show-grid');
    });
  }

  function updateLabelsToggleButtonUI() {
    if (!labelsToggleBtn) return;
    if (labelsVisible) {
      labelsToggleBtn.classList.add('active');
      labelsToggleBtn.innerHTML = '<i class="fas fa-tags"></i> Ocultar Etiquetas';
      labelsToggleBtn.title = 'Ocultar las etiquetas activas en el plano';
    } else {
      labelsToggleBtn.classList.remove('active');
      labelsToggleBtn.innerHTML = '<i class="fas fa-tags"></i> Mostrar Etiquetas';
      labelsToggleBtn.title = 'Mostrar las etiquetas activas en el plano';
    }
  }
  updateLabelsToggleButtonUI();

  if (labelsToggleBtn) {
    labelsToggleBtn.addEventListener('click', () => {
      labelsVisible = !labelsVisible;
      workArea.querySelectorAll('.stage-element')
        .forEach(el => updateElementLabelDisplay(el));
      updateLabelsToggleButtonUI();
      scheduleRiderPreview();
    });
  }

  // ----------------- NAV & PROJECT INIT -----------------
  if (projectForm) {
    projectForm.addEventListener('submit', (e) => {
      e.preventDefault();
      projectConfig = {
        projectName: document.getElementById('project-name').value,
        tourName: document.getElementById('tour-name').value,
        date: document.getElementById('date').value,
        stageSize: document.getElementById('stage-size').value,
        numInputChannels: parseInt(document.getElementById('input-channels')?.value || 0),
        numSends: parseInt(document.getElementById('sends-count')?.value || 0)
      };

      // Actualizar cabecera
      updateProjectInfoDisplay(projectConfig);

      // Crear tablas
      initializeInputList(projectConfig.numInputChannels);
      initializeSendsList(projectConfig.numSends);

      // Mostrar nav y plano
      if (projectInitScreen) projectInitScreen.classList.remove('active');
      if (mainNav) mainNav.style.display = 'flex';
      body.classList.remove('init-screen');
      activateTab('stage-plot');

      // Sincronizar formulario de preferencias con datos iniciales
      syncPreferencesFormFromConfig();

      // Sincronizar título del rider con nombre de gira (si todavía no hay uno)
      if (riderTitleInput) {
        riderTitleInput.value = projectConfig.tourName || '';
      }

      renderRidersInfoOnly();
      scheduleRiderPreview();
    });
  }

  function activateTab(tabId) {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabScreens.forEach(screen => screen.classList.remove('active'));
    const targetButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    const targetScreen = document.getElementById(tabId);
    if (targetButton && targetScreen) {
      targetButton.classList.add('active');
      targetScreen.classList.add('active');
      if (tabId === 'stage-plot') {
        targetScreen.style.flexDirection = 'row';
        targetScreen.style.padding = '20px';
      } else {
        targetScreen.style.flexDirection = 'column';
        targetScreen.style.padding = '20px';
      }
      if (tabId === 'rider-menu') renderRiderPreview();
    }
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.getAttribute('data-tab');
      activateTab(tabId);
    });
  });

  // ----------------- THEME -----------------
  function toggleTheme() {
    if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'day');
      themeToggleButton.innerHTML = '<i class="fas fa-moon"></i> Día/Noche';
    } else {
      body.classList.add('dark-mode');
      localStorage.setItem('theme', 'night');
      themeToggleButton.innerHTML = '<i class="fas fa-sun"></i> Día/Noche';
    }
    workArea.querySelectorAll('.stage-element').forEach(el => {
      if (!el.dataset.colorUserSet) el.style.color = '';
      if (!el.dataset.colorUserSetBackground) el.style.backgroundColor = '';
    });
  }
  if (themeToggleButton) themeToggleButton.addEventListener('click', toggleTheme);

  function initTheme() {
    const saved = localStorage.getItem('theme') || 'day';
    if (saved === 'night') {
      body.classList.add('dark-mode');
      if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-sun"></i> Día/Noche';
    }
  }

  // ---------------- SUGERENCIAS / DATA ----------------
  const SUGERENCIAS_MIC = {
    'Voz Principal': [
      { name: 'Shure SM58', phantom: false },
      { name: 'Shure KSM9', phantom: false },
      { name: 'Sennheiser E935', phantom: false },
      { name: 'Sennheiser e945', phantom: false },
      { name: 'Telefunken M80', phantom: false },
      { name: 'Shure Beta 58A', phantom: false },
      { name: 'Beyerdynamic M88', phantom: false },
      { name: 'Neumann KMS 105', phantom: false },
      { name: 'Electro-Voice RE20', phantom: false },
      { name: 'Rode M1', phantom: false }
    ],
    'Coro/Backing': [
      { name: 'Shure SM58', phantom: false },
      { name: 'Sennheiser E835', phantom: false },
      { name: 'Shure SM57', phantom: false },
      { name: 'AKG D5', phantom: false }
    ],
    'Bombo (Kick)': [
      { name: 'Shure Beta 52A', phantom: false },
      { name: 'AKG D112', phantom: false },
      { name: 'Sennheiser E902', phantom: false },
      { name: 'Audix D6', phantom: false },
      { name: 'Beyerdynamic M88', phantom: false }
    ],
    'Caja (Snare)': [
      { name: 'Shure SM57', phantom: false },
      { name: 'Sennheiser E905', phantom: false },
      { name: 'Audix i5', phantom: false },
      { name: 'Shure Beta 56A', phantom: false }
    ],
    'Toms': [
      { name: 'Sennheiser E604', phantom: false },
      { name: 'Shure Beta 98', phantom: false },
      { name: 'Sennheiser MD421', phantom: false }
    ],
    'Overhead': [
      { name: 'AKG C451', phantom: true },
      { name: 'AKG C414', phantom: true },
      { name: 'Neumann KM184', phantom: true },
      { name: 'Rode NT5', phantom: true },
      { name: 'Small Diaphragm Condenser', phantom: true }
    ],
    'Bajo (DI)': [
      { name: 'DI Activo', phantom: false },
      { name: 'DI Pasivo', phantom: false },
      { name: 'Radial JDI', phantom: false },
      { name: 'Ampli Bajo (Mic)', phantom: false }
    ],
    'Guitarra Eléctrica': [
      { name: 'Shure SM57', phantom: false },
      { name: 'Sennheiser E906', phantom: false },
      { name: 'Royer R-121', phantom: false },
      { name: 'Beyerdynamic M160', phantom: false }
    ],
    'Guitarra Acústica': [
      { name: 'DI Acústico', phantom: false },
      { name: 'DI Pasivo', phantom: false },
      { name: 'Condensador Pequeño', phantom: true },
      { name: 'AKG C414', phantom: true }
    ],
    'Teclado': [
      { name: 'DI Estéreo (x2)', phantom: false },
      { name: 'DI Mono', phantom: false },
      { name: 'Direct Box', phantom: false }
    ],
    'Percusión': [
      { name: 'Shure SM57', phantom: false },
      { name: 'Condensador Pequeño', phantom: true },
      { name: 'Sennheiser MD421', phantom: false }
    ],
    'Voz Rapida': [
      { name: 'Shure SM7B', phantom: false },
      { name: 'Electro-Voice RE20', phantom: false },
      { name: 'Rode Procaster', phantom: false }
    ],
    'Otro': [
      { name: 'SM58', phantom: false },
      { name: 'SM57', phantom: false },
      { name: 'DI Pasivo', phantom: false },
      { name: 'DI Activo', phantom: false },
      { name: 'Neumann U87', phantom: true },
      { name: 'Sennheiser MKH416', phantom: false },
      { name: 'DPA 4017', phantom: false },
      { name: 'Coles 4038', phantom: false },
      { name: 'Sanken CU-41', phantom: true },
      { name: 'Audix OM7', phantom: false }
    ]
  };

  const SUGERENCIAS_STAND = {
    'Voz Principal': 'Alto',
    'Coro/Backing': 'Alto',
    'Bombo (Kick)': 'Pequeño',
    'Caja (Snare)': 'Pequeño',
    'Toms': 'Pinza',
    'Overhead': 'Alto',
    'Bajo (DI)': 'Ninguno',
    'Guitarra Eléctrica': 'Pequeño',
    'Guitarra Acústica': 'Alto',
    'Teclado': 'Ninguno',
    'Percusión': 'Pequeño',
    'Otro': 'Alto'
  };

  const STAND_OPTIONS = ['Alto', 'Pequeño', 'Base Redonda', 'Recto', 'Pinza', 'Ninguno'];

  function ensureStandDatalist() {
    let standDatalist = document.getElementById('stand-datalist');
    if (!standDatalist) {
      standDatalist = document.createElement('datalist');
      standDatalist.id = 'stand-datalist';
      document.body.appendChild(standDatalist);
    }
    standDatalist.innerHTML = STAND_OPTIONS.map(s => `<option value="${s}">`).join('');
  }
  ensureStandDatalist();

  // ---------------- Helpers for columns ----------------
  function makeColumnId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
  }

  function addExtraColumnDefinition(def, forTable = 'input', skipDOM = false) {
    if (!def || !def.label) return false;
    const targetArr = forTable === 'input' ? inputExtraColumns : sendExtraColumns;
    const labelTrim = def.label.trim();
    if (!labelTrim) return false;

    const collisionInInputs = inputExtraColumns.some(c => c.label.toLowerCase() === labelTrim.toLowerCase());
    const collisionInSends = sendExtraColumns.some(c => c.label.toLowerCase() === labelTrim.toLowerCase());
    const defaultCollisionInput = INPUT_DEFAULT_HEADERS.some(h => h.toLowerCase() === labelTrim.toLowerCase());
    const defaultCollisionSend = SEND_DEFAULT_HEADERS.some(h => h.toLowerCase() === labelTrim.toLowerCase());

    if ((forTable === 'input' && (collisionInInputs || collisionInSends || defaultCollisionInput)) ||
        (forTable === 'send' && (collisionInInputs || collisionInSends || defaultCollisionSend))) {
      alert(`Ya existe una columna con el nombre "${labelTrim}". Elige otro nombre.`);
      return false;
    }

    const col = {
      id: makeColumnId(forTable),
      label: labelTrim,
      type: def.type || 'text',
      options: def.options || [],
      exportable: def.exportable !== false
    };
    targetArr.push(col);
    if (!skipDOM) addColumnToTableDOM(col, forTable);
    attachColumnDragHandlersToAllTables();
    scheduleRiderPreview();
    return true;
  }

  function addColumnToTableDOM(colDef, forTable = 'input') {
    const tableSectionSelector = forTable === 'input' ? '#input-list .data-table' : '#sends-list .data-table';
    const table = document.querySelector(tableSectionSelector);
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    if (!thead || !tbody) return;
    const headerRow = thead.querySelector('tr');

    const th = document.createElement('th');
    th.dataset.dynamic = '1';
    th.dataset.colId = colDef.id;
    th.dataset.label = colDef.label;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'col-label';
    labelSpan.textContent = colDef.label;
    labelSpan.style.marginRight = '8px';
    th.appendChild(labelSpan);

    const btnRename = document.createElement('button');
    btnRename.type = 'button';
    btnRename.className = 'btn rename-col-btn';
    btnRename.title = 'Renombrar columna';
    btnRename.style.padding = '4px 6px';
    btnRename.style.fontSize = '0.75em';
    btnRename.style.marginRight = '4px';
    btnRename.innerHTML = '<i class="fas fa-edit"></i>';
    th.appendChild(btnRename);

    const btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.className = 'btn delete-col-btn';
    btnDelete.title = 'Eliminar columna';
    btnDelete.style.padding = '4px 6px';
    btnDelete.style.fontSize = '0.75em';
    btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
    th.appendChild(btnDelete);

    const headers = Array.from(headerRow.children);
    const last = headers[headers.length - 1];
    headerRow.insertBefore(th, last);

    Array.from(tbody.querySelectorAll('tr')).forEach(row => {
      const td = createCellForColumn(colDef);
      td.setAttribute('data-label', colDef.label);
      const cells = Array.from(row.children);
      const lastCell = cells[cells.length - 1];
      row.insertBefore(td, lastCell);
    });

    btnRename.addEventListener('click', () => {
      const oldLabel = colDef.label;
      const newName = prompt('Nuevo nombre de la columna:', oldLabel);
      if (!newName) return;
      const newTrim = newName.trim();
      if (!newTrim) { alert('El nombre no puede estar vacío.'); return; }

      const duplicate = (() => {
        const cmp = newTrim.toLowerCase();
        if (INPUT_DEFAULT_HEADERS.some(h => h.toLowerCase() === cmp)) return true;
        if (SEND_DEFAULT_HEADERS.some(h => h.toLowerCase() === cmp)) return true;
        if (forTable === 'input') {
          if (inputExtraColumns.some(c => c.label.toLowerCase() === cmp && c.id !== colDef.id)) return true;
          if (sendExtraColumns.some(c => c.label.toLowerCase() === cmp)) return true;
        } else {
          if (sendExtraColumns.some(c => c.label.toLowerCase() === cmp && c.id !== colDef.id)) return true;
          if (inputExtraColumns.some(c => c.label.toLowerCase() === cmp)) return true;
        }
        return false;
      })();

      if (duplicate) { alert('Ya existe otra columna con este nombre. Elige otro.'); return; }

      colDef.label = newTrim;
      th.dataset.label = newTrim;
      labelSpan.textContent = newTrim;

      const tableRows = tbody.querySelectorAll('tr');
      tableRows.forEach(r => {
        const td = Array.from(r.children).find(c => (c.getAttribute('data-label') || '').toString() === oldLabel);
        if (td) td.setAttribute('data-label', newTrim);
      });

      scheduleRiderPreview();
      attachColumnDragHandlersToAllTables();
    });

    btnDelete.addEventListener('click', () => {
      const confirmed = confirm(`¿Eliminar la columna "${colDef.label}"? Esta acción quitará la columna de todas las filas.`);
      if (!confirmed) return;
      if (forTable === 'input') inputExtraColumns = inputExtraColumns.filter(c => c.id !== colDef.id);
      else sendExtraColumns = sendExtraColumns.filter(c => c.id !== colDef.id);

      th.remove();

      Array.from(tbody.querySelectorAll('tr')).forEach(row => {
        const tds = Array.from(row.children);
        tds.forEach(td => {
          if ((td.getAttribute('data-label') || '') === colDef.label) td.remove();
        });
      });

      if (forTable === 'input') updateChannelNumbers(); else updateSendNumbers();
      scheduleRiderPreview();
      attachColumnDragHandlersToAllTables();
    });

    attachColumnDragHandlersToAllTables();
  }

  function createCellForColumn(colDef, defaultValue = null) {
    const td = document.createElement('td');
    td.setAttribute('data-label', colDef.label);
    switch (colDef.type) {
      case 'color': {
        const inp = document.createElement('input');
        inp.type = 'color';
        inp.value = defaultValue || '#ffffff';
        inp.className = 'dynamic-color';
        td.appendChild(inp);
        inp.addEventListener('input', () => scheduleRiderPreview());
        break;
      }
      case 'checkbox': {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!defaultValue;
        cb.className = 'dynamic-checkbox';
        td.style.textAlign = 'center';
        td.appendChild(cb);
        cb.addEventListener('change', () => scheduleRiderPreview());
        break;
      }
      case 'select': {
        const sel = document.createElement('select');
        sel.className = 'dynamic-select';
        (colDef.options || []).forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          sel.appendChild(o);
        });
        if (defaultValue) try { sel.value = defaultValue; } catch(e){}
        td.appendChild(sel);
        sel.addEventListener('change', () => scheduleRiderPreview());
        break;
      }
      case 'number': {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.value = defaultValue != null ? defaultValue : '';
        inp.className = 'dynamic-number';
        td.appendChild(inp);
        inp.addEventListener('input', () => scheduleRiderPreview());
        break;
      }
      default: {
        const inner = document.createElement('div');
        inner.contentEditable = 'true';
        inner.style.minHeight = '18px';
        inner.textContent = defaultValue || '';
        inner.addEventListener('blur', () => scheduleRiderPreview());
        td.appendChild(inner);
      }
    }
    return td;
  }

  const INPUT_DEFAULT_HEADERS = ['Ch', 'Nombre de canal', 'Mic/DI', 'Phantom', 'Pie', 'Sub-Snake', 'Notas', 'Eliminar'];
  const SEND_DEFAULT_HEADERS = ['Send', 'Nombre', 'Tipo', 'Mix', 'EQ/FX', 'Notas', 'Eliminar'];

  function getTableHeaderOrder(tableOrSelector, fallback) {
    const defaultOrder = Array.isArray(fallback) ? fallback : [];
    let table;
    if (typeof tableOrSelector === 'string') table = document.querySelector(tableOrSelector);
    else table = tableOrSelector;
    if (!table) return defaultOrder;
    const ths = table.querySelectorAll('thead th');
    if (!ths || ths.length === 0) return defaultOrder;
    return Array.from(ths).map(th => ((th.dataset && th.dataset.label) ? th.dataset.label : th.textContent).trim());
  }

  // Mic datalist
  let micDatalist = document.getElementById('mic-datalist');
  if (!micDatalist) {
    micDatalist = document.createElement('datalist');
    micDatalist.id = 'mic-datalist';
    document.body.appendChild(micDatalist);
  }
  micDatalist.innerHTML = (() => {
    const set = new Set();
    Object.values(SUGERENCIAS_MIC).flat().forEach(m => set.add(m.name));
    return Array.from(set).map(m => `<option value="${m}">`).join('');
  })();

  // ---------------- Sub-Snake color helpers ----------------
  function updateSubsnakeColorForName(name, color) {
    if (!name) return;
    subSnakeColorMap.set(name, color);
    if (!inputListBody) return;
    inputListBody.querySelectorAll('tr').forEach(row => {
      const nameIn = row.querySelector('.subsnake-name');
      const colorIn = row.querySelector('.subsnake-color-picker');
      const cell = row.querySelector('.subsnake-cell');
      if (!nameIn || !colorIn || !cell) return;
      const val = (nameIn.value || '').trim();
      if (val === name) {
        colorIn.value = color || '#ffffff';
        cell.style.backgroundColor = color || '#ffffff';
      }
    });
  }

  // ---------------- Crear filas de Input List ----------------
  function createChannelRow(channelNumber, channelData = null) {
    const row = document.createElement('tr');
    row.draggable = true;
    const isLoad = channelData !== null;
    const defaultName = isLoad ? channelData.name : '';
    const categoryForSuggestions =
      Object.keys(SUGERENCIAS_STAND).find(k =>
        (defaultName || (`Canal ${channelNumber}`)).toLowerCase().includes(k.toLowerCase())
      ) || 'Bombo';
    const placeholderText = `Ej: ${categoryForSuggestions}`;

    const defaultMicName = isLoad ? channelData.mic : '';
    const defaultPhantomChecked = isLoad ? !!channelData.phantom : false;
    const defaultStand = isLoad ? channelData.stand : '';
    const defaultSubSnakeName = isLoad ? channelData.subSnake : '';
    const defaultSubSnakeColor = isLoad ? channelData.subSnakeColor : '#ffffff';
    const defaultNotes = isLoad ? channelData.notes : '';

    const headerOrder = getTableHeaderOrder('#input-list .data-table', INPUT_DEFAULT_HEADERS);

    headerOrder.forEach(label => {
      const td = document.createElement('td');
      td.setAttribute('data-label', label);
      switch (label) {
        case 'Ch':
          td.contentEditable = 'true';
          td.textContent = channelNumber;
          td.dataset._lastValue = channelNumber;
          break;
        case 'Nombre de canal':
          td.contentEditable = 'true';
          td.dataset.placeholder = placeholderText;
          td.textContent = defaultName;
          break;
        case 'Mic/DI': {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'mic-input';
          input.setAttribute('list', 'mic-datalist');
          input.placeholder = 'Escribe o selecciona un Mic/DI';
          input.value = defaultMicName;
          td.appendChild(input);
          break;
        }
        case 'Phantom': {
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'phantom-checkbox';
          if (defaultPhantomChecked) cb.checked = true;
          td.appendChild(cb);
          break;
        }
        case 'Pie': {
          const input = document.createElement('input');
          input.type = 'text';
          input.className = 'stand-input';
          input.setAttribute('list', 'stand-datalist');
          input.placeholder = 'Selecciona o escribe...';
          input.value = defaultStand;
          td.appendChild(input);
          break;
        }
        case 'Sub-Snake': {
          td.className = 'subsnake-cell';
          td.style.backgroundColor = defaultSubSnakeColor;
          const nameIn = document.createElement('input');
          nameIn.type = 'text';
          nameIn.className = 'subsnake-name';
          nameIn.value = defaultSubSnakeName;
          const colorIn = document.createElement('input');
          colorIn.type = 'color';
          colorIn.className = 'subsnake-color-picker';
          colorIn.value = defaultSubSnakeColor;
          nameIn.style.marginRight = '6px';
          td.appendChild(nameIn);
          td.appendChild(colorIn);

          if (defaultSubSnakeName) {
            if (subSnakeColorMap.has(defaultSubSnakeName)) {
              const mapped = subSnakeColorMap.get(defaultSubSnakeName);
              colorIn.value = mapped || colorIn.value;
              td.style.backgroundColor = mapped || td.style.backgroundColor;
            } else {
              if (defaultSubSnakeColor) subSnakeColorMap.set(defaultSubSnakeName, defaultSubSnakeColor);
            }
          }

          nameIn.addEventListener('blur', () => {
            const newName = (nameIn.value || '').trim();
            nameIn.dataset._lastName = newName;
            if (!newName) {
              scheduleRiderPreview();
              return;
            }
            if (subSnakeColorMap.has(newName)) {
              const col = subSnakeColorMap.get(newName) || '#ffffff';
              colorIn.value = col;
              td.style.backgroundColor = col;
            } else {
              const myColor = colorIn.value || '#ffffff';
              subSnakeColorMap.set(newName, myColor);
            }
            scheduleRiderPreview();
          });

          colorIn.addEventListener('input', () => {
            const nameVal = (nameIn.value || '').trim() || defaultSubSnakeName || '';
            const colorVal = colorIn.value || '#ffffff';
            if (nameVal) updateSubsnakeColorForName(nameVal, colorVal);
            else td.style.backgroundColor = colorVal;
            scheduleRiderPreview();
          });

          break;
        }
        case 'Notas':
          td.contentEditable = 'true';
          td.textContent = defaultNotes;
          break;
        case 'Eliminar': {
          const btn = document.createElement('button');
          btn.className = 'btn delete-btn';
          btn.innerHTML = '<i class="fas fa-times"></i>';
          td.appendChild(btn);
          break;
        }
        default: {
          const dynamic = inputExtraColumns.find(c => c.label === label);
          if (dynamic) {
            let defaultVal = null;
            if (isLoad && channelData && channelData.extra && channelData.extra[label] !== undefined) {
              defaultVal = channelData.extra[label];
            }
            const dynamicCell = createCellForColumn(dynamic, defaultVal);
            dynamicCell.setAttribute('data-label', label);
            row.appendChild(dynamicCell);
            return;
          } else {
            td.textContent = '';
          }
        }
      }
      row.appendChild(td);
    });

    const numCell = row.querySelector('td[data-label="Ch"]');
    const nameCell = row.querySelector('td[data-label="Nombre de canal"]');
    const micInput = row.querySelector('.mic-input');
    const standInput = row.querySelector('.stand-input');
    const phantomCheckbox = row.querySelector('.phantom-checkbox');

    if (numCell) numCell.dataset._lastValue = channelNumber;

    if (numCell) {
      numCell.addEventListener('blur', () => {
        const text = numCell.textContent.trim();
        const newIndexRaw = parseInt(text, 10);
        const parent = inputListBody;
        const rows = Array.from(parent.children);
        const max = rows.length;

        if (isNaN(newIndexRaw)) {
          numCell.textContent = numCell.dataset._lastValue;
          return;
        }

        let target = Math.max(1, newIndexRaw);
        if (target > max) target = max;

        const currentIndex = rows.indexOf(row);
        const targetIndex = target - 1;

        if (currentIndex === -1) {
          parent.appendChild(row);
        } else if (currentIndex !== targetIndex) {
          const controls = Array.from(row.querySelectorAll('input, select, textarea, [contenteditable="true"]'));
          const savedState = controls.map(c => ({
            tag: c.tagName.toLowerCase(),
            type: c.type || '',
            value: (c.getAttribute && c.getAttribute('contenteditable') === 'true')
              ? c.textContent
              : (c.value !== undefined ? c.value : ''),
            checked: c.checked === true,
            selectedIndex: c.selectedIndex != null ? c.selectedIndex : null
          }));

          parent.removeChild(row);
          if (targetIndex >= parent.children.length) parent.appendChild(row);
          else parent.insertBefore(row, parent.children[targetIndex]);

          const controlsNow = Array.from(row.querySelectorAll('input, select, textarea, [contenteditable="true"]'));
          controlsNow.forEach((c, i) => {
            const s = savedState[i];
            if (!s) return;
            if (c.type === 'checkbox' || c.type === 'radio') {
              c.checked = !!s.checked;
            } else if (c.tagName.toLowerCase() === 'select') {
              if (s.selectedIndex != null && s.selectedIndex >= 0 && s.selectedIndex < c.options.length) {
                c.selectedIndex = s.selectedIndex;
              } else if (s.value != null) {
                try { c.value = s.value; } catch (err) {}
              }
            } else if (c.getAttribute && c.getAttribute('contenteditable') === 'true') {
              c.textContent = s.value || '';
            } else {
              c.value = s.value;
            }
            const ev = new Event('change', { bubbles: true });
            c.dispatchEvent(ev);
          });
        }

        updateChannelNumbers();
        scheduleRiderPreview();
        numCell.dataset._lastValue = target;
        const newRows = Array.from(inputListBody.children);
        const idxNow = newRows.indexOf(row);
        if (idxNow >= 0) numCell.textContent = idxNow + 1;
      });

      numCell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          numCell.blur();
        }
      });
    }

    if (nameCell) {
      nameCell.addEventListener('blur', () => {
        updateRowDisplay(row);
        scheduleRiderPreview();
      });
    }

    if (micInput) {
      micInput.addEventListener('input', () => {
        updateRowDisplay(row);
        scheduleRiderPreview();
      });
    }
    if (phantomCheckbox) {
      phantomCheckbox.addEventListener('change', () => {
        updateRowDisplay(row);
        scheduleRiderPreview();
      });
    }

    const subSnakeColorPicker = row.querySelector('.subsnake-color-picker');
    const subSnakeCell = row.querySelector('.subsnake-cell');
    if (subSnakeColorPicker) {
      subSnakeColorPicker.addEventListener('input', (e) => {
        if (subSnakeCell) subSnakeCell.style.backgroundColor = e.target.value;
        scheduleRiderPreview();
      });
    }

    setupDragAndDrop(row);
    updateRowDisplay(row);

    return row;
  }

  function updateRowDisplay(row) {
    const micInput = row.querySelector('.mic-input');
    const phantomCheckbox = row.querySelector('.phantom-checkbox');
    const phantomCell = row.children[3];
    const standInput = row.querySelector('.stand-input');

    const micValue = (micInput && micInput.value || '').trim().toLowerCase();

    if (phantomCheckbox) {
      if (phantomCheckbox.checked) {
        phantomCell.classList.add('phantom-active');
        phantomCell.style.border = '1px solid var(--color-border)';
        phantomCell.style.padding = '10px';
      } else {
        phantomCell.classList.remove('phantom-active');
        phantomCell.style.border = '1px solid var(--color-border)';
        phantomCell.style.padding = '10px';
      }
    }

    const nameCell = row.children[1];
    const currentName = nameCell.textContent.trim();
    const category = Object.keys(SUGERENCIAS_STAND).find(key =>
      currentName.toLowerCase().includes(key.toLowerCase())
    ) || 'Otro';
    const suggestedStand = SUGERENCIAS_STAND[category];

    if (micValue.includes('di') && micValue.length > 2) {
      if (standInput.value !== 'Ninguno') {
        standInput.value = 'Ninguno';
      }
    } else {
      if (!standInput.value || standInput.value.trim() === '') {
        // lo dejamos vacío, placeholder
      }
    }
  }

  function initializeInputList(count) {
    inputListBody.innerHTML = '';
    for (let i = 1; i <= count; i++) inputListBody.appendChild(createChannelRow(i));
    inputExtraColumns.forEach(col => {
      const table = document.querySelector('#input-list .data-table');
      if (table && !Array.from(table.querySelectorAll('thead th')).some(th => (th.dataset && th.dataset.colId) === col.id)) {
        addColumnToTableDOM(col, 'input');
      }
    });
    updateChannelNumbers();
    scheduleRiderPreview();
    attachColumnDragHandlersToAllTables();
  }

  function loadInputList(channelsData) {
    inputListBody.innerHTML = '';
    if (channelsData && channelsData.length) {
      channelsData.forEach((ch, idx) =>
        inputListBody.appendChild(createChannelRow(idx + 1, ch))
      );
    }
    inputExtraColumns.forEach(col => {
      const table = document.querySelector('#input-list .data-table');
      if (table && !Array.from(table.querySelectorAll('thead th')).some(th => (th.dataset && th.dataset.colId) === col.id)) {
        addColumnToTableDOM(col, 'input');
      }
    });
    updateChannelNumbers();
    scheduleRiderPreview();
    attachColumnDragHandlersToAllTables();
  }

  // ---------------- Crear filas de Sends ----------------
  function createSendRow(sendNumber, sendData = null) {
    const row = document.createElement('tr');
    row.draggable = true;
    const isLoad = sendData !== null;
    const defaultName = isLoad ? sendData.name : `Envío ${sendNumber}`;
    const SEND_TYPE_OPTIONS = ['Monitor Cuña', 'In-Ear Mono', 'In-Ear Estéreo', 'FX Reverb', 'FX Delay', 'FX Otro'];
    const defaultType = isLoad ? sendData.type : SEND_TYPE_OPTIONS[0];
    const defaultMix = isLoad ? sendData.mix : '';
    const defaultEQFX = isLoad ? sendData.eqfx : '';
    const defaultNotes = isLoad ? sendData.notes : '';

    const headerOrder = getTableHeaderOrder('#sends-list .data-table', SEND_DEFAULT_HEADERS);

    headerOrder.forEach(label => {
      const td = document.createElement('td');
      td.setAttribute('data-label', label);
      switch (label) {
        case 'Send':
          td.contentEditable = 'true';
          td.textContent = sendNumber;
          break;
        case 'Nombre':
          td.contentEditable = 'true';
          td.textContent = defaultName;
          break;
        case 'Tipo': {
          const select = document.createElement('select');
          select.className = 'send-type-select';
          SEND_TYPE_OPTIONS.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t;
            if (t === defaultType) opt.selected = true;
            select.appendChild(opt);
          });
          td.appendChild(select);
          break;
        }
        case 'Mix':
          td.contentEditable = 'true';
          td.textContent = defaultMix;
          break;
        case 'EQ/FX':
          td.contentEditable = 'true';
          td.textContent = defaultEQFX;
          break;
        case 'Notas':
          td.contentEditable = 'true';
          td.textContent = defaultNotes;
          break;
        case 'Eliminar': {
          const btn = document.createElement('button');
          btn.className = 'btn delete-btn';
          btn.innerHTML = '<i class="fas fa-times"></i>';
          td.appendChild(btn);
          break;
        }
        default: {
          const dynamic = sendExtraColumns.find(c => c.label === label);
          if (dynamic) {
            let defaultVal = null;
            if (isLoad && sendData && sendData.extra && sendData.extra[label] !== undefined) {
              defaultVal = sendData.extra[label];
            }
            const dynCell = createCellForColumn(dynamic, defaultVal);
            dynCell.setAttribute('data-label', label);
            row.appendChild(dynCell);
            return;
          } else {
            td.textContent = '';
          }
        }
      }
      row.appendChild(td);
    });

    setupDragAndDrop(row, true);
    scheduleRiderPreview();
    return row;
  }

  function initializeSendsList(count) {
    sendsListBody.innerHTML = '';
    for (let i = 1; i <= count; i++) sendsListBody.appendChild(createSendRow(i));
    sendExtraColumns.forEach(col => {
      const table = document.querySelector('#sends-list .data-table');
      if (table && !Array.from(table.querySelectorAll('thead th')).some(th => (th.dataset && th.dataset.colId) === col.id)) {
        addColumnToTableDOM(col, 'send');
      }
    });
    updateSendNumbers();
    scheduleRiderPreview();
    attachColumnDragHandlersToAllTables();
  }

  function loadSendsList(sendsData) {
    sendsListBody.innerHTML = '';
    if (sendsData && sendsData.length) {
      sendsData.forEach((s, idx) =>
        sendsListBody.appendChild(createSendRow(idx + 1, s))
      );
    }
    sendExtraColumns.forEach(col => {
      const table = document.querySelector('#sends-list .data-table');
      if (table && !Array.from(table.querySelectorAll('thead th')).some(th => (th.dataset && th.dataset.colId) === col.id)) {
        addColumnToTableDOM(col, 'send');
      }
    });
    updateSendNumbers();
    scheduleRiderPreview();
    attachColumnDragHandlersToAllTables();
  }

  if (addChannelBtn) {
    addChannelBtn.addEventListener('click', () => {
      const currentCount = inputListBody.querySelectorAll('tr').length;
      inputListBody.appendChild(createChannelRow(currentCount + 1));
      updateChannelNumbers();
      scheduleRiderPreview();
    });
  }

  if (addSendBtn) {
    addSendBtn.addEventListener('click', () => {
      const currentCount = sendsListBody.querySelectorAll('tr').length;
      sendsListBody.appendChild(createSendRow(currentCount + 1));
      updateSendNumbers();
      scheduleRiderPreview();
    });
  }

  function updateChannelNumbers() {
    const rows = inputListBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const numCell = row.querySelector('td[data-label="Ch"]');
      if (numCell) {
        numCell.textContent = index + 1;
        numCell.dataset._lastValue = index + 1;
      }
      const deleteBtn = row.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          row.remove();
          updateChannelNumbers();
          scheduleRiderPreview();
        };
      }
    });
    projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
    updateProjectInfoDisplay(projectConfig);
  }

  function updateSendNumbers() {
    const rows = sendsListBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const numCell = row.querySelector('td[data-label="Send"]');
      if (numCell) numCell.textContent = index + 1;
      const deleteBtn = row.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          row.remove();
          updateSendNumbers();
          scheduleRiderPreview();
        };
      }
    });
    projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;
    updateProjectInfoDisplay(projectConfig);
  }

  // ---------------- Drag & Drop filas ----------------
  function setupDragAndDrop(row, isSendList = false) {
    row.addEventListener('dragstart', (e) => {
      draggedRow = row;
      row.classList.add('dragging');

      try {
        const controls = Array.from(row.querySelectorAll('input, select, textarea, [contenteditable="true"]'));
        const state = controls.map(c => {
          const isContentEditable = c.getAttribute && c.getAttribute('contenteditable') === 'true';
          return {
            tag: c.tagName.toLowerCase(),
            type: c.type || '',
            value: isContentEditable ? c.textContent : (c.value !== undefined ? c.value : ''),
            checked: c.checked === true,
            selectedIndex: c.selectedIndex != null ? c.selectedIndex : null
          };
        });
        row.dataset._rowState = JSON.stringify(state);
      } catch (err) {}

      try { e.dataTransfer.setData('text/plain', 'drag-row'); } catch (err) {}
      const phantomCheckbox = row.querySelector('.phantom-checkbox');
      if (phantomCheckbox) row.dataset._phantomChecked = phantomCheckbox.checked ? '1' : '0';
      e.dataTransfer.effectAllowed = 'move';
    });

    row.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (draggedRow !== row) row.classList.add('drag-over');
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));

    row.addEventListener('drop', () => {
      row.classList.remove('drag-over');
      if (draggedRow && draggedRow !== row) {
        const parent = row.parentNode;
        const draggingIndex = Array.from(parent.children).indexOf(draggedRow);
        const targetIndex = Array.from(parent.children).indexOf(row);
        if (draggingIndex > targetIndex) parent.insertBefore(draggedRow, row);
        else parent.insertBefore(draggedRow, row.nextSibling);

        try {
          if (draggedRow.dataset._rowState) {
            const saved = JSON.parse(draggedRow.dataset._rowState);
            const controlsNow = Array.from(draggedRow.querySelectorAll('input, select, textarea, [contenteditable="true"]'));
            controlsNow.forEach((c, i) => {
              const s = saved[i];
              if (!s) return;
              if (c.type === 'checkbox' || c.type === 'radio') {
                c.checked = !!s.checked;
              } else if (c.tagName.toLowerCase() === 'select') {
                if (s.selectedIndex != null && s.selectedIndex >= 0 && s.selectedIndex < c.options.length) {
                  c.selectedIndex = s.selectedIndex;
                } else if (s.value != null) {
                  try { c.value = s.value; } catch (err) {}
                }
              } else if (c.getAttribute && c.getAttribute('contenteditable') === 'true') {
                c.textContent = s.value || '';
              } else {
                c.value = s.value;
              }
              const ev = new Event('change', { bubbles: true });
              c.dispatchEvent(ev);
            });
          }
        } catch (err) {
        } finally {
          const cb = draggedRow.querySelector('.phantom-checkbox');
          if (cb && draggedRow.dataset._phantomChecked !== undefined) {
            cb.checked = draggedRow.dataset._phantomChecked === '1';
          }
        }

        if (isSendList) updateSendNumbers(); else updateChannelNumbers();
        scheduleRiderPreview();
      }
    });

    row.addEventListener('dragend', () => {
      if (draggedRow) {
        draggedRow.classList.remove('dragging');
        try {
          delete draggedRow.dataset._rowState;
          delete draggedRow.dataset._phantomChecked;
        } catch (e) {}
      }
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      draggedRow = null;
    });
  }

  // ---------------- Column drag-and-drop ----------------
  window._barstageDraggedCol = null;

  function attachColumnDragHandlersToTable(table) {
    if (!table) return;
    const thead = table.querySelector('thead');
    if (!thead) return;
    const headerRow = thead.querySelector('tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.children);
    headers.forEach((th, i) => {
      th.dataset.colIndex = String(i);
      th.draggable = (i !== 0 && i !== (headers.length - 1));
    });

    headers.forEach((th) => {
      if (th._colHandlerAttached) return;

      th.addEventListener('dragstart', (e) => {
        const idx = parseInt(th.dataset.colIndex, 10);
        if (isNaN(idx) || idx === 0) { e.preventDefault(); return; }
        window._barstageDraggedCol = { table: table, index: idx };
        try { e.dataTransfer.setData('text/plain', 'barstage-col'); } catch (err) {}
        th.classList.add('th-dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      th.addEventListener('dragover', (e) => {
        e.preventDefault();
        const dragged = window._barstageDraggedCol;
        if (!dragged || dragged.table !== table) return;
        const targetIdx = parseInt(th.dataset.colIndex, 10);
        if (isNaN(targetIdx) || targetIdx === 0) return;
        th.classList.add('col-drag-over');
        e.dataTransfer.dropEffect = 'move';
      });

      th.addEventListener('dragleave', () => {
        th.classList.remove('col-drag-over');
      });

      th.addEventListener('drop', (e) => {
        e.preventDefault();
        th.classList.remove('col-drag-over');
        const dragged = window._barstageDraggedCol;
        if (!dragged || dragged.table !== table) return;
        const srcIndex = dragged.index;
        const targetIndex = parseInt(th.dataset.colIndex, 10);
        if (isNaN(srcIndex) || isNaN(targetIndex)) return;
        const headerCount = headerRow.children.length;
        if (srcIndex < 1 || targetIndex < 1 || srcIndex === headerCount - 1 || targetIndex === headerCount - 1) return;
        if (srcIndex === targetIndex) return;
        reorderTableColumns(table, srcIndex, targetIndex);
        window._barstageDraggedCol = null;
      });

      th.addEventListener('dragend', () => {
        th.classList.remove('th-dragging');
        table.querySelectorAll('th.col-drag-over').forEach(t => t.classList.remove('col-drag-over'));
        window._barstageDraggedCol = null;
      });

      th._colHandlerAttached = true;
    });
  }

  function attachColumnDragHandlersToAllTables() {
    document.querySelectorAll('.data-table').forEach(tbl => attachColumnDragHandlersToTable(tbl));
  }

  function reorderTableColumns(table, fromIndex, toIndex) {
    if (!table) return;
    fromIndex = parseInt(fromIndex, 10);
    toIndex = parseInt(toIndex, 10);
    if (isNaN(fromIndex) || isNaN(toIndex)) return;

    const swapInRow = (row, from, to) => {
      const cells = Array.from(row.children);
      if (from < 0 || from >= cells.length || to < 0 || to >= cells.length) return;
      const fromNode = cells[from];
      if (from < to) {
        const reference = cells[to].nextSibling;
        row.insertBefore(fromNode, reference);
      } else {
        row.insertBefore(fromNode, cells[to]);
      }
    };

    const theads = table.querySelectorAll('thead');
    theads.forEach(thead => {
      thead.querySelectorAll('tr').forEach(tr => swapInRow(tr, fromIndex, toIndex));
    });
    const tbodies = table.querySelectorAll('tbody');
    tbodies.forEach(tbody => {
      tbody.querySelectorAll('tr').forEach(tr => {
        const cells = Array.from(tr.children);
        if (fromIndex >= cells.length || toIndex > cells.length) return;
        swapInRow(tr, fromIndex, toIndex);
      });
    });

    const headerRow = table.querySelector('thead tr');
    if (headerRow) {
      Array.from(headerRow.children).forEach((th, i) => {
        th.dataset.colIndex = String(i);
      });
    }

    attachColumnDragHandlersToTable(table);
    scheduleRiderPreview();
  }

  // ---------------- Paleta / Canvas drop ----------------
  paletteTabButtons.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      paletteTabButtons.forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      const cat = tabBtn.dataset.category;
      paletteCategories.forEach(c => {
        if (c.id === `category-${cat}`) c.classList.add('active');
        else c.classList.remove('active');
      });
      attachPaletteDragHandlers();
    });
  });

  function attachPaletteDragHandlers() {
    document.querySelectorAll('.stage-icon').forEach(icon => {
      if (!icon._hasHandler) {
        icon.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', icon.dataset.type);
          e.dataTransfer.effectAllowed = 'move';
        });
        icon._hasHandler = true;
      }
    });
  }
  attachPaletteDragHandlers();

  if (stageCanvas) {
    stageCanvas.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    stageCanvas.addEventListener('drop', (e) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain');
      if (!type) return;
      const areaRect = workArea.getBoundingClientRect();
      const x = e.clientX - areaRect.left;
      const y = e.clientY - areaRect.top;

      const draggedElement = document.createElement('div');
      draggedElement.className = 'stage-element';
      draggedElement.dataset.type = type;

      const sourceIcon = document.querySelector(`.stage-icon[data-type="${type}"]`);
      const iconHtml = sourceIcon?.querySelector('i')?.outerHTML || '';
      const iconText = sourceIcon?.textContent.trim() || '';

      if (type === 'platform-2x1') {
        draggedElement.style.width = '200px';
        draggedElement.style.height = '100px';
        draggedElement.style.backgroundColor = '#cfcfcf';
        draggedElement.style.border = '2px solid #999';
        draggedElement.dataset.content = 'Tarima 2m x 1m';
        draggedElement.dataset.platform = '2x1';
        draggedElement.dataset.showLabel = '0';
        draggedElement.dataset.colorUserSetBackground = '1';
        draggedElement.dataset.borderUserSet = '1';
      } else if (type.startsWith('custom-')) {
        const dataUrl = customIcons.get(type);
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.maxWidth = '60px';
          img.style.maxHeight = '60px';
          draggedElement.appendChild(img);
          draggedElement.style.width = 'fit-content';
          draggedElement.style.height = 'fit-content';
        }
        draggedElement.dataset.content = iconText || '';
        draggedElement.dataset.showLabel = '0';
      } else if (type.endsWith('-shape')) {
        draggedElement.style.backgroundColor = 'rgba(128,128,128,0.5)';
        draggedElement.style.width = '100px';
        draggedElement.style.height = '100px';
        draggedElement.dataset.content = '';
        draggedElement.dataset.showLabel = '0';
        if (type === 'circle-shape') draggedElement.classList.add('shape-circle');
        else if (type === 'line-shape') {
          draggedElement.style.width = '150px';
          draggedElement.style.height = '5px';
          draggedElement.classList.add('shape-square');
          draggedElement.style.borderRadius = '0';
        } else draggedElement.classList.add('shape-square');

        draggedElement.dataset.colorUserSetBackground = '1';
      } else if (type === 'text') {
        draggedElement.style.width = 'fit-content';
        draggedElement.style.height = 'fit-content';
        draggedElement.style.backgroundColor = 'transparent';
        draggedElement.style.border = 'none';
        draggedElement.innerHTML = 'Etiqueta';
        draggedElement.style.padding = '2px 5px';
        draggedElement.setAttribute('contenteditable', 'false');
        draggedElement.style.fontSize = '1.0em';
        draggedElement.dataset.content = 'Etiqueta';
        draggedElement.dataset.showLabel = '1';
      } else {
        draggedElement.innerHTML = iconHtml || '';
        draggedElement.style.backgroundColor = 'transparent';
        draggedElement.style.color = '';
        draggedElement.style.padding = '5px';
        draggedElement.style.width = 'fit-content';
        draggedElement.style.height = 'fit-content';
        draggedElement.style.fontSize = '1.0em';
        draggedElement.dataset.content = iconText || '';
        draggedElement.dataset.showLabel = '0';
      }

      draggedElement.style.left = `${x}px`;
      draggedElement.style.top = `${y}px}`;
      draggedElement.style.zIndex = '10';
      draggedElement.dataset.rotation = '0';
      draggedElement.dataset.scale = '1.0';
      draggedElement.dataset.elementId = `element-${iconCounter++}`;

      workArea.appendChild(draggedElement);
      setupElementInteractions(draggedElement);
      selectSingleElement(draggedElement, { clearOthers: true });

      const placeholder = workArea.querySelector('.canvas-placeholder');
      if (placeholder) placeholder.remove();

      scheduleRiderPreview();
    });
  }

  // ---------------- Element interactivity ----------------
  function getElementTextContent(element) {
    return (element.dataset.content || '').toString().trim();
  }
  function setElementTextContent(element, newText) {
    newText = newText || '';
    element.dataset.content = newText;
    updateElementLabelDisplay(element);
    element.setAttribute('contenteditable', 'false');
  }

  function updateElementLabelDisplay(element) {
    if (!element) return;
    const existing = element.querySelector('.element-label');
    if (existing) existing.remove();

    const showIndividually = (element.dataset.showLabel === '1' || element.dataset.showLabel === 'true');
    const showNow = showIndividually && labelsVisible;

    if (showNow) {
      const text = element.dataset.content || '';
      if (text) {
        const span = document.createElement('div');
        span.className = 'element-label';
        span.textContent = text;
        span.style.position = 'absolute';
        span.style.top = '100%';
        span.style.left = '50%';
        span.style.transform = 'translateX(-50%)';
        span.style.fontSize = '0.85em';
        span.style.whiteSpace = 'nowrap';
        span.style.pointerEvents = 'none';
        element.appendChild(span);
      }
    }
  }

  // ---------- Selection helpers ----------
  function clearAllSelection() {
    selectedElements.forEach(el => {
      el.classList.remove('selected');
      el.classList.remove('multi-selected');
    });
    selectedElements.clear();
    selectedElement = null;
    if (elementControls) elementControls.style.display = 'none';
    if (configPanel) configPanel.querySelector('.config-placeholder').style.display = 'block';
  }

  function selectSingleElement(el, { clearOthers = true } = {}) {
    if (!el) return;
    if (clearOthers) clearAllSelection();
    selectedElements.add(el);
    selectedElement = el;

    selectedElements.forEach(e => {
      if (e !== el) {
        e.classList.remove('selected');
        e.classList.add('multi-selected');
      }
    });
    el.classList.remove('multi-selected');
    el.classList.add('selected');

    addTransformationHandles(el);
    if (elementControls) elementControls.style.display = 'block';
    if (configPanel) configPanel.querySelector('.config-placeholder').style.display = 'none';
    updateConfigPanel(el);
  }

  function toggleSelectElement(el) {
    if (!el) return;
    if (selectedElements.has(el)) {
      selectedElements.delete(el);
      el.classList.remove('selected', 'multi-selected');
      if (selectedElement === el) {
        selectedElement = null;
        const first = selectedElements.values().next().value;
        if (first) selectSingleElement(first, { clearOthers: false });
        else {
          if (elementControls) elementControls.style.display = 'none';
          if (configPanel) configPanel.querySelector('.config-placeholder').style.display = 'block';
        }
      }
    } else {
      selectedElements.add(el);
      if (selectedElement) {
        selectedElement.classList.remove('selected');
        selectedElement.classList.add('multi-selected');
      }
      selectedElement = el;
      el.classList.remove('multi-selected');
      el.classList.add('selected');
      addTransformationHandles(el);
      if (elementControls) elementControls.style.display = 'block';
      if (configPanel) configPanel.querySelector('.config-placeholder').style.display = 'none';
      updateConfigPanel(el);
    }
  }

  // --------- Helper: limitar posición al canvas ---------
  function clampToCanvas(el, left, top) {
    const areaRect = workArea.getBoundingClientRect();
    const elW = Math.max(1, el.offsetWidth || 50);
    const elH = Math.max(1, el.offsetHeight || 50);

    const minLeft = 0;
    const minTop  = 0;
    const maxLeft = areaRect.width  - elW;
    const maxTop  = areaRect.height - elH;

    return {
      left: Math.min(Math.max(left, minLeft), maxLeft),
      top:  Math.min(Math.max(top,  minTop),  maxTop)
    };
  }

  // ---------------- Global drag handlers ----------------
  function onDocMouseMove(e) {
    if (!dragState.active) return;
    const anyResizing = document.querySelector('.stage-element.resizing');
    const anyRotating = document.querySelector('.stage-element.rotating');
    if (anyResizing || anyRotating) return;

    if (dragState.multi && dragState.initialPositions) {
      const dx = e.clientX - dragState.startMouse.x;
      const dy = e.clientY - dragState.startMouse.y;
      dragState.initialPositions.forEach((pos, el) => {
        let newLeft = pos.left + dx;
        let newTop  = pos.top  + dy;
        const clamped = clampToCanvas(el, newLeft, newTop);
        el.style.left = clamped.left + 'px';
        el.style.top  = clamped.top  + 'px';
      });
    } else {
      const el = dragState.element;
      if (!el) return;
      const areaRect = workArea.getBoundingClientRect();
      let newLeft = e.clientX - areaRect.left - dragState.offset.x;
      let newTop  = e.clientY - areaRect.top  - dragState.offset.y;
      const clamped = clampToCanvas(el, newLeft, newTop);
      el.style.left = clamped.left + 'px';
      el.style.top  = clamped.top  + 'px';
    }
    scheduleRiderPreview();
  }

  function onDocMouseUp() {
    if (!dragState.active) return;
    if (dragState.element) dragState.element.classList.remove('dragging');
    dragState.active = false;
    dragState.multi = false;
    dragState.element = null;
    dragState.initialPositions = null;
    scheduleRiderPreview();
  }

  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('mouseup', onDocMouseUp);

  // ---------------- Element setup ----------------
  function setupElementInteractions(element) {
    if (!element.style.left) element.style.left = '0px';
    if (!element.style.top) element.style.top = '0px';

    element.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('resizer') || e.target.classList.contains('rotator')) return;
      e.stopPropagation();

      const isMultiKey = (e.ctrlKey || e.metaKey);
      if (isMultiKey) {
        toggleSelectElement(element);
      } else {
        if (!selectedElements.has(element) || selectedElements.size > 1) {
          selectSingleElement(element, { clearOthers: true });
        } else {
          selectedElement = element;
          element.classList.add('selected');
        }
      }

      if (element.getAttribute('contenteditable') === 'true' && element === document.activeElement) return;

      dragState.active = true;
      dragState.element = element;
      dragState.startMouse.x = e.clientX;
      dragState.startMouse.y = e.clientY;
      const rect = element.getBoundingClientRect();
      dragState.offset.x = e.clientX - rect.left;
      dragState.offset.y = e.clientY - rect.top;
      element.classList.add('dragging');

      if (selectedElements.size > 1 && selectedElements.has(element)) {
        dragState.multi = true;
        const initialPositions = new Map();
        selectedElements.forEach(el => {
          initialPositions.set(el, {
            left: parseFloat(el.style.left) || 0,
            top:  parseFloat(el.style.top)  || 0
          });
        });
        dragState.initialPositions = initialPositions;
      } else {
        dragState.multi = false;
        dragState.initialPositions = null;
      }
    });

    element.addEventListener('click', (e) => e.stopPropagation());

    if (!element.dataset.type?.endsWith('-shape')) {
      element.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (selectedElements.size > 1 && selectedElements.has(element)) {
          selectSingleElement(element, { clearOthers: false });
        } else {
          selectSingleElement(element, { clearOthers: true });
        }
        element.setAttribute('contenteditable', 'true');
        const icon = element.querySelector('i');
        if (icon) icon.style.display = 'none';
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        element.focus();
      });
    }

    element.addEventListener('blur', () => {
      const isPureText = element.dataset.type === 'text';
      if (!isPureText && element.getAttribute('contenteditable') === 'true') {
        const newText = element.textContent.trim();
        setElementTextContent(element, newText);
      }
      if (selectedElement === element && elementNameInput) {
        const elementText = getElementTextContent(element);
        elementNameInput.value = elementText;
        selectedElementTitle.textContent = elementText || 'Elemento Seleccionado';
        if (showLabelCheckbox) {
          showLabelCheckbox.checked =
            element.dataset.showLabel === '1' || element.dataset.showLabel === 'true';
        }
      }
      scheduleRiderPreview();
    });

    updateElementLabelDisplay(element);
  }

  // ---------------- Transformation handles ----------------
  function addTransformationHandles(element) {
    element.querySelectorAll('.resizer, .rotator').forEach(h => h.remove());

    if (element.dataset.platform !== '2x1') {
      const resizerBR = document.createElement('div');
      resizerBR.className = 'resizer bottom-right';
      element.appendChild(resizerBR);
      setupResizing(element, resizerBR);
    }

    const rotator = document.createElement('div');
    rotator.className = 'rotator';
    element.appendChild(rotator);
    setupRotation(element, rotator);

    if (element.style.width === 'fit-content') element.style.width = `${element.offsetWidth}px`;
    if (element.style.height === 'fit-content') element.style.height = `${element.offsetHeight}px`;

    updateConfigPanel(element);
  }

  function setupResizing(element, handle) {
    if (element.dataset.platform === '2x1') return;

    let startX, startY, startW, startH, startScale;
    const isShape = element.dataset.type?.endsWith('-shape');

    const onDown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      element.classList.add('resizing');
      element.classList.add('dragging');
      startX = e.clientX;
      startY = e.clientY;
      if (!isShape) {
        startW = element.offsetWidth;
        startH = element.offsetHeight;
        startScale = parseFloat(element.dataset.scale) || 1.0;
      } else {
        startW = parseFloat(element.style.width) || element.offsetWidth;
        startH = parseFloat(element.style.height) || element.offsetHeight;
      }
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (isShape) {
          element.style.width = `${Math.max(20, startW + dx)}px`;
          element.style.height = `${Math.max(20, startH + dy)}px`;
        } else {
          const delta = Math.abs(dx) > Math.abs(dy) ? dx / startW : dy / startH;
          let newScale = startScale * (1 + delta);
          newScale = Math.max(0.5, Math.min(5.0, newScale));
          element.style.fontSize = `${newScale}em`;
          element.dataset.scale = newScale.toFixed(2);
        }
        element.dataset.wasResized = 'true';
        updateElementLabelDisplay(element);
        scheduleRiderPreview();
      };
      const onUp = () => {
        element.classList.remove('resizing');
        element.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        scheduleRiderPreview();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', onDown);
  }

  function setupRotation(element, handle) {
    const onDown = (e) => {
      e.stopPropagation();
      e.preventDefault();
      element.classList.add('rotating');
      element.classList.add('dragging');

      const onMove = (ev) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angleRad = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
        let angleDeg = angleRad * (180 / Math.PI) + 90;
        if (angleDeg < 0) angleDeg += 360;
        element.dataset.rotation = angleDeg;
        const currentScale = element.dataset.scale || '1.0';
        let transformValue = `rotate(${angleDeg}deg)`;
        if (element.dataset.type?.endsWith('-shape') && element.dataset.type !== 'line-shape') {
          transformValue += ` scale(${currentScale})`;
        }
        element.style.transform = transformValue;
        scheduleRiderPreview();
      };

      const onUp = () => {
        element.classList.remove('rotating');
        element.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        scheduleRiderPreview();
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    handle.addEventListener('mousedown', onDown);
  }

  // ---------------- Config panel logic ----------------
  function updateConfigPanel(element) {
    if (!element) return;
    if (elementControls) elementControls.style.display = 'block';
    if (configPanel) configPanel.querySelector('.config-placeholder').style.display = 'none';
    const currentBackgroundColor = element.style.backgroundColor || 'transparent';
    const isShape = element.dataset.type?.endsWith('-shape');

    const colorToDisplay =
      (element.dataset.platform === '2x1')
        ? (currentBackgroundColor === 'transparent' ? '#cfcfcf' : currentBackgroundColor)
        : (isShape
            ? (currentBackgroundColor === 'transparent' ? '#007bff' : currentBackgroundColor)
            : (element.style.color || '#007bff'));

    const elementText = getElementTextContent(element);
    if (elementNameInput) {
      elementNameInput.value = elementText;
      elementNameInput.oninput = () => {
        setElementTextContent(element, elementNameInput.value);
        if (selectedElementTitle) {
          selectedElementTitle.textContent = elementNameInput.value || 'Elemento Seleccionado';
        }
        scheduleRiderPreview();
      };
    }
    if (selectedElementTitle) {
      selectedElementTitle.textContent = elementText || 'Elemento Seleccionado';
    }

    if (colorPicker) {
      colorPicker.value = rgbToHex(colorToDisplay);
      colorPicker.oninput = () => {
        if (element.dataset.platform === '2x1') {
          element.style.backgroundColor = colorPicker.value;
          element.dataset.colorUserSetBackground = '1';
        } else if (isShape) {
          element.style.backgroundColor = colorPicker.value;
          element.dataset.colorUserSet = '1';
        } else {
          element.style.color = colorPicker.value;
          element.dataset.colorUserSet = '1';
        }
        scheduleRiderPreview();
      };
    }

    if (shapeSelector) {
      shapeSelector.value =
        element.classList.contains('shape-circle')
          ? 'circle'
          : (element.dataset.type === 'line-shape'
              ? 'line'
              : (element.style.backgroundColor && element.dataset.type?.endsWith('-shape')
                  ? 'square'
                  : 'square'));
      shapeSelector.onchange = () => {
        element.classList.remove('shape-square', 'shape-circle');
        if (element.dataset.type?.endsWith('-shape') || element.style.backgroundColor !== 'transparent') {
          if (shapeSelector.value === 'line') {
            element.style.borderRadius = '0';
          } else {
            element.classList.add(`shape-${shapeSelector.value}`);
            element.style.borderRadius = '';
          }
        }
        scheduleRiderPreview();
      };
    }

    if (zIndexSelector) {
      const currentZIndex = element.style.zIndex || 10;
      zIndexSelector.value = currentZIndex;
      zIndexSelector.oninput = () => {
        element.style.zIndex = zIndexSelector.value;
        scheduleRiderPreview();
      };
    }

    const scaleSelector = document.getElementById('scale-selector');
    if (scaleSelector) {
      const currentScale = element.dataset.scale || 1.0;
      scaleSelector.value = currentScale;
      scaleSelector.oninput = (e) => {
        const newScale = e.target.value;
        if (isShape) {
          if (element.dataset.type !== 'line-shape') {
            element.style.transform = `rotate(${element.dataset.rotation || 0}deg) scale(${newScale})`;
          }
        } else {
          element.style.fontSize = `${newScale}em`;
          element.style.transform = `rotate(${element.dataset.rotation || 0}deg)`;
        }
        element.dataset.scale = newScale;
        scheduleRiderPreview();
      };
    }

    if (showLabelCheckbox) {
      showLabelCheckbox.checked =
        element.dataset.showLabel === '1' || element.dataset.showLabel === 'true';
      showLabelCheckbox.onchange = () => {
        element.dataset.showLabel = showLabelCheckbox.checked ? '1' : '0';
        updateElementLabelDisplay(element);
        scheduleRiderPreview();
      };
    }

    if (deleteElementBtn) {
      deleteElementBtn.onclick = () => {
        if (selectedElements.size > 1) {
          selectedElements.forEach(el => el.remove());
          clearAllSelection();
        } else if (element) {
          element.remove();
          clearAllSelection();
          if (workArea.querySelectorAll('.stage-element').length === 0) {
            workArea.innerHTML =
              '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano 800x500)</p>';
          }
          renderRulers();
        }
        scheduleRiderPreview();
      };
    }
  }

  // ---------------- Copy/Paste/Duplicate ----------------
  if (duplicateBtn) duplicateBtn.addEventListener('click', () => {
    if (selectedElement) duplicateElement(selectedElement);
  });
  if (copyBtn) copyBtn.addEventListener('click', () => {
    if (selectedElements.size > 1) {
      clipboardElementData = {
        multi: true,
        items: Array.from(selectedElements).map(el => serializeElementForClipboard(el))
      };
    } else if (selectedElement) {
      clipboardElementData = {
        multi: false,
        item: serializeElementForClipboard(selectedElement)
      };
    }
  });
  if (pasteBtn) pasteBtn.addEventListener('click', () => {
    if (!clipboardElementData) return;
    if (clipboardElementData.multi) {
      let offset = 0;
      clipboardElementData.items.forEach(item => {
        pasteSerializedElement(item, offset, offset);
        offset += 15;
      });
    } else {
      pasteSerializedElement(clipboardElementData.item, 20, 20);
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      if (selectedElements.size > 1) {
        clipboardElementData = {
          multi: true,
          items: Array.from(selectedElements).map(el => serializeElementForClipboard(el))
        };
      } else if (selectedElement) {
        clipboardElementData = {
          multi: false,
          item: serializeElementForClipboard(selectedElement)
        };
      }
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      if (!clipboardElementData) return;
      if (clipboardElementData.multi) {
        let offset = 0;
        clipboardElementData.items.forEach(item => {
          pasteSerializedElement(item, offset, offset);
          offset += 15;
        });
      } else {
        pasteSerializedElement(clipboardElementData.item, 30, 30);
      }
      e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      if (selectedElement) {
        duplicateElement(selectedElement);
        e.preventDefault();
      }
    }
  });

  function serializeElementForClipboard(el) {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const inner = el.innerHTML;

    const styleWidth = (el.style.width && el.style.width !== 'fit-content') ? el.style.width : null;
    const styleHeight = (el.style.height && el.style.height !== 'fit-content') ? el.style.height : null;

    const computedWidth = styleWidth || `${Math.round(rect.width)}px`;
    const computedHeight = styleHeight || `${Math.round(rect.height)}px`;

    const borderShorthand =
      (cs.border && cs.border !== '0px none rgb(0, 0, 0)') ? cs.border : '';
    const borderWidth = cs.borderTopWidth || '';
    const borderStyle = cs.borderTopStyle || '';
    const borderColor = cs.borderTopColor || '';

    return {
      html: inner,
      computed: {
        width: computedWidth,
        height: computedHeight,
        backgroundColor: cs.backgroundColor,
        color: cs.color,
        transform: (cs.transform === 'none') ? '' : cs.transform,
        fontSize: cs.fontSize,
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        zIndex: el.style.zIndex || cs.zIndex || '',
        border: borderShorthand,
        borderWidth,
        borderStyle,
        borderColor
      },
      style: {
        left: parseFloat(el.style.left) || 0,
        top: parseFloat(el.style.top) || 0
      },
      dataset: { ...el.dataset },
      classes: Array.from(el.classList).filter(c =>
        c !== 'selected' && c !== 'dragging' && c !== 'multi-selected'
      )
    };
  }

  function pasteSerializedElement(data, dx = 10, dy = 10) {
    if (!data) return;
    const el = document.createElement('div');
    el.className = 'stage-element ' +
      ((data.classes && data.classes.length) ? data.classes.join(' ') : '');
    el.innerHTML = data.html || '';
    const comp = data.computed || {};
    if (comp.width) el.style.width = comp.width;
    if (comp.height) el.style.height = comp.height;
    if (comp.backgroundColor) el.style.backgroundColor = comp.backgroundColor;
    if (comp.color) el.style.color = comp.color;
    if (comp.transform) el.style.transform = comp.transform;
    if (comp.fontSize) el.style.fontSize = comp.fontSize;
    if (comp.borderRadius) el.style.borderRadius = comp.borderRadius;
    if (comp.padding) el.style.padding = comp.padding;
    if (comp.zIndex) el.style.zIndex = comp.zIndex;
    if (comp.border) {
      el.style.border = comp.border;
    } else if (comp.borderWidth || comp.borderStyle || comp.borderColor) {
      const bw = comp.borderWidth || '1px';
      const bs = comp.borderStyle || 'solid';
      const bc = comp.borderColor || '#000';
      el.style.border = `${bw} ${bs} ${bc}`;
    }

    let newLeft = (data.style.left + dx);
    let newTop  = (data.style.top  + dy);
    const clamped = clampToCanvas(el, newLeft, newTop);
    el.style.left = clamped.left + 'px';
    el.style.top  = clamped.top  + 'px';

    if (data.dataset) Object.keys(data.dataset).forEach(k => el.dataset[k] = data.dataset[k]);
    el.dataset.elementId = `element-${iconCounter++}`;

    if (comp.border || comp.borderColor) el.dataset.borderUserSet = '1';

    if (!el.dataset.colorUserSet) el.style.color = '';
    if (!el.dataset.colorUserSetBackground) el.style.backgroundColor = '';

    if (el.dataset && el.dataset.type && el.dataset.type.startsWith('custom-')) {
      const url = customIcons.get(el.dataset.type);
      if (url && !el.querySelector('img')) {
        el.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = comp.width ? comp.width : '60px';
        img.style.maxHeight = comp.height ? comp.height : '60px';
        el.appendChild(img);
      }
    }

    workArea.appendChild(el);
    setupElementInteractions(el);
    selectSingleElement(el, { clearOthers: true });
    scheduleRiderPreview();
  }

  function duplicateElement(sourceEl) {
    if (!sourceEl) return;
    const data = serializeElementForClipboard(sourceEl);
    pasteSerializedElement(data, 15, 15);
  }

  // ---------------- Helpers: rgbToHex ----------------
  function rgbToHex(color) {
    if (!color) return '#000000';
    color = color.trim();
    if (color.startsWith('#')) return color.length === 7 ? color : '#000000';
    const rgba = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!rgba) return '#000000';
    const r = parseInt(rgba[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgba[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgba[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // ---------------- Deselección global / atajos ----------------
  document.addEventListener('click', (e) => {
    if (e.target.closest('#element-config-panel') ||
        e.target.closest('.resizer') ||
        e.target.closest('.rotator')) return;
    if (e.target.closest('.stage-element')) return;
    if (!e.target.closest('.stage-element')) clearAllSelection();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (selectedElement && selectedElement.getAttribute('contenteditable') === 'true') {
        selectedElement.blur();
      }
      clearAllSelection();
    }

    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (arrowKeys.includes(e.key)) {
      const activeElement = document.activeElement;
      const isEditingText =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable === true);

      if (!isEditingText && selectedElements.size > 0) {
        const step = e.shiftKey ? 10 : 1;
        selectedElements.forEach(el => {
          let left = parseFloat(el.style.left) || 0;
          let top  = parseFloat(el.style.top)  || 0;
          if (e.key === 'ArrowLeft')  left -= step;
          if (e.key === 'ArrowRight') left += step;
          if (e.key === 'ArrowUp')    top  -= step;
          if (e.key === 'ArrowDown')  top  += step;
          const clamped = clampToCanvas(el, left, top);
          el.style.left = clamped.left + 'px';
          el.style.top  = clamped.top  + 'px';
        });
        scheduleRiderPreview();
        e.preventDefault();
        return;
      }
    }

    const isDeleteOrBackspace = (e.key === 'Delete' || e.key === 'Backspace');
    if (isDeleteOrBackspace) {
      const activeElement = document.activeElement;
      const isEditingText =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
         activeElement.tagName === 'TEXTAREA' ||
         activeElement.isContentEditable === true);
      if (isEditingText) return;
      if (selectedElements.size > 0) {
        selectedElements.forEach(el => el.remove());
        clearAllSelection();
        if (workArea.querySelectorAll('.stage-element').length === 0) {
          workArea.innerHTML =
            '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano 800x500)</p>';
        }
        renderRulers();
      }
    }
  });

  // ---------------- Save / Load / Snapshot ----------------
  function collectStageElements() {
    const elements = [];
    workArea.querySelectorAll('.stage-element').forEach(element => {
      let widthToSave =
        element.style.width === 'fit-content'
          ? element.offsetWidth
          : parseFloat(element.style.width || element.offsetWidth);
      let heightToSave =
        element.style.height === 'fit-content'
          ? element.offsetHeight
          : parseFloat(element.style.height || element.offsetHeight);
      const computedBorder =
        element.style.border || window.getComputedStyle(element).border || '';
      elements.push({
        type: element.dataset.type,
        x: parseFloat(element.style.left) || 0,
        y: parseFloat(element.style.top) || 0,
        width: widthToSave,
        height: heightToSave,
        color: element.style.color || '',
        backgroundColor: element.style.backgroundColor || '',
        border: computedBorder,
        zIndex: element.style.zIndex,
        rotation: element.dataset.rotation,
        scale: element.dataset.scale,
        content: element.dataset.content || '',
        classes: Array.from(element.classList).filter(c =>
          c !== 'stage-element' && c !== 'selected' &&
          c !== 'dragging' && c !== 'multi-selected'
        ),
        dataset: { ...element.dataset },
        isCircle: element.classList.contains('shape-circle'),
        wasResized: element.dataset.wasResized === 'true'
      });
    });
    return elements;
  }

  function collectInputList() {
    const channels = [];
    inputListBody.querySelectorAll('tr').forEach(row => {
      const obj = {};
      const extra = {};
      Array.from(row.children).forEach(td => {
        const label = td.getAttribute('data-label') || '';
        if (!label) return;
        if (label === 'Ch') obj.ch = parseInt(td.textContent.trim() || '0');
        else if (label === 'Nombre de canal') obj.name = td.textContent.trim();
        else if (label === 'Mic/DI') obj.mic = td.querySelector('input')?.value || '';
        else if (label === 'Phantom') obj.phantom = !!td.querySelector('input[type="checkbox"]')?.checked;
        else if (label === 'Pie') obj.stand = td.querySelector('input')?.value || '';
        else if (label === 'Sub-Snake') {
          obj.subSnake = td.querySelector('.subsnake-name')?.value || '';
          obj.subSnakeColor =
            td.style.backgroundColor ||
            (td.querySelector('.subsnake-color-picker')?.value || '#ffffff');
        } else if (label === 'Notas') obj.notes = td.textContent.trim();
        else if (label === 'Eliminar') { /* skip */ }
        else {
          const inp = td.querySelector('input[type="color"], input[type="number"], input[type="text"], input:not([type]), select, textarea');
          const cb = td.querySelector('input[type="checkbox"]');
          const sel = td.querySelector('select');
          const editable = td.querySelector('[contenteditable="true"]');
          if (cb) extra[label] = !!cb.checked;
          else if (sel) extra[label] = sel.value;
          else if (inp) extra[label] = inp.value;
          else if (editable) extra[label] = editable.textContent.trim();
          else extra[label] = td.textContent.trim();
        }
      });
      obj.extra = extra;
      channels.push(obj);
    });
    return channels;
  }

  function collectSendsList() {
    const sends = [];
    sendsListBody.querySelectorAll('tr').forEach(row => {
      const obj = {};
      const extra = {};
      Array.from(row.children).forEach(td => {
        const label = td.getAttribute('data-label') || '';
        if (!label) return;
        if (label === 'Send') obj.send = parseInt(td.textContent.trim() || '0');
        else if (label === 'Nombre') obj.name = td.textContent.trim();
        else if (label === 'Tipo') obj.type = td.querySelector('select')?.value || td.textContent.trim();
        else if (label === 'Mix') obj.mix = td.textContent.trim();
        else if (label === 'EQ/FX') obj.eqfx = td.textContent.trim();
        else if (label === 'Notas') obj.notes = td.textContent.trim();
        else if (label === 'Eliminar') { /* skip */ }
        else {
          const inp = td.querySelector('input[type="color"], input[type="number"], input[type="text"], input:not([type]), select, textarea');
          const cb = td.querySelector('input[type="checkbox"]');
          const sel = td.querySelector('select');
          const editable = td.querySelector('[contenteditable="true"]');
          if (cb) extra[label] = !!cb.checked;
          else if (sel) extra[label] = sel.value;
          else if (inp) extra[label] = inp.value;
          else if (editable) extra[label] = editable.textContent.trim();
          else extra[label] = td.textContent.trim();
        }
      });
      obj.extra = extra;
      sends.push(obj);
    });
    return sends;
  }

  function getSnapshot() {
    return {
      config: projectConfig,
      stageElements: collectStageElements(),
      inputList: collectInputList(),
      sendsList: collectSendsList(),
      rider: {
        title: riderTitleInput?.value || '',
        notes: riderEditor?.innerHTML || '',
        stageNote: riderStageNotesInput?.innerHTML || ''
      },
      customIcons: Array.from(customIcons.entries()),
      inputExtraColumns: inputExtraColumns,
      sendExtraColumns: sendExtraColumns,
      savedAt: Date.now()
    };
  }

  function saveProjectAsBarstage() {
    if (!projectConfig.projectName) {
      alert('Por favor, nombra el proyecto antes de guardar.');
      return;
    }
    projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
    projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;
    const projectData = getSnapshot();
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectConfig.projectName.replace(/\s/g, '_')}.barstage`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`Proyecto "${projectConfig.projectName}" guardado!`);
  }

  if (saveProjectBtn) saveProjectBtn.addEventListener('click', saveProjectAsBarstage);
  if (loadProjectBtn) {
    loadProjectBtn.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.barstage, .json';
      fileInput.click();
      fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const loadedData = JSON.parse(e.target.result);
            loadProject(loadedData);
            alert(`Proyecto "${loadedData.config.projectName}" cargado exitosamente.`);
          } catch (error) {
            console.error("Error al parsear JSON:", error);
            alert('Error al leer el archivo. Asegúrate de que sea un archivo de proyecto (.barstage o .json) válido.');
          }
          event.target.value = '';
        };
        reader.readAsText(file);
      });
    });
  }

  // ---------------- Add Column UI ----------------
  function askNewColumn(forTable = 'input') {
    const name = prompt('Nombre de la nueva columna (ej: Instrumento):');
    if (!name) return;
    const type = prompt('Tipo (text,color,checkbox,select,number). Dejar vacío para "text":', 'text') || 'text';
    let options = [];
    if (type === 'select') {
      const raw = prompt('Opciones separadas por comas (ej: L,R,Aux):', '');
      if (raw) options = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    const def = { label: name.trim(), type: type.trim(), options };
    const ok = addExtraColumnDefinition(def, forTable);
    if (!ok) alert('No se pudo añadir la columna (posible nombre duplicado).');
  }

  if (addInputColumnBtn) addInputColumnBtn.addEventListener('click', () => askNewColumn('input'));
  if (addSendColumnBtn) addSendColumnBtn.addEventListener('click', () => askNewColumn('send'));

  // ---------------- Export modal & actions ----------------
  async function askExportFormat() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(0,0,0,0.4)';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';

      const box = document.createElement('div');
      box.style.background = 'var(--color-surface)';
      box.style.color = 'var(--color-text)';
      box.style.padding = '18px';
      box.style.borderRadius = '8px';
      box.style.minWidth = '320px';
      box.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';

      const title = document.createElement('div');
      title.textContent = 'Selecciona formato de exportación';
      title.style.fontWeight = '700';
      title.style.marginBottom = '10px';
      box.appendChild(title);

      const desc = document.createElement('div');
      desc.textContent = 'Elige cómo quieres exportar el Rider / proyecto:';
      desc.style.fontSize = '0.9em';
      desc.style.marginBottom = '12px';
      box.appendChild(desc);

      const buttons = [
        { label: 'Proyecto (.barstage)', value: 'barstage' },
        { label: 'HTML (Rider completo)', value: 'html' },
        { label: 'Imprimir', value: 'print' },
        { label: 'Excel (.xls) - sólo tablas', value: 'excel' },
        { label: 'Word (.doc) - sólo tablas', value: 'doc' },
        { label: 'Cancelar', value: 'cancel' }
      ];

      const btnContainer = document.createElement('div');
      btnContainer.style.display = 'flex';
      btnContainer.style.flexDirection = 'column';
      btnContainer.style.gap = '8px';

      buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.textContent = b.label;
        btn.style.padding = '8px 10px';
        btn.style.border = 'none';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.background = 'var(--color-button-bg)';
        btn.style.color = 'var(--color-text)';
        if (b.value === 'cancel') btn.style.background = '#f5f5f5';
        btn.addEventListener('click', () => {
          document.body.removeChild(overlay);
          resolve(b.value);
        });
        btnContainer.appendChild(btn);
      });
      box.appendChild(btnContainer);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    });
  }

  if (exportProjectBtn) {
    exportProjectBtn.addEventListener('click', async () => {
      const fmt = await askExportFormat();
      if (!fmt || fmt === 'cancel') return;
      if (fmt === 'barstage') saveProjectAsBarstage();
      else if (fmt === 'html') await exportRiderAsHTML();
      else if (fmt === 'print') printRider();
      else if (fmt === 'excel') exportRiderAsExcel();
      else if (fmt === 'doc') exportRiderAsDoc();
      else alert('Formato no reconocido.');
    });
  }
  if (printRiderBtn) printRiderBtn.addEventListener('click', printRider);

  // ---------------- Load project ----------------
  function loadProject(data) {
    resetApplicationState();
    projectConfig = data.config || {};

    inputExtraColumns = Array.isArray(data.inputExtraColumns)
      ? data.inputExtraColumns.slice()
      : [];
    sendExtraColumns = Array.isArray(data.sendExtraColumns)
      ? data.sendExtraColumns.slice()
      : [];

    function rebuildTableHeaders(selector, defaultHeaders) {
      const table = document.querySelector(selector);
      if (!table) return;
      const thead = table.querySelector('thead');
      if (!thead) return;
      thead.innerHTML = '';
      const tr = document.createElement('tr');
      defaultHeaders.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
    }

    rebuildTableHeaders('#input-list .data-table', INPUT_DEFAULT_HEADERS);
    rebuildTableHeaders('#sends-list .data-table', SEND_DEFAULT_HEADERS);

    loadInputList(data.inputList || []);
    loadSendsList(data.sendsList || []);

    if (data.customIcons && Array.isArray(data.customIcons)) {
      data.customIcons.forEach(([key, url]) => {
        customIcons.set(key, url);
      });
      refreshCustomIconsInPalette();
    }

    loadStageElements(data.stageElements || []);

    if (data.rider) {
      if (riderTitleInput) riderTitleInput.value = data.rider.title || '';
      if (riderEditor) riderEditor.innerHTML = data.rider.notes || '';
      if (riderStageNotesInput) riderStageNotesInput.innerHTML = data.rider.stageNote || '';
    }

    (data.inputList || []).forEach(ch => {
      if (ch && ch.subSnake) {
        const nm = ch.subSnake;
        const col = ch.subSnakeColor || '#ffffff';
        if (nm) subSnakeColorMap.set(nm, col);
      }
    });

    updateProjectInfoDisplay(projectConfig);
    syncPreferencesFormFromConfig();
    syncInitFormFromConfig();

    // También sincronizamos el título del rider si no se ha personalizado antes
    if (riderTitleInput) {
      const currentRiderTitle = riderTitleInput.value.trim();
      if (!currentRiderTitle) riderTitleInput.value = projectConfig.tourName || '';
    }

    if (projectInitScreen) projectInitScreen.classList.remove('active');
    if (mainNav) mainNav.style.display = 'flex';
    body.classList.remove('init-screen');
    activateTab('stage-plot');
    renderRidersInfoOnly();
    renderRulers();
    scheduleRiderPreview();
    attachColumnDragHandlersToAllTables();
  }

  function loadStageElements(elementsData) {
    if (!stageCanvas) return;
    workArea.innerHTML =
      '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano 800x500)</p>';
    if (!canvasRulers.parentElement) stageCanvas.appendChild(canvasRulers);
    const placeholder = workArea.querySelector('.canvas-placeholder');

    if (elementsData && elementsData.length > 0) {
      if (placeholder) placeholder.remove();
      elementsData.forEach(elementData => {
        const element = document.createElement('div');
        element.className = `stage-element ${elementData.classes ? elementData.classes.join(' ') : ''}`;
        element.dataset.type = elementData.type;
        element.style.left = `${elementData.x || 0}px`;
        element.style.top = `${elementData.y || 0}px`;

        if (elementData.width) element.style.width = `${elementData.width}px`;
        if (elementData.height) element.style.height = `${elementData.height}px`;

        if (!element.dataset.type?.endsWith('-shape')) {
          element.style.width = elementData.width ? `${elementData.width}px` : 'fit-content';
          element.style.height = elementData.height ? `${elementData.height}px` : 'fit-content';
        }

        element.style.color = elementData.color || 'var(--color-text)';
        element.style.backgroundColor = elementData.backgroundColor || '';
        if (elementData.border) element.style.border = elementData.border;
        element.style.zIndex = elementData.zIndex || '';
        const sizeValue = elementData.scale || '1.0';

        if (element.dataset.type === 'line-shape') {
          element.style.transform = `rotate(${elementData.rotation || 0}deg)`;
        } else if (element.dataset.type?.endsWith('-shape')) {
          element.style.transform = `rotate(${elementData.rotation || 0}deg) scale(${sizeValue})`;
        } else {
          element.style.fontSize = `${sizeValue}em`;
          element.style.transform = `rotate(${elementData.rotation || 0}deg)`;
        }

        element.dataset.rotation = elementData.rotation;
        element.dataset.scale = sizeValue;
        element.dataset.wasResized = elementData.wasResized ? 'true' : 'false';
        if (elementData.dataset) {
          Object.keys(elementData.dataset).forEach(k => element.dataset[k] = elementData.dataset[k]);
        }

        if (elementData.backgroundColor) element.dataset.colorUserSetBackground = '1';
        if (elementData.border) element.dataset.borderUserSet = '1';

        if (elementData.dataset && elementData.dataset.type && elementData.dataset.type.startsWith('custom-')) {
          const url = customIcons.get(elementData.dataset.type);
          if (url) {
            const img = document.createElement('img');
            img.src = url;
            img.style.maxWidth = elementData.width ? `${Math.min(200, elementData.width)}px` : '60px';
            img.style.maxHeight = elementData.height ? `${Math.min(200, elementData.height)}px` : '60px';
            element.appendChild(img);
          }
        } else if (element.dataset.type !== 'text' && !element.dataset.type?.endsWith('-shape')) {
          const iconClass =
            document.querySelector(`.stage-icon[data-type="${elementData.type}"] i`)?.className;
          if (iconClass && !element.dataset.type?.endsWith('-shape')) {
            element.innerHTML = `<i class="${iconClass}"></i>`;
          }
          element.setAttribute('contenteditable', 'false');
        } else {
          element.textContent = elementData.content || '';
          element.setAttribute('contenteditable', 'false');
        }

        if (element.dataset.showLabel === '1' || element.dataset.showLabel === 'true') {
          updateElementLabelDisplay(element);
        }

        element.dataset.elementId = `element-${iconCounter++}`;
        workArea.appendChild(element);
        setupElementInteractions(element);
      });
    }
    renderRulers();
  }

  if (newProjectBtn) {
    newProjectBtn.addEventListener('click', () => {
      if (projectConfig.projectName) {
        const shouldSave = confirm('¿Quieres guardar el proyecto actual antes de empezar uno nuevo?');
        if (shouldSave) saveProjectAsBarstage();
      }
      resetApplicationState();
      if (projectInitScreen) projectInitScreen.classList.add('active');
      if (mainNav) mainNav.style.display = 'none';
      body.classList.add('init-screen');
      if (preferencesScreen) preferencesScreen.classList.remove('active');
    });
  }

  // ---------------- Rider preview / serializing tablas ----------------
  function serializeTableToElement(tableEl) {
    if (!tableEl) return document.createElement('div');

    const thead = tableEl.querySelector('thead');
    const tbody = tableEl.querySelector('tbody');
    const newTable = document.createElement('table');
    newTable.className = 'data-table';

    const headerCells = thead ? Array.from(thead.querySelectorAll('th')) : [];
    const lastIndex = headerCells.length > 0 ? headerCells.length - 1 : -1;

    if (thead) {
      const newThead = document.createElement('thead');
      const tr = document.createElement('tr');
      headerCells.forEach((th, idx) => {
        if (idx === lastIndex) return;
        const nth = document.createElement('th');
        const label = (th.dataset && th.dataset.label) ? th.dataset.label : th.textContent.trim();
        nth.textContent = label;
        tr.appendChild(nth);
      });
      newThead.appendChild(tr);
      newTable.appendChild(newThead);
    }

    const newTbody = document.createElement('tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(row => {
        const newRow = document.createElement('tr');
        const cells = Array.from(row.children);
        cells.forEach((td, idx) => {
          if (idx === lastIndex) return;
          const newTd = document.createElement('td');

          const input = td.querySelector('input[type="text"], input[type="color"], .mic-input, .subsnake-name, input[type="number"]');
          const select = td.querySelector('select');
          const checkbox = td.querySelector('input[type="checkbox"]');
          const editable = td.querySelector('[contenteditable="true"]');

          if (input) {
            if (input.type === 'color') {
              const box = document.createElement('span');
              box.className = 'color-box';
              box.style.background = input.value;
              newTd.appendChild(box);
              newTd.appendChild(document.createTextNode(input.value));
            } else {
              newTd.textContent = input.value || input.textContent || '';
            }
          } else if (select) {
            newTd.textContent = select.options[select.selectedIndex]?.text || select.value;
          } else if (checkbox) {
            newTd.textContent = checkbox.checked ? 'Sí' : 'No';
          } else if (editable) {
            newTd.textContent = editable.textContent.trim();
          } else {
            newTd.textContent = td.textContent.trim();
          }

          const computed = window.getComputedStyle(td).backgroundColor;
          if (computed && computed !== 'rgba(0, 0, 0, 0)' && computed !== 'transparent') {
            newTd.style.backgroundColor = computed;
          }

          newRow.appendChild(newTd);
        });
        newTbody.appendChild(newRow);
      });
    }
    newTable.appendChild(newTbody);
    return newTable;
  }

  function buildStaticStageElement(hideGrid = true) {
    const original = document.getElementById('stage-canvas');
    if (!original) return document.createElement('div');

    const parentRect = original.getBoundingClientRect();
    const container = document.createElement('div');
    container.id = 'stage-canvas-static';
    container.style.position = 'relative';
    const w = parentRect.width || 800;
    const h = parentRect.height || 500;
    container.style.width = `${w}px`;
    container.style.height = `${h}px`;
    container.style.boxShadow = 'none';
    container.style.border = '1px solid #222';

    const computedRoot = getComputedStyle(document.documentElement);
    const surface = computedRoot.getPropertyValue('--color-surface') || '#ffffff';
    container.style.background = hideGrid ? surface : (surface + ' url()');
    container.style.backgroundImage = hideGrid ? 'none' : container.style.backgroundImage;

    original.querySelectorAll('.stage-element').forEach(origEl => {
      const comp = window.getComputedStyle(origEl);
      const rect = origEl.getBoundingClientRect();
      const left = parseFloat(origEl.style.left) || (rect.left - parentRect.left);
      const top = parseFloat(origEl.style.top) || (rect.top - parentRect.top);

      const el = document.createElement('div');
      el.className = 'stage-element';
      el.innerHTML = origEl.innerHTML;

      el.style.position = 'absolute';
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${(parseFloat(origEl.style.width) || rect.width)}px`;
      el.style.height = `${(parseFloat(origEl.style.height) || rect.height)}px`;

      el.style.color = comp.color;
      el.style.backgroundColor = comp.backgroundColor;
      el.style.fontSize = comp.fontSize;
      el.style.fontWeight = comp.fontWeight;
      el.style.textAlign = comp.textAlign;
      if (comp.transform && comp.transform !== 'none') {
        el.style.transform = comp.transform;
        el.style.transformOrigin = comp.transformOrigin;
      }
      el.style.zIndex = origEl.style.zIndex || comp.zIndex || 1;
      el.style.borderRadius = comp.borderRadius;
      el.style.border = comp.border;

      el.querySelectorAll('.resizer, .rotator').forEach(n => n.remove());
      const icon = el.querySelector('i');
      if (icon) icon.style.display = 'inline-block';

      const showIndividually =
        origEl.dataset &&
        (origEl.dataset.showLabel === '1' || origEl.dataset.showLabel === 'true');
      if (labelsVisible && showIndividually && origEl.dataset && origEl.dataset.content) {
        const lbl = document.createElement('div');
        lbl.className = 'element-label';
        lbl.textContent = origEl.dataset.content || '';
        lbl.style.position = 'absolute';
        lbl.style.top = '100%';
        lbl.style.left = '50%';
        lbl.style.transform = 'translateX(-50%)';
        lbl.style.fontSize = '0.85em';
        lbl.style.whiteSpace = 'nowrap';
        el.appendChild(lbl);
      }

      container.appendChild(el);
    });

    return container;
  }

  function renderRidersInfoOnly() {
    // por si en el futuro muestras info de metros aquí, ahora mismo no hace nada especial
  }

  function renderRiderPreview() {
    if (!riderPreview) return;
    riderPreview.innerHTML = '';

    const titleSection = document.createElement('div');
    titleSection.className = 'rider-section';
    const hTitle = document.createElement('h1');
    hTitle.textContent =
      riderTitleInput?.value || projectConfig.tourName || 'Título de la Gira';
    hTitle.style.marginBottom = '8px';
    titleSection.appendChild(hTitle);

    if (projectConfig.stageSize) {
      const pSize = document.createElement('div');
      pSize.style.fontSize = '0.9em';
      pSize.style.marginBottom = '6px';
      pSize.textContent = `Tamaño de escenario (referencia): ${projectConfig.stageSize}`;
      titleSection.appendChild(pSize);
    }

    riderPreview.appendChild(titleSection);

    const editorSection = document.createElement('div');
    editorSection.className = 'rider-section';
    editorSection.innerHTML = riderEditor?.innerHTML || '';
    riderPreview.appendChild(editorSection);

    // ---- Plano + nota bajo el plano ----
    const stageWrap = document.createElement('div');
    stageWrap.className = 'rider-section';
    const hStage = document.createElement('h3');
    hStage.textContent = 'Plano (Stage Plot)';
    stageWrap.appendChild(hStage);

    const staticStage = buildStaticStageElement(true);
    stageWrap.appendChild(staticStage);

    if (riderStageNotesInput) {
      const html = riderStageNotesInput.innerHTML.trim();
      const text = riderStageNotesInput.textContent.trim();
      if (text !== '') {
        const noteDiv = document.createElement('div');
        noteDiv.style.marginTop = '6px';
        noteDiv.style.fontStyle = 'italic';
        noteDiv.style.fontSize = '0.9em';
        noteDiv.innerHTML = html;
        stageWrap.appendChild(noteDiv);
      }
    }

    riderPreview.appendChild(stageWrap);

    // Lista de canales
    const inputsWrap = document.createElement('div');
    inputsWrap.className = 'rider-section';
    const hInputs = document.createElement('h3');
    hInputs.textContent = 'Lista de Canales';
    inputsWrap.appendChild(hInputs);
    const serializedInputs = serializeTableToElement(
      document.querySelector('#input-list .data-table')
    );
    inputsWrap.appendChild(serializedInputs);
    riderPreview.appendChild(inputsWrap);

    // Envíos
    const sendsWrap = document.createElement('div');
    sendsWrap.className = 'rider-section';
    const hSends = document.createElement('h3');
    hSends.textContent = 'Envíos';
    sendsWrap.appendChild(hSends);
    const serializedSends = serializeTableToElement(
      document.querySelector('#sends-list .data-table')
    );
    sendsWrap.appendChild(serializedSends);
    riderPreview.appendChild(sendsWrap);

    // FOH
    const fohWrap = document.createElement('div');
    fohWrap.className = 'rider-section';
    const hFoh = document.createElement('h3');
    hFoh.textContent = 'FOH';
    const fohModel = document.getElementById('foh-console-model')?.value || '';
    const fohDetails = document.getElementById('foh-patch-details')?.value || '';
    const pModel = document.createElement('div');
    pModel.innerHTML = `<strong>Modelo de consola:</strong> ${escapeHtml(fohModel)}`;
    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.background = '#f6f6f6';
    pre.style.padding = '10px';
    pre.style.borderRadius = '4px';
    pre.textContent = fohDetails;
    fohWrap.appendChild(hFoh);
    fohWrap.appendChild(pModel);
    fohWrap.appendChild(pre);
    riderPreview.appendChild(fohWrap);
  }

  let previewTimeout = null;
  function scheduleRiderPreview(delay = 200) {
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      renderRiderPreview();
      previewTimeout = null;
    }, delay);
  }
  scheduleRiderPreview(300);

  const configObserver = new MutationObserver(() => {
    scheduleRiderPreview(250);
  });
  if (inputListBody) configObserver.observe(inputListBody, {
    childList: true, subtree: true, attributes: true, characterData: true
  });
  if (sendsListBody) configObserver.observe(sendsListBody, {
    childList: true, subtree: true, attributes: true, characterData: true
  });
  if (stageCanvas) configObserver.observe(stageCanvas, {
    childList: true, subtree: true, attributes: true, characterData: true
  });

  if (riderStageNotesInput) {
    riderStageNotesInput.addEventListener('input', () => {
      scheduleRiderPreview(200);
    });
  }

   // ---------------- Export / Print helpers ----------------
  function exportRiderAsHTML() {
    return new Promise((resolve) => {
      renderRiderPreview();
      const html = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rider - ${escapeHtml(projectConfig.projectName || 'Sin Nombre')}</title>
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
<style>
.rider-section { page-break-inside: avoid; }
.rider-section:not(:last-child) { page-break-after: always; break-after: page; }
</style>
</head>
<body>
<div class="rider-export">
${riderPreview.innerHTML}
</div>
</body>
</html>
`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(projectConfig.projectName || 'rider').replace(/\s/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    });
  }

  function printRider() {
    renderRiderPreview();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('La ventana de impresión fue bloqueada por el navegador. Permite ventanas emergentes para imprimir.');
      return;
    }
    const title = escapeHtml(projectConfig.projectName || 'Rider');
    const content = `
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Imprimir Rider - ${title}</title>
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
<style>
.rider-section { page-break-inside: avoid; break-inside: avoid-column; }
.rider-section:not(:last-child) { page-break-after: always; break-after: page; }
body { -webkit-print-color-adjust: exact; }
.rider-print-wrapper { padding: 8mm; }
.rider-print-wrapper .rider-section { page-break-inside: avoid; margin-bottom: 12px; }
.rider-print-wrapper pre { white-space: pre-wrap; }
</style>
</head>
<body class="${document.body.className}">
<div class="rider-print-wrapper">
${riderPreview.innerHTML}
</div>
<script>
window.addEventListener('load', function() {
  setTimeout(function(){ window.print(); }, 600);
});
</script>
</body>
</html>
`;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
  }

  function exportRiderAsDoc() {
    renderRiderPreview();
    const inputsHTML = serializeTableToElement(
      document.querySelector('#input-list .data-table')
    ).outerHTML;
    const sendsHTML = serializeTableToElement(
      document.querySelector('#sends-list .data-table')
    ).outerHTML;
    const infoHTML =
      `<div><strong>Manager:</strong> ${escapeHtml('')}</div>` +
      `<div><strong>Técnico de Sonido:</strong> ${escapeHtml('')}</div>`;
    const html = `
<html><head><meta charset="utf-8"></head><body>
<h2>Rider - ${escapeHtml(projectConfig.projectName || '')}</h2>
${infoHTML}
<h3>Lista de Canales</h3>
${inputsHTML}
<h3>Envíos</h3>
${sendsHTML}
</body></html>
`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectConfig.projectName || 'rider').replace(/\s/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportRiderAsExcel() {
    renderRiderPreview();
    const inputsHTML = serializeTableToElement(
      document.querySelector('#input-list .data-table')
    ).outerHTML;
    const sendsHTML = serializeTableToElement(
      document.querySelector('#sends-list .data-table')
    ).outerHTML;
    const infoHTML =
      `<div><strong>Manager:</strong> ${escapeHtml('')}</div>` +
      `<div><strong>Técnico de Sonido:</strong> ${escapeHtml('')}</div>`;
    const html = `
<html><head><meta charset="utf-8"></head><body>
<h2>Rider - ${escapeHtml(projectConfig.projectName || '')}</h2>
${infoHTML}
<h3>Lista de Canales</h3>
${inputsHTML}
<h3>Envíos</h3>
${sendsHTML}
</body></html>
`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(projectConfig.projectName || 'rider').replace(/\s/g, '_')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------------- Helpers ----------------
  function escapeHtml(s) {
    if (!s) return '';
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function updateProjectInfoDisplay(config) {
    const hp = document.getElementById('header-project-name');
    const ht = document.getElementById('header-tour-name');
    const hs = document.getElementById('header-stage-size');
    const hc = document.getElementById('header-channels');
    const hsends = document.getElementById('header-sends');
    if (hp) hp.textContent = config.projectName || 'Sin Nombre';
    if (ht) ht.textContent = config.tourName || 'N/A';
    if (hs) hs.textContent = config.stageSize || 'N/A';
    if (hc) hc.textContent = config.numInputChannels || 0;
    if (hsends) hsends.textContent = config.numSends || 0;
  }

  function resetApplicationState() {
    projectConfig = {};
    if (workArea) {
      workArea.innerHTML =
        '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano 800x500)</p>';
    }
    iconCounter = 1;
    if (inputListBody) inputListBody.innerHTML = '';
    if (sendsListBody) sendsListBody.innerHTML = '';
    customIcons.clear();
    subSnakeColorMap.clear();
    inputExtraColumns = [];
    sendExtraColumns = [];
    clearAllSelection();
    updateProjectInfoDisplay(projectConfig);
    if (elementControls) elementControls.style.display = 'none';
    if (configPanel) configPanel.querySelector('.config-placeholder').style.display = 'block';
    tabScreens.forEach(s => s.classList.remove('active'));
    tabButtons.forEach(b => b.classList.remove('active'));
    renderRulers();
    scheduleRiderPreview();
  }

  // Como el tamaño en metros es solo informativo, renderRulers no dibuja nada especial
  function renderRulers() {
    if (!canvasRulers) return;
    canvasRulers.innerHTML = '';
  }

  window.addEventListener('resize', () => {
    renderRulers();
    scheduleRiderPreview();
  });

  // ---------------- Custom icons ----------------
  function refreshCustomIconsInPalette() {
    const customCategory = document.getElementById('category-custom');
    if (!customCategory) return;
    customCategory.querySelectorAll('.stage-icon[data-generated="1"]').forEach(n => n.remove());
    customIcons.forEach((url, key) => {
      const div = document.createElement('div');
      div.className = 'stage-icon';
      div.draggable = true;
      div.dataset.type = key;
      div.dataset.generated = '1';
      div.innerHTML =
        `<img src="${url}" style="max-width:60px; max-height:60px; display:block; margin:0 auto;">${key}`;
      customCategory.appendChild(div);
    });
    attachPaletteDragHandlers();
  }

  if (customIconInput) {
    customIconInput.addEventListener('change', (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const key = `custom-${++customIconCounter}`;
        customIcons.set(key, dataUrl);
        refreshCustomIconsInPalette();
      };
      reader.readAsDataURL(f);
      ev.target.value = '';
    });
  }

  // ---------------- Sincronizar formularios con config ----------------
  function syncPreferencesFormFromConfig() {
    if (!projectPreferencesForm) return;
    const pName = document.getElementById('pref-project-name');
    const pTour = document.getElementById('pref-tour-name');
    const pDate = document.getElementById('pref-date');
    const pSize = document.getElementById('pref-stage-size');
    const pInputs = document.getElementById('pref-input-channels');
    const pSends = document.getElementById('pref-sends-count');

    if (pName)  pName.value  = projectConfig.projectName || '';
    if (pTour)  pTour.value  = projectConfig.tourName || '';
    if (pDate)  pDate.value  = projectConfig.date || '';
    if (pSize)  pSize.value  = projectConfig.stageSize || '';
    if (pInputs)pInputs.value= projectConfig.numInputChannels || 0;
    if (pSends) pSends.value = projectConfig.numSends || 0;
  }

  function syncInitFormFromConfig() {
    const initProjectName  = document.getElementById('project-name');
    const initTourName     = document.getElementById('tour-name');
    const initDate         = document.getElementById('date');
    const initStageSize    = document.getElementById('stage-size');
    const initInputCh      = document.getElementById('input-channels');
    const initSendsCount   = document.getElementById('sends-count');

    if (initProjectName) initProjectName.value = projectConfig.projectName || '';
    if (initTourName)    initTourName.value    = projectConfig.tourName || '';
    if (initDate)        initDate.value        = projectConfig.date || '';
    if (initStageSize)   initStageSize.value   = projectConfig.stageSize || '';
    if (initInputCh)     initInputCh.value     = projectConfig.numInputChannels || 0;
    if (initSendsCount)  initSendsCount.value  = projectConfig.numSends || 0;
  }

  // ---------------- Preferences modal ----------------
  if (preferencesBtn) {
    preferencesBtn.addEventListener('click', () => {
      if (preferencesScreen) preferencesScreen.classList.add('active');
      syncPreferencesFormFromConfig();
    });
  }
  if (closePreferencesBtn) {
    closePreferencesBtn.addEventListener('click', () => {
      if (preferencesScreen) preferencesScreen.classList.remove('active');
    });
  }

  if (projectPreferencesForm) {
    projectPreferencesForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const oldInputs = projectConfig.numInputChannels || 0;
      const oldSends  = projectConfig.numSends || 0;
      const oldTour   = projectConfig.tourName || '';

      const newProjectName =
        document.getElementById('pref-project-name').value;
      const newTourName =
        document.getElementById('pref-tour-name').value;
      const newDate =
        document.getElementById('pref-date').value;
      const newStageSize =
        document.getElementById('pref-stage-size').value;
      const newInputs =
        parseInt(document.getElementById('pref-input-channels').value || 0);
      const newSends =
        parseInt(document.getElementById('pref-sends-count').value || 0);

      const inputsChanged = newInputs !== oldInputs;
      const sendsChanged  = newSends  !== oldSends;

      if (inputsChanged || sendsChanged) {
        let msg = 'Vas a cambiar el número de canales y/o envíos.\n\n';
        msg += '- Se volverán a crear las tablas de canales y envíos.\n';
        msg += '- Se perderán los datos escritos actualmente en esas listas.\n\n';
        msg += '¿Quieres continuar?';
        const confirmed = window.confirm(msg);
        if (!confirmed) return;
      }

      projectConfig.projectName = newProjectName;
      projectConfig.tourName    = newTourName;
      projectConfig.date        = newDate;
      projectConfig.stageSize   = newStageSize;
      projectConfig.numInputChannels = newInputs;
      projectConfig.numSends         = newSends;

      updateProjectInfoDisplay(projectConfig);

      if (inputsChanged) initializeInputList(projectConfig.numInputChannels);
      if (sendsChanged)  initializeSendsList(projectConfig.numSends);

      renderRulers();

      // sincronizar inicio
      syncInitFormFromConfig();

      // sincronizar título de Rider si no está personalizado
      if (riderTitleInput) {
        const currentRiderTitle = riderTitleInput.value.trim();
        if (!currentRiderTitle || currentRiderTitle === oldTour) {
          riderTitleInput.value = newTourName || '';
        }
      }

      scheduleRiderPreview();

      if (preferencesScreen) preferencesScreen.classList.remove('active');
    });
  }

  // Render inicial
  setTimeout(() => {
    renderRulers();
    scheduleRiderPreview();
  }, 250);

  // End DOMContentLoaded
});