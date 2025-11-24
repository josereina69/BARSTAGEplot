// script.js - actualizado para:
// - preservar checkbox "phantom" al arrastrar filas
// - modal de exportación para elegir formato (barstage/html/print/excel/doc)
// - eliminar export JPG
// - exportar Excel/Word solo tablas (sin plano) y en formato tabla
// - forzar saltos de página en impresión (cada sección en página separada)

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

    // Rider preview container
    const riderPreview = document.getElementById('rider-preview');
    const riderContact = document.getElementById('rider-contact');
    const riderSound = document.getElementById('rider-sound');

    // Paleta
    const paletteTabButtons = document.querySelectorAll('.palette-tab-button');
    const paletteCategories = document.querySelectorAll('.palette-category');

    // Estado
    let selectedElement = null;
    let iconCounter = 1;
    let draggedRow = null;

    // Inicialización de tema
    initTheme();
    body.classList.add('init-screen');
    projectInitScreen.classList.add('active');

    // Mostrar rejilla por defecto
    stageCanvas.classList.add('show-grid');
    if (gridToggle) {
        gridToggle.addEventListener('change', () => {
            if (gridToggle.checked) stageCanvas.classList.add('show-grid');
            else stageCanvas.classList.remove('show-grid');
        });
    }

    // ----------------- Navegación y creación de proyecto -----------------
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

        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        body.classList.remove('init-screen');

        initializeInputList(projectConfig.numInputChannels);
        initializeSendsList(projectConfig.numSends);
        updateProjectInfoDisplay(projectConfig);
        activateTab('stage-plot');
    });

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

            // Si entramos a Rider, renderizamos la vista final
            if (tabId === 'rider-menu') {
                renderRiderPreview();
            }
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            activateTab(tabId);
        });
    });

    // --------------- Tema día/noche ---------------
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
    }
    themeToggleButton.addEventListener('click', toggleTheme);
    function initTheme() {
        const saved = localStorage.getItem('theme') || 'day';
        if (saved === 'night') {
            body.classList.add('dark-mode');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i> Día/Noche';
        }
    }

    // ---------------- Data y sugerencias ----------------
    const SUGERENCIAS_MIC = {
        'Voz Principal': [{ name: 'Shure SM58', phantom: false }, { name: 'Sennheiser E935', phantom: false }, { name: 'Shure Beta 58A', phantom: false }, { name: 'Condensador Vocal', phantom: true }],
        'Coro/Backing': [{ name: 'Shure SM58', phantom: false }, { name: 'Sennheiser E835', phantom: false }],
        'Bombo (Kick)': [{ name: 'Shure Beta 52A', phantom: false }, { name: 'AKG D112', phantom: false }, { name: 'Sennheiser E902', phantom: false }],
        'Caja (Snare)': [{ name: 'Shure SM57', phantom: false }, { name: 'Sennheiser E905', phantom: false }, { name: 'Audix i5', phantom: false }],
        'Toms': [{ name: 'Sennheiser E604', phantom: false }, { name: 'Shure Beta 98', phantom: false }],
        'Overhead': [{ name: 'Condensador Pequeño', phantom: true }, { name: 'Condensador Grande', phantom: true }, { name: 'Shure SM81 (Par)', phantom: true }],
        'Bajo (DI)': [{ name: 'DI Activo', phantom: true }, { name: 'DI Pasivo', phantom: false }, { name: 'Radial JDI', phantom: false }, { name: 'Ampli Bajo (Mic)', phantom: false }],
        'Guitarra Eléctrica': [{ name: 'Shure SM57', phantom: false }, { name: 'Sennheiser E906', phantom: false }, { name: 'Royer R-121', phantom: false }],
        'Guitarra Acústica': [{ name: 'DI Acústico', phantom: true }, { name: 'Condensador Pequeño', phantom: true }],
        'Teclado': [{ name: 'DI Estéreo (x2)', phantom: true }, { name: 'DI Mono', phantom: true }],
        'Percusión': [{ name: 'Shure SM57', phantom: false }, { name: 'Condensador Pequeño', phantom: true }],
        'Otro': [{ name: 'SM58', phantom: false }, { name: 'SM57', phantom: false }, { name: 'DI Pasivo', phantom: false }, { name: 'DI Activo', phantom: true }]
    };
    const SUGERENCIAS_STAND = { 'Voz Principal': 'Alto', 'Coro/Backing': 'Alto', 'Bombo (Kick)': 'Pequeño', 'Caja (Snare)': 'Pequeño', 'Toms': 'Pinza', 'Overhead': 'Alto', 'Bajo (DI)': 'Ninguno', 'Guitarra Eléctrica': 'Pequeño', 'Guitarra Acústica': 'Alto', 'Teclado': 'Ninguno', 'Percusión': 'Pequeño', 'Otro': 'Alto' };
    const STAND_OPTIONS = ['Alto', 'Pequeño', 'Base Redonda', 'Recto', 'Pinza', 'Ninguno'];

    // ------------------ Input List / Sends List ------------------
    const addChannelBtn = document.getElementById('add-input-channel-btn');
    const addSendBtn = document.getElementById('add-send-btn');

    function getMicOptions() {
        const suggestedMics = new Set();
        Object.values(SUGERENCIAS_MIC).flat().forEach(mic => suggestedMics.add(mic.name));
        return Array.from(suggestedMics).map(m => `<option value="${m}">`).join('');
    }
    function getStandOptions(currentStand) {
        return STAND_OPTIONS.map(s => `<option value="${s}" ${s === currentStand ? 'selected' : ''}>${s}</option>`).join('');
    }

    function createChannelRow(channelNumber, channelData = null) {
        const row = document.createElement('tr');
        row.draggable = true;
        const isLoad = channelData !== null;
        const defaultName = isLoad ? channelData.name : `Canal ${channelNumber}`;
        const categoryForSuggestions = Object.keys(SUGERENCIAS_MIC).find(k => defaultName.toLowerCase().includes(k.toLowerCase())) || 'Otro';
        const micSuggestions = SUGERENCIAS_MIC[categoryForSuggestions] || SUGERENCIAS_MIC['Otro'];
        const defaultMicName = isLoad ? channelData.mic : (micSuggestions.length > 0 ? micSuggestions[0].name : '');
        const defaultPhantomChecked = isLoad ? channelData.phantom : (micSuggestions.length > 0 ? micSuggestions[0].phantom : false);
        const defaultStand = isLoad ? channelData.stand : SUGERENCIAS_STAND[categoryForSuggestions];
        const defaultStandOptions = getStandOptions(defaultStand);
        const defaultSubSnakeName = isLoad ? channelData.subSnake : 'SS1';
        const defaultSubSnakeColor = isLoad ? channelData.subSnakeColor : '#ffffff';
        const defaultNotes = isLoad ? channelData.notes : '';

        // ensure datalist exists
        let micDatalist = document.getElementById('mic-datalist');
        if (!micDatalist) {
            micDatalist = document.createElement('datalist');
            micDatalist.id = 'mic-datalist';
            document.body.appendChild(micDatalist);
        }
        micDatalist.innerHTML = getMicOptions();

        row.innerHTML = `
            <td data-label="Ch" contenteditable="true">${channelNumber}</td>
            <td data-label="Nombre de canal" contenteditable="true">${defaultName}</td>
            <td data-label="Mic/DI">
                <input type="text" value="${defaultMicName}" class="mic-input" list="mic-datalist" placeholder="Escribe o selecciona un Mic/DI">
            </td>
            <td data-label="Phantom"><input type="checkbox" ${defaultPhantomChecked ? 'checked' : ''} class="phantom-checkbox"></td>
            <td data-label="Pie">
                <select class="stand-select">${defaultStandOptions}</select>
            </td>
            <td data-label="Sub-Snake" class="subsnake-cell" style="background-color: ${defaultSubSnakeColor};">
                <input type="text" value="${defaultSubSnakeName}" class="subsnake-name">
                <input type="color" value="${defaultSubSnakeColor}" class="subsnake-color-picker">
            </td>
            <td data-label="Notas" contenteditable="true">${defaultNotes}</td>
            <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
        `;

        // behavior
        const nameCell = row.children[1];
        const micInput = row.querySelector('.mic-input');
        const standSelect = row.querySelector('.stand-select');
        const phantomCheckbox = row.querySelector('.phantom-checkbox');

        nameCell.addEventListener('blur', () => {
            const newName = nameCell.textContent.trim();
            if (newName) {
                const category = Object.keys(SUGERENCIAS_MIC).find(key => newName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
                const micSuggestionsLocal = SUGERENCIAS_MIC[category];
                if (micSuggestionsLocal && micSuggestionsLocal.length > 0) {
                    micInput.value = micSuggestionsLocal[0].name;
                    phantomCheckbox.checked = micSuggestionsLocal[0].phantom;
                }
                const suggestedStand = SUGERENCIAS_STAND[category];
                standSelect.innerHTML = getStandOptions(suggestedStand);
            }
            updateRowDisplay(row);
            scheduleRiderPreview();
        });

        micInput.addEventListener('input', () => {
            updateRowDisplay(row);
            scheduleRiderPreview();
        });
        phantomCheckbox.addEventListener('change', () => {
            updateRowDisplay(row);
            scheduleRiderPreview();
        });

        const subSnakeColorPicker = row.querySelector('.subsnake-color-picker');
        const subSnakeCell = row.querySelector('.subsnake-cell');
        subSnakeColorPicker.addEventListener('input', (e) => {
            subSnakeCell.style.backgroundColor = e.target.value;
            scheduleRiderPreview();
        });

        setupDragAndDrop(row);
        updateRowDisplay(row);

        return row;
    }

    function updateRowDisplay(row) {
        const micInput = row.querySelector('.mic-input');
        const phantomCheckbox = row.querySelector('.phantom-checkbox');
        const phantomCell = row.children[3];
        const standSelect = row.querySelector('.stand-select');

        const micValue = micInput.value.trim().toLowerCase();

        if (phantomCheckbox.checked) {
            phantomCell.classList.add('phantom-active');
            phantomCell.style.border = '1px solid var(--color-border)';
            phantomCell.style.padding = '10px';
        } else {
            phantomCell.classList.remove('phantom-active');
            phantomCell.style.border = '1px solid var(--color-border)';
            phantomCell.style.padding = '10px';
        }

        const nameCell = row.children[1];
        const currentName = nameCell.textContent.trim();
        const category = Object.keys(SUGERENCIAS_STAND).find(key => currentName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
        const suggestedStand = SUGERENCIAS_STAND[category];

        if (micValue.includes('di') && micValue.length > 2) {
            if (standSelect.value !== 'Ninguno') {
                standSelect.innerHTML = getStandOptions('Ninguno');
            }
        } else {
            const standToKeep = standSelect.value === 'Ninguno' ? suggestedStand : standSelect.value;
            if (standSelect.value !== standToKeep) {
                standSelect.innerHTML = getStandOptions(standToKeep);
            }
        }
    }

    function initializeInputList(count) {
        inputListBody.innerHTML = '';
        for (let i = 1; i <= count; i++) inputListBody.appendChild(createChannelRow(i));
        updateChannelNumbers();
        scheduleRiderPreview();
    }

    function loadInputList(channelsData) {
        inputListBody.innerHTML = '';
        if (channelsData && channelsData.length) {
            channelsData.forEach((ch, idx) => inputListBody.appendChild(createChannelRow(idx + 1, ch)));
        }
        updateChannelNumbers();
        scheduleRiderPreview();
    }

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

        const optionsHTML = SEND_TYPE_OPTIONS.map(t => `<option value="${t}" ${t === defaultType ? 'selected' : ''}>${t}</option>`).join('');

        row.innerHTML = `
            <td data-label="Send" contenteditable="true">${sendNumber}</td>
            <td data-label="Nombre" contenteditable="true">${defaultName}</td>
            <td data-label="Tipo"><select class="send-type-select">${optionsHTML}</select></td>
            <td data-label="Mix" contenteditable="true">${defaultMix}</td>
            <td data-label="EQ/FX" contenteditable="true">${defaultEQFX}</td>
            <td data-label="Notas" contenteditable="true">${defaultNotes}</td>
            <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
        `;

        setupDragAndDrop(row, true);
        scheduleRiderPreview();
        return row;
    }

    function initializeSendsList(count) {
        sendsListBody.innerHTML = '';
        for (let i = 1; i <= count; i++) sendsListBody.appendChild(createSendRow(i));
        updateSendNumbers();
        scheduleRiderPreview();
    }

    function loadSendsList(sendsData) {
        sendsListBody.innerHTML = '';
        if (sendsData && sendsData.length) {
            sendsData.forEach((s, idx) => sendsListBody.appendChild(createSendRow(idx + 1, s)));
        }
        updateSendNumbers();
        scheduleRiderPreview();
    }

    addChannelBtn.addEventListener('click', () => {
        const currentCount = inputListBody.querySelectorAll('tr').length;
        inputListBody.appendChild(createChannelRow(currentCount + 1));
        updateChannelNumbers();
        scheduleRiderPreview();
    });

    function updateChannelNumbers() {
        const rows = inputListBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numCell = row.children[0];
            numCell.textContent = index + 1;
            const deleteBtn = row.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.onclick = () => { row.remove(); updateChannelNumbers(); scheduleRiderPreview(); };
        });
        projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
        updateProjectInfoDisplay(projectConfig);
    }

    addSendBtn.addEventListener('click', () => {
        const currentCount = sendsListBody.querySelectorAll('tr').length;
        sendsListBody.appendChild(createSendRow(currentCount + 1));
        updateSendNumbers();
        scheduleRiderPreview();
    });

    function updateSendNumbers() {
        const rows = sendsListBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numCell = row.children[0];
            numCell.textContent = index + 1;
            const deleteBtn = row.querySelector('.delete-btn');
            if (deleteBtn) deleteBtn.onclick = () => { row.remove(); updateSendNumbers(); scheduleRiderPreview(); };
        });
        projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;
        updateProjectInfoDisplay(projectConfig);
    }

    // ---------------- Drag & Drop para filas ----------------
    function setupDragAndDrop(row, isSendList = false) {
        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            row.classList.add('dragging');
            // Para navegadores que requieren dataTransfer.setData en dragstart
            try { e.dataTransfer.setData('text/plain', 'drag-row'); } catch (err) {}
            // Guardar estado phantom para restaurarlo después del drop (protege contra posibles pérdidas)
            const phantomCheckbox = row.querySelector('.phantom-checkbox');
            if (phantomCheckbox) row.dataset._phantomChecked = phantomCheckbox.checked ? '1' : '0';
            e.dataTransfer.effectAllowed = 'move';
        });
        row.addEventListener('dragenter', (e) => { e.preventDefault(); if (draggedRow !== row) row.classList.add('drag-over'); });
        row.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', () => {
            row.classList.remove('drag-over');
            if (draggedRow && draggedRow !== row) {
                const parent = row.parentNode;
                const draggingIndex = Array.from(parent.children).indexOf(draggedRow);
                const targetIndex = Array.from(parent.children).indexOf(row);
                if (draggingIndex > targetIndex) parent.insertBefore(draggedRow, row);
                else parent.insertBefore(draggedRow, row.nextSibling);

                // Restaurar estado phantom si lo tenía
                const cb = draggedRow.querySelector('.phantom-checkbox');
                if (cb && draggedRow.dataset._phantomChecked !== undefined) {
                    cb.checked = draggedRow.dataset._phantomChecked === '1';
                }

                if (isSendList) updateSendNumbers(); else updateChannelNumbers();
                scheduleRiderPreview();
            }
        });
        row.addEventListener('dragend', () => { if (draggedRow) draggedRow.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); draggedRow = null; });
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

            // Reattach dragstart handlers in case new category content was dynamically added
            document.querySelectorAll('.stage-icon').forEach(icon => {
                icon.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', icon.dataset.type);
                    e.dataTransfer.effectAllowed = 'move';
                });
            });
        });
    });

    // Attach dragstart to palette items (initial)
    document.querySelectorAll('.stage-icon').forEach(icon => {
        icon.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', icon.dataset.type);
            e.dataTransfer.effectAllowed = 'move';
        });
    });

    stageCanvas.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });

    stageCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type) return;
        const canvasRect = stageCanvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;

        const draggedElement = document.createElement('div');
        draggedElement.className = 'stage-element';
        draggedElement.dataset.type = type;

        const sourceIcon = document.querySelector(`.stage-icon[data-type="${type}"]`);
        const iconHtml = sourceIcon?.querySelector('i')?.outerHTML || '';
        const iconText = sourceIcon?.textContent.trim() || '';

        draggedElement.innerHTML = `${iconHtml} ${iconText}`;
        draggedElement.style.left = `${x}px`;
        draggedElement.style.top = `${y}px`;
        draggedElement.style.zIndex = '10';
        draggedElement.dataset.rotation = '0';
        draggedElement.dataset.scale = '1.0';
        draggedElement.dataset.elementId = `element-${iconCounter++}`;

        if (draggedElement.dataset.type.endsWith('-shape')) {
            draggedElement.style.backgroundColor = 'rgba(128,128,128,0.5)';
            draggedElement.style.width = '100px';
            draggedElement.style.height = '100px';
            draggedElement.innerHTML = '';
            if (draggedElement.dataset.type === 'circle-shape') draggedElement.classList.add('shape-circle');
            else if (draggedElement.dataset.type === 'line-shape') { draggedElement.style.width = '150px'; draggedElement.style.height = '5px'; draggedElement.classList.add('shape-square'); draggedElement.style.borderRadius = '0'; }
            else draggedElement.classList.add('shape-square');
        } else if (draggedElement.dataset.type === 'text') {
            draggedElement.style.width = 'fit-content';
            draggedElement.style.height = 'fit-content';
            draggedElement.style.backgroundColor = 'transparent';
            draggedElement.style.border = 'none';
            draggedElement.innerHTML = 'Etiqueta';
            draggedElement.style.padding = '2px 5px';
            draggedElement.setAttribute('contenteditable', 'false');
            draggedElement.style.fontSize = '1.0em';
        } else {
            draggedElement.style.backgroundColor = 'transparent';
            draggedElement.style.color = 'var(--color-text)';
            draggedElement.style.padding = '5px';
            draggedElement.style.width = 'fit-content';
            draggedElement.style.height = 'fit-content';
            draggedElement.style.fontSize = '1.0em';
        }

        stageCanvas.appendChild(draggedElement);
        setupElementInteractions(draggedElement);
        selectElement(draggedElement);

        const placeholder = stageCanvas.querySelector('.canvas-placeholder');
        if (placeholder) placeholder.remove();

        scheduleRiderPreview();
    });

    // ---------------- Interacción con elementos del plano ----------------
    function getElementTextContent(element) {
        if (element.dataset.type === 'text') return element.textContent.trim();
        const icon = element.querySelector('i');
        let textContent = element.textContent.trim();
        if (icon) textContent = textContent.replace(icon.textContent, '').trim();
        return textContent;
    }
    function setElementTextContent(element, newText) {
        newText = newText || '';
        if (element.dataset.type === 'text') { element.textContent = newText; return; }
        const type = element.dataset.type;
        const sourceIcon = document.querySelector(`.stage-icon[data-type="${type}"]`);
        const iconHtml = sourceIcon?.querySelector('i')?.outerHTML || '';
        element.innerHTML = '';
        if (iconHtml) { element.innerHTML = `${iconHtml} ${newText}`; const icon = element.querySelector('i'); if (icon) icon.style.display = 'inline-block'; }
        else element.textContent = newText;
        element.setAttribute('contenteditable', 'false');
    }

    function setupElementInteractions(element) {
        let isDragging = false;
        let offset = { x: 0, y: 0 };

        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resizer') || e.target.classList.contains('rotator')) return;
            e.stopPropagation();
            if (selectedElement !== element) selectElement(element);
            if (element.getAttribute('contenteditable') === 'true' && element === document.activeElement) return;
            isDragging = true;
            element.classList.add('dragging');

            if (!element.dataset.type.endsWith('-shape') && element.dataset.type !== 'text') {
                if (element.style.width === '' || element.dataset.wasResized !== 'true') {
                    element.style.width = 'fit-content';
                    element.style.height = 'fit-content';
                }
            }

            const style = window.getComputedStyle(element);
            const currentX = parseFloat(style.left) || parseFloat(element.style.left) || 0;
            const currentY = parseFloat(style.top) || parseFloat(element.style.top) || 0;
            offset.x = e.clientX - currentX;
            offset.y = e.clientY - currentY;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const newX = e.clientX - offset.x;
            const newY = e.clientY - offset.y;
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) { isDragging = false; element.classList.remove('dragging'); scheduleRiderPreview(); }
        });

        element.addEventListener('click', (e) => e.stopPropagation());

        if (!element.dataset.type.endsWith('-shape')) {
            element.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                selectElement(element);
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
            }
            scheduleRiderPreview();
        });

        if (element.dataset.type === 'text') element.setAttribute('contenteditable', 'false');
    }

    function selectElement(element) {
        deselectElement();
        selectedElement = element;
        selectedElement.classList.add('selected');
        addTransformationHandles(element);
        elementControls.style.display = 'block';
        configPanel.querySelector('.config-placeholder').style.display = 'none';
        updateConfigPanel(element);
    }

    function deselectElement() {
        if (!selectedElement) return;
        selectedElement.classList.remove('selected');
        selectedElement.querySelectorAll('.resizer, .rotator').forEach(h => h.remove());
        if (selectedElement.dataset.type !== 'text') selectedElement.setAttribute('contenteditable', 'false');
        const icon = selectedElement.querySelector('i'); if (icon) icon.style.display = 'inline-block';
        selectedElement = null;
        elementControls.style.display = 'none';
        configPanel.querySelector('.config-placeholder').style.display = 'block';
    }

    function addTransformationHandles(element) {
        if (element.style.width === 'fit-content') element.style.width = `${element.offsetWidth}px`;
        if (element.style.height === 'fit-content') element.style.height = `${element.offsetHeight}px`;
        const resizerBR = document.createElement('div'); resizerBR.className = 'resizer bottom-right'; element.appendChild(resizerBR);
        const rotator = document.createElement('div'); rotator.className = 'rotator'; element.appendChild(rotator);
        setupResizing(element, resizerBR);
        setupRotation(element, rotator);
        updateConfigPanel(element);
    }

    function setupResizing(element, handle) {
        let isResizing = false, startX, startY, startWidth, startHeight, startScale;
        const isShape = element.dataset.type.endsWith('-shape');
        const isIconOrText = !isShape;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation(); e.preventDefault();
            isResizing = true;
            startX = e.clientX; startY = e.clientY;
            if (isIconOrText) {
                startWidth = element.offsetWidth; startHeight = element.offsetHeight;
                element.style.width = `${startWidth}px`; element.style.height = `${startHeight}px`;
                startScale = parseFloat(element.dataset.scale) || 1.0;
            } else {
                startWidth = parseFloat(element.style.width) || element.offsetWidth;
                startHeight = parseFloat(element.style.height) || element.offsetHeight;
            }
            element.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            e.preventDefault();
            const dx = e.clientX - startX, dy = e.clientY - startY;
            let newWidth = Math.max(20, startWidth + dx), newHeight = Math.max(20, startHeight + dy);
            if (isShape) {
                element.style.width = `${newWidth}px`; element.style.height = `${newHeight}px`;
            } else {
                const delta = Math.abs(dx) > Math.abs(dy) ? dx / startWidth : dy / startHeight;
                const newScale = startScale * (1 + delta);
                const finalScale = Math.max(0.5, Math.min(5.0, newScale));
                if (Math.abs(finalScale - startScale) > 0.01) { element.style.fontSize = `${finalScale}em`; element.dataset.scale = finalScale.toFixed(2); }
                element.style.width = 'fit-content'; element.style.height = 'fit-content';
            }
            element.dataset.wasResized = 'true';
            scheduleRiderPreview();
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) { isResizing = false; element.classList.remove('dragging'); if (!isShape) { element.style.width = 'fit-content'; element.style.height = 'fit-content'; } scheduleRiderPreview(); }
        });
    }

    function setupRotation(element, handle) {
        let isRotating = false;
        handle.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); isRotating = true; element.classList.add('dragging'); });
        document.addEventListener('mousemove', (e) => {
            if (!isRotating) return; e.preventDefault();
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
            const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            let angleDeg = angleRad * (180 / Math.PI) + 90;
            angleDeg = Math.round(angleDeg / 45) * 45;
            if (angleDeg < 0) angleDeg += 360;
            const currentSize = element.dataset.scale || '1.0';
            let transformValue = `rotate(${angleDeg}deg)`;
            if (element.dataset.type.endsWith('-shape') && element.dataset.type !== 'line-shape') transformValue += ` scale(${currentSize})`;
            element.style.transform = transformValue;
            element.dataset.rotation = angleDeg;
            scheduleRiderPreview();
        });
        document.addEventListener('mouseup', () => { if (isRotating) { isRotating = false; element.classList.remove('dragging'); scheduleRiderPreview(); } });
    }

    function updateConfigPanel(element) {
        if (!element) return;
        elementControls.style.display = 'block';
        configPanel.querySelector('.config-placeholder').style.display = 'none';
        const currentBackgroundColor = element.style.backgroundColor || 'transparent';
        const isShape = element.dataset.type.endsWith('-shape');
        const colorToDisplay = isShape ? (currentBackgroundColor === 'transparent' ? '#007bff' : currentBackgroundColor) : (element.style.color || '#007bff');

        const currentShape = element.classList.contains('shape-circle') ? 'circle' : (element.dataset.type === 'line-shape' ? 'line' : (currentBackgroundColor !== 'transparent' && element.dataset.type.endsWith('-shape') ? 'square' : 'none'));
        const currentZIndex = element.style.zIndex || 10;

        const elementText = getElementTextContent(element);
        elementNameInput.value = elementText;
        selectedElementTitle.textContent = elementText || 'Elemento Seleccionado';
        elementNameInput.oninput = () => { setElementTextContent(element, elementNameInput.value); selectedElementTitle.textContent = elementNameInput.value || 'Elemento Seleccionado'; scheduleRiderPreview(); };

        colorPicker.value = rgbToHex(colorToDisplay);
        colorPicker.oninput = () => {
            if (isShape) { element.style.backgroundColor = colorPicker.value; element.style.color = 'var(--color-text)'; }
            else { element.style.color = colorPicker.value; element.style.backgroundColor = 'transparent'; }
            scheduleRiderPreview();
        };

        shapeSelector.value = currentShape === 'none' ? 'square' : currentShape;
        shapeSelector.onchange = () => {
            element.classList.remove('shape-square', 'shape-circle');
            if (element.dataset.type.endsWith('-shape') || element.style.backgroundColor !== 'transparent') {
                if (shapeSelector.value === 'line') element.style.borderRadius = '0';
                else { element.classList.add(`shape-${shapeSelector.value}`); element.style.borderRadius = ''; }
            }
            scheduleRiderPreview();
        };

        zIndexSelector.value = currentZIndex;
        zIndexSelector.oninput = () => { element.style.zIndex = zIndexSelector.value; scheduleRiderPreview(); };

        const currentScale = element.dataset.scale || 1.0;
        document.getElementById('scale-selector').value = currentScale;
        document.getElementById('scale-selector').oninput = (e) => {
            const newScale = e.target.value;
            if (isShape) { if (element.dataset.type !== 'line-shape') element.style.transform = `rotate(${element.dataset.rotation || 0}deg) scale(${newScale})`; }
            else { element.style.fontSize = `${newScale}em`; element.style.transform = `rotate(${element.dataset.rotation || 0}deg)`; }
            element.dataset.scale = newScale;
            scheduleRiderPreview();
        };

        deleteElementBtn.onclick = () => {
            element.remove();
            deselectElement();
            if (stageCanvas.children.length === 0) stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
            scheduleRiderPreview();
        };
    }

    // helper: convert rgb/rgba or hex strings to hex for input[type=color]
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

    // Deselección global / atajos
    document.addEventListener('click', (e) => {
        if (selectedElement && selectedElement.getAttribute('contenteditable') === 'true' && selectedElement.contains(e.target)) return;
        if (e.target.closest('#element-config-panel') || e.target.closest('.resizer') || e.target.closest('.rotator')) return;
        if (!selectedElement || selectedElement.contains(e.target) || e.target === stageCanvas) return;
        if (!e.target.closest('.stage-element')) deselectElement();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (selectedElement && selectedElement.getAttribute('contenteditable') === 'true') selectedElement.blur();
            deselectElement();
        }

        const isDeleteOrBackspace = (e.key === 'Delete' || e.key === 'Backspace');
        if (isDeleteOrBackspace) {
            const activeElement = document.activeElement;
            const isEditingText = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable === true);
            if (isEditingText) return;
            if (selectedElement) {
                e.preventDefault();
                selectedElement.remove();
                deselectElement();
                if (stageCanvas.children.length === 0) stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
                scheduleRiderPreview();
            }
        }
    });

    // ---------------- Guardar / Cargar proyecto ----------------
    function collectStageElements() {
        const elements = [];
        stageCanvas.querySelectorAll('.stage-element').forEach(element => {
            let widthToSave = element.style.width === 'fit-content' ? element.offsetWidth : parseFloat(element.style.width);
            let heightToSave = element.style.height === 'fit-content' ? element.offsetHeight : parseFloat(element.style.height);
            elements.push({
                type: element.dataset.type,
                x: parseFloat(element.style.left) || 0,
                y: parseFloat(element.style.top) || 0,
                width: widthToSave,
                height: heightToSave,
                color: element.style.color || '',
                backgroundColor: element.style.backgroundColor || '',
                zIndex: element.style.zIndex,
                rotation: element.dataset.rotation,
                scale: element.dataset.scale,
                content: getElementTextContent(element),
                class: Array.from(element.classList).filter(c => c !== 'stage-element' && c !== 'selected' && c !== 'dragging' && c !== 'shape-square' && c !== 'shape-circle').join(' '),
                isCircle: element.classList.contains('shape-circle'),
                wasResized: element.dataset.wasResized === 'true'
            });
        });
        return elements;
    }

    function collectInputList() {
        const channels = [];
        inputListBody.querySelectorAll('tr').forEach(row => {
            const cells = row.children;
            const subSnakeCell = row.querySelector('.subsnake-cell');
            channels.push({
                ch: parseInt(cells[0].textContent),
                name: cells[1].textContent.trim(),
                mic: row.querySelector('.mic-input').value,
                phantom: row.querySelector('.phantom-checkbox').checked,
                stand: row.querySelector('.stand-select').value,
                subSnake: row.querySelector('.subsnake-name').value,
                subSnakeColor: subSnakeCell.style.backgroundColor || '#FFFFFF',
                notes: cells[6].textContent.trim()
            });
        });
        return channels;
    }

    function collectSendsList() {
        const sends = [];
        sendsListBody.querySelectorAll('tr').forEach(row => {
            const cells = row.children;
            sends.push({
                send: parseInt(cells[0].textContent),
                type: row.querySelector('.send-type-select')?.value || '',
                name: cells[1].textContent.trim(),
                mix: cells[3].textContent.trim(),
                eqfx: cells[4].textContent.trim(),
                notes: cells[5].textContent.trim()
            });
        });
        return sends;
    }

    function saveProjectAsBarstage() {
        if (!projectConfig.projectName) { alert('Por favor, nombra el proyecto antes de guardar.'); return; }
        projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
        projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;
        const projectData = { config: projectConfig, stageElements: collectStageElements(), inputList: collectInputList(), sendsList: collectSendsList() };
        const dataStr = JSON.stringify(projectData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${projectConfig.projectName.replace(/\s/g, '_')}.barstage`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        alert(`Proyecto "${projectConfig.projectName}" guardado!`);
    }

    // Assign save/load buttons
    if (saveProjectBtn) saveProjectBtn.addEventListener('click', saveProjectAsBarstage);
    if (loadProjectBtn) {
        loadProjectBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.accept = '.barstage, .json'; fileInput.click();
            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const loadedData = JSON.parse(e.target.result);
                        loadProject(loadedData);
                        alert(`Proyecto "${loadedData.config.projectName}" cargado exitosamente.`);
                    } catch (error) { console.error("Error al parsear JSON:", error); alert('Error al leer el archivo. Asegúrate de que sea un archivo de proyecto (.barstage o .json) válido.'); }
                    event.target.value = '';
                };
                reader.readAsText(file);
            });
        });
    }

    // ---------------- Export: modal selector en vez de prompt ----------------
    async function askExportFormat() {
        return new Promise((resolve) => {
            // Overlay
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
            if (fmt === 'barstage') {
                saveProjectAsBarstage();
            } else if (fmt === 'html') {
                await exportRiderAsHTML();
            } else if (fmt === 'print') {
                printRider();
            } else if (fmt === 'excel') {
                exportRiderAsExcel(); // tablas sólo
            } else if (fmt === 'doc') {
                exportRiderAsDoc(); // tablas sólo
            } else {
                alert('Formato no reconocido.');
            }
        });
    }
    if (printRiderBtn) printRiderBtn.addEventListener('click', printRider);

    function loadProject(data) {
        resetApplicationState();
        projectConfig = data.config || {};
        loadInputList(data.inputList || []);
        loadSendsList(data.sendsList || []);
        loadStageElements(data.stageElements || []);
        updateProjectInfoDisplay(projectConfig);
        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        body.classList.remove('init-screen');
        activateTab('stage-plot');
        scheduleRiderPreview();
    }

    function loadStageElements(elementsData) {
        stageCanvas.innerHTML = '';
        if (elementsData && elementsData.length > 0) {
            elementsData.forEach(elementData => {
                const element = document.createElement('div');
                element.className = `stage-element ${elementData.class || ''}`;
                element.dataset.type = elementData.type;
                element.style.left = `${elementData.x || 0}px`;
                element.style.top = `${elementData.y || 0}px`;

                if (elementData.width) element.style.width = `${elementData.width}px`;
                if (elementData.height) element.style.height = `${elementData.height}px`;
                if (!element.dataset.type.endsWith('-shape')) { element.style.width = 'fit-content'; element.style.height = 'fit-content'; }

                element.style.color = elementData.color || 'var(--color-text)';
                element.style.backgroundColor = elementData.backgroundColor || 'transparent';
                element.style.zIndex = elementData.zIndex || '';
                const sizeValue = elementData.scale || '1.0';
                if (element.dataset.type === 'line-shape') element.style.transform = `rotate(${elementData.rotation || 0}deg)`;
                else if (element.dataset.type.endsWith('-shape')) element.style.transform = `rotate(${elementData.rotation || 0}deg) scale(${sizeValue})`;
                else { element.style.fontSize = `${sizeValue}em`; element.style.transform = `rotate(${elementData.rotation || 0}deg)`; }
                element.dataset.rotation = elementData.rotation;
                element.dataset.scale = sizeValue;
                element.dataset.wasResized = elementData.wasResized ? 'true' : 'false';
                if (elementData.isCircle) element.classList.add('shape-circle'); else if (element.dataset.type.endsWith('-shape')) element.classList.add('shape-square');
                if (element.dataset.type !== 'text') {
                    const iconClass = document.querySelector(`.stage-icon[data-type="${elementData.type}"] i`)?.className;
                    if (iconClass && !element.dataset.type.endsWith('-shape')) element.innerHTML = `<i class="${iconClass}"></i> ${elementData.content}`;
                    else element.textContent = elementData.content || '';
                    element.setAttribute('contenteditable', 'false');
                } else {
                    element.textContent = elementData.content || '';
                    element.setAttribute('contenteditable', 'false');
                }
                element.dataset.elementId = `element-${iconCounter++}`;
                stageCanvas.appendChild(element);
                setupElementInteractions(element);
            });
        } else {
            stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
        }
    }

    if (newProjectBtn) {
        newProjectBtn.addEventListener('click', () => {
            if (projectConfig.projectName) {
                const shouldSave = confirm('¿Quieres guardar el proyecto actual antes de empezar uno nuevo?');
                if (shouldSave) saveProjectAsBarstage();
            }
            resetApplicationState();
            projectInitScreen.classList.add('active');
            mainNav.style.display = 'none';
            body.classList.add('init-screen');
            if (preferencesScreen) preferencesScreen.classList.remove('active');
        });
    }

    // ----------------- RIDER PREVIEW -----------------
    function serializeTableToElement(tableEl) {
        if (!tableEl) return document.createElement('div');

        const thead = tableEl.querySelector('thead');
        const tbody = tableEl.querySelector('tbody');
        const newTable = document.createElement('table');
        newTable.className = 'data-table';

        // Determinar índice de la última columna (Eliminar) para ocultarla en la vista final
        const headerCells = thead ? Array.from(thead.querySelectorAll('th')) : [];
        const lastIndex = headerCells.length > 0 ? headerCells.length - 1 : -1;

        if (thead) {
            const newThead = document.createElement('thead');
            const tr = document.createElement('tr');
            headerCells.forEach((th, idx) => {
                if (idx === lastIndex) return; // ocultar columna eliminar
                const nth = document.createElement('th');
                nth.textContent = th.textContent.trim();
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
                    if (idx === lastIndex) return; // omitir columna eliminar
                    const newTd = document.createElement('td');

                    // Obtener valor de inputs/select/checkbox dentro de la celda
                    const input = td.querySelector('input[type="text"], input[type="color"], .mic-input, .subsnake-name');
                    const select = td.querySelector('select');
                    const checkbox = td.querySelector('input[type="checkbox"]');
                    let cellContent = '';

                    if (input) {
                        if (input.type === 'color') {
                            const box = document.createElement('span');
                            box.style.display = 'inline-block';
                            box.style.width = '14px';
                            box.style.height = '14px';
                            box.style.verticalAlign = 'middle';
                            box.style.marginRight = '6px';
                            box.style.background = input.value;
                            box.style.border = '1px solid #ccc';
                            box.style.borderRadius = '3px';
                            newTd.appendChild(box);
                            newTd.appendChild(document.createTextNode(input.value));
                        } else {
                            newTd.textContent = input.value || input.textContent || '';
                        }
                    } else if (select) {
                        newTd.textContent = select.options[select.selectedIndex]?.text || select.value;
                    } else if (checkbox) {
                        newTd.textContent = checkbox.checked ? 'Sí' : 'No';
                    } else {
                        newTd.textContent = td.textContent.trim();
                    }

                    // Mantener background color computado (e.g., Sub-Snake)
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

    // Construye una representación estática del canvas/clon del stage sin rejilla
    function buildStaticStageElement(hideGrid = true) {
        const original = document.getElementById('stage-canvas');
        if (!original) return document.createElement('div');

        const parentRect = original.getBoundingClientRect();
        const container = document.createElement('div');
        container.id = 'stage-canvas-static';
        container.style.position = 'relative';
        container.style.width = Math.min(900, parentRect.width || 800) + 'px';
        container.style.height = (parentRect.height || 500) + 'px';
        container.style.boxShadow = 'none';
        container.style.border = '1px solid #ccc';

        const computedRoot = getComputedStyle(document.documentElement);
        const surface = computedRoot.getPropertyValue('--color-surface') || '#ffffff';
        container.style.background = hideGrid ? surface : (surface + ' url()');
        container.style.backgroundImage = hideGrid ? 'none' : container.style.backgroundImage;

        // clone each stage element with inline computed styles
        original.querySelectorAll('.stage-element').forEach(origEl => {
            const comp = window.getComputedStyle(origEl);
            const rect = origEl.getBoundingClientRect();
            const left = parseFloat(origEl.style.left) || (rect.left - parentRect.left);
            const top = parseFloat(origEl.style.top) || (rect.top - parentRect.top);

            const el = document.createElement('div');
            el.className = 'stage-element';

            if (origEl.classList.contains('shape-circle') || origEl.classList.contains('shape-square') || origEl.dataset.type?.endsWith('-shape')) {
                el.textContent = origEl.textContent || '';
            } else {
                el.innerHTML = origEl.innerHTML;
            }

            el.style.position = 'absolute';
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;

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

            el.querySelectorAll('.resizer, .rotator').forEach(n => n.remove());
            const icon = el.querySelector('i'); if (icon) icon.style.display = 'inline-block';

            container.appendChild(el);
        });

        return container;
    }

    // Renderiza la vista final dentro de #rider-preview
    function renderRiderPreview() {
        if (!riderPreview) return;
        riderPreview.innerHTML = '';

        // Rider info (editable content)
        const riderInfo = document.createElement('div');
        riderInfo.className = 'rider-section';
        const hRider = document.createElement('h3'); hRider.textContent = 'Rider / Contacto';
        const p1 = document.createElement('div'); p1.innerHTML = `<strong>Manager:</strong> ${escapeHtml(riderContact.textContent.trim() || '')}`;
        const p2 = document.createElement('div'); p2.innerHTML = `<strong>Técnico de Sonido:</strong> ${escapeHtml(riderSound.textContent.trim() || '')}`;
        riderInfo.appendChild(hRider); riderInfo.appendChild(p1); riderInfo.appendChild(p2);
        riderPreview.appendChild(riderInfo);

        // Stage (sin rejilla)
        const stageWrap = document.createElement('div');
        stageWrap.className = 'rider-section';
        const hStage = document.createElement('h3'); hStage.textContent = 'Plano (Stage Plot)';
        stageWrap.appendChild(hStage);
        const staticStage = buildStaticStageElement(true);
        stageWrap.appendChild(staticStage);
        riderPreview.appendChild(stageWrap);

        // Input list (serializada, ocultando column "Eliminar")
        const inputsWrap = document.createElement('div');
        inputsWrap.className = 'rider-section';
        const hInputs = document.createElement('h3'); hInputs.textContent = 'Lista de Canales';
        inputsWrap.appendChild(hInputs);
        const serializedInputs = serializeTableToElement(document.querySelector('#input-list .data-table'));
        inputsWrap.appendChild(serializedInputs);
        riderPreview.appendChild(inputsWrap);

        // Sends list
        const sendsWrap = document.createElement('div');
        sendsWrap.className = 'rider-section';
        const hSends = document.createElement('h3'); hSends.textContent = 'Envíos';
        sendsWrap.appendChild(hSends);
        const serializedSends = serializeTableToElement(document.querySelector('#sends-list .data-table'));
        sendsWrap.appendChild(serializedSends);
        riderPreview.appendChild(sendsWrap);

        // FOH (mostrar datos)
        const fohWrap = document.createElement('div');
        fohWrap.className = 'rider-section';
        const hFoh = document.createElement('h3'); hFoh.textContent = 'FOH';
        const fohModel = document.getElementById('foh-console-model')?.value || '';
        const fohDetails = document.getElementById('foh-patch-details')?.value || '';
        const pModel = document.createElement('div'); pModel.innerHTML = `<strong>Modelo de consola:</strong> ${escapeHtml(fohModel)}`;
        const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.style.background = '#f6f6f6'; pre.style.padding = '10px'; pre.style.borderRadius = '4px';
        pre.textContent = fohDetails;
        fohWrap.appendChild(hFoh); fohWrap.appendChild(pModel); fohWrap.appendChild(pre);
        riderPreview.appendChild(fohWrap);

        // Note: styles for print will be injected in print function
    }

    // Ligeras defensas: si hay cambios frecuentes, agrupar actualizaciones
    let previewTimeout = null;
    function scheduleRiderPreview(delay = 200) {
        if (previewTimeout) clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => { renderRiderPreview(); previewTimeout = null; }, delay);
    }

    // Ejecutar preview al inicio (si ya hay contenido)
    scheduleRiderPreview(300);

    // Observadores para actualizar preview cuando cambien las tablas o el canvas
    const configObserver = new MutationObserver(() => scheduleRiderPreview(250));
    if (inputListBody) configObserver.observe(inputListBody, { childList: true, subtree: true, attributes: true, characterData: true });
    if (sendsListBody) configObserver.observe(sendsListBody, { childList: true, subtree: true, attributes: true, characterData: true });
    if (stageCanvas) configObserver.observe(stageCanvas, { childList: true, subtree: true, attributes: true, characterData: true });

    // ----------------- Export / Print helpers -----------------

    // export HTML (simple)
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
/* Forzar saltos de página en caso de imprimir desde el HTML exportado */
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
            const a = document.createElement('a'); a.href = url; a.download = `${(projectConfig.projectName || 'rider').replace(/\s/g, '_')}.html`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            resolve();
        });
    }

    // print: abrir nueva ventana con contenido y llamar a print tras carga, forzando saltos por sección
    function printRider() {
        renderRiderPreview();
        const printWindow = window.open('', '_blank');
        if (!printWindow) { alert('La ventana de impresión fue bloqueada por el navegador. Permite ventanas emergentes para imprimir.'); return; }
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
/* Fuerza que cada .rider-section caiga en una página diferente al imprimir */
.rider-section { page-break-inside: avoid; break-inside: avoid-column; }
.rider-section:not(:last-child) { page-break-after: always; break-after: page; }

/* Asegura buena legibilidad para impresión */
body { -webkit-print-color-adjust: exact; }
.rider-print-wrapper { padding: 10px; }
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

    // Export as .doc (HTML content saved with .doc extension) - SOLO TABLAS (sin plano)
    function exportRiderAsDoc() {
        renderRiderPreview();
        const inputsHTML = serializeTableToElement(document.querySelector('#input-list .data-table')).outerHTML;
        const sendsHTML = serializeTableToElement(document.querySelector('#sends-list .data-table')).outerHTML;
        const infoHTML = `<div><strong>Manager:</strong> ${escapeHtml(riderContact.textContent.trim() || '')}</div><div><strong>Técnico de Sonido:</strong> ${escapeHtml(riderSound.textContent.trim() || '')}</div>`;
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
        const a = document.createElement('a'); a.href = url; a.download = `${(projectConfig.projectName || 'rider').replace(/\s/g, '_')}.doc`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // Export as Excel (.xls using HTML table) - SOLO TABLAS (sin plano)
    function exportRiderAsExcel() {
        renderRiderPreview();
        const inputsHTML = serializeTableToElement(document.querySelector('#input-list .data-table')).outerHTML;
        const sendsHTML = serializeTableToElement(document.querySelector('#sends-list .data-table')).outerHTML;
        const infoHTML = `<div><strong>Manager:</strong> ${escapeHtml(riderContact.textContent.trim() || '')}</div><div><strong>Técnico de Sonido:</strong> ${escapeHtml(riderSound.textContent.trim() || '')}</div>`;
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
        const a = document.createElement('a'); a.href = url; a.download = `${(projectConfig.projectName || 'rider').replace(/\s/g, '_')}.xls`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // ----------------- Helpers y utilidades -----------------
    function escapeHtml(s) { if (!s) return ''; return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function updateProjectInfoDisplay(config) {
        document.getElementById('header-project-name').textContent = config.projectName || 'Sin Nombre';
        document.getElementById('header-tour-name').textContent = config.tourName || 'N/A';
        document.getElementById('header-stage-size').textContent = config.stageSize || 'N/A';
        document.getElementById('header-channels').textContent = config.numInputChannels || 0;
        document.getElementById('header-sends').textContent = config.numSends || 0;
    }

    function resetApplicationState() {
        projectConfig = {};
        stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
        iconCounter = 1;
        inputListBody.innerHTML = '';
        sendsListBody.innerHTML = '';
        updateProjectInfoDisplay(projectConfig);
        elementControls.style.display = 'none';
        configPanel.querySelector('.config-placeholder').style.display = 'block';
        tabScreens.forEach(s => s.classList.remove('active'));
        tabButtons.forEach(b => b.classList.remove('active'));
        scheduleRiderPreview();
    }

    // ----------------- Llenado de preferencias -----------------
    function fillPreferencesForm(config) {
        document.getElementById('pref-project-name').value = config.projectName || '';
        document.getElementById('pref-tour-name').value = config.tourName || '';
        document.getElementById('pref-date').value = config.date || '';
        document.getElementById('pref-stage-size').value = config.stageSize || '';
        document.getElementById('pref-input-channels').value = config.numInputChannels || 0;
        document.getElementById('pref-sends-count').value = config.numSends || 0;
    }

    preferencesBtn.addEventListener('click', () => {
        if (projectConfig.projectName) fillPreferencesForm(projectConfig);
        else { alert('Crea o carga un proyecto primero para modificar sus preferencias.'); return; }
        preferencesScreen.classList.add('active');
        mainNav.style.display = 'none';
        tabContent.style.display = 'none';
    });

    const tabContent = document.getElementById('tab-content');
    closePreferencesBtn.addEventListener('click', () => {
        preferencesScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        tabContent.style.display = 'flex';
        const activeTabButton = document.querySelector('.tab-button.active');
        if (activeTabButton) activateTab(activeTabButton.dataset.tab); else activateTab('stage-plot');
    });

    projectPreferencesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newNumInputChannels = parseInt(document.getElementById('pref-input-channels').value);
        const newNumSends = parseInt(document.getElementById('pref-sends-count').value);
        projectConfig.projectName = document.getElementById('pref-project-name').value;
        projectConfig.tourName = document.getElementById('pref-tour-name').value;
        projectConfig.date = document.getElementById('pref-date').value;
        projectConfig.stageSize = document.getElementById('pref-stage-size').value;
        const oldNumInputChannels = projectConfig.numInputChannels;
        const oldNumSends = projectConfig.numSends;
        if (newNumInputChannels !== oldNumInputChannels) {
            if (confirm(`¿Está seguro de querer cambiar la cantidad de canales de ${oldNumInputChannels} a ${newNumInputChannels}? Esto borrará la lista actual.`)) {
                projectConfig.numInputChannels = newNumInputChannels;
                initializeInputList(newNumInputChannels);
            }
        }
        if (newNumSends !== oldNumSends) {
            if (confirm(`¿Está seguro de querer cambiar la cantidad de envíos de ${oldNumSends} a ${newNumSends}? Esto borrará la lista actual.`)) {
                projectConfig.numSends = newNumSends;
                initializeSendsList(newNumSends);
            }
        }
        updateProjectInfoDisplay(projectConfig);
        alert('Preferencias guardadas.');
    });

    // ----------------- Ayudas final -----------------
    // Inicial preview
    scheduleRiderPreview(300);
});
