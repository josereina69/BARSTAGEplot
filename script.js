document.addEventListener('DOMContentLoaded', () => {
    // --- 1. REFERENCIAS GLOBALES ---
    const projectInitScreen = document.getElementById('project-init-screen');
    const mainNav = document.getElementById('main-nav');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabScreens = document.querySelectorAll('.tab-screen');
    const projectForm = document.getElementById('project-form');
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    
    // INICIO NUEVO: Variable para almacenar la configuración del proyecto
    let projectConfig = {}; 
    
    // INICIO NUEVO: Referencias de Preferencias y Barra Superior
    const preferencesBtn = document.getElementById('preferences-btn');
    const preferencesScreen = document.getElementById('preferences-screen');
    const closePreferencesBtn = document.getElementById('close-preferences-btn');
    const projectInfoDisplay = document.getElementById('project-info-display');
    const projectPreferencesForm = document.getElementById('project-preferences-form');
    // FIN NUEVO

    // --- Referencias de Proyecto Inicial (CORREGIDO) ---
    // Usando los IDs de tu index.html: 'input-channels' y 'sends-count'
    const numInputChannelsInput = document.getElementById('input-channels');
    const numSendsInput = document.getElementById('sends-count');

    // --- Referencias de Plano y Tablas ---
    const stageCanvas = document.getElementById('stage-canvas');
    const inputListBody = document.getElementById('input-list-body');
    const sendsListBody = document.getElementById('sends-list-body');
    
    // --- Referencias del Panel de Configuración ---
    const configPanel = document.getElementById('element-config-panel');
    const elementControls = document.getElementById('element-controls');
    const colorPicker = document.getElementById('color-picker');
    const shapeSelector = document.getElementById('shape-selector');
    const zIndexSelector = document.getElementById('z-index-selector');
    const selectedElementTitle = document.getElementById('selected-element-title');
    const deleteElementBtn = document.getElementById('delete-element-btn');

    let selectedElement = null;
    let iconCounter = 1;
    let draggedRow = null; 
    
    // --- 2. Lógica del Formulario Inicial y Navegación de Pestañas ---
    
    initTheme();
    body.classList.add('init-screen'); // NUEVO: Añadir clase para ocultar info en el header
    projectInitScreen.classList.add('active'); 

    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // INICIO MODIFICACIÓN: Capturar y almacenar en la configuración global
        projectConfig = {
            projectName: document.getElementById('project-name').value,
            tourName: document.getElementById('tour-name').value,
            date: document.getElementById('date').value,
            stageSize: document.getElementById('stage-size').value,
            numInputChannels: parseInt(document.getElementById('input-channels')?.value || 0),
            numSends: parseInt(document.getElementById('sends-count')?.value || 0)
        };
        // FIN MODIFICACIÓN

        // 2. Ocultar pantalla inicial y mostrar navegación
        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        body.classList.remove('init-screen'); // NUEVO: Mostrar info del header
        
        // 3. Inicializar las listas con los números ingresados
        initializeInputList(projectConfig.numInputChannels);
        initializeSendsList(projectConfig.numSends);
        
        updateProjectInfoDisplay(projectConfig); // NUEVO: Actualizar la info de la barra superior

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
                targetScreen.style.boxShadow = 'none'; 
            } else if (tabId === 'rider-doc') {
                targetScreen.style.flexDirection = 'column'; 
                targetScreen.style.padding = '0'; 
                targetScreen.style.boxShadow = 'none'; 
            } else {
                targetScreen.style.flexDirection = 'column'; 
                targetScreen.style.padding = '20px';
                targetScreen.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.05)';
            }
        }
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            activateTab(tabId);
        });
    });

    // --- 3. Lógica del Modo Día/Noche ---
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
        const savedTheme = localStorage.getItem('theme') || 'day';
        if (savedTheme === 'night') {
            body.classList.add('dark-mode');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i> Día/Noche';
        }
    }
    
    // MODIFICADO: Base de datos de sugerencias de Micrófonos/DIs y Pies.
    const SUGERENCIAS_MIC = {
        'Voz Principal': [
            { name: 'Shure SM58', phantom: false },
            { name: 'Sennheiser E935', phantom: false },
            { name: 'Shure Beta 58A', phantom: false },
            { name: 'Condensador Vocal', phantom: true } 
        ],
        'Coro/Backing': [
            { name: 'Shure SM58', phantom: false }, 
            { name: 'Sennheiser E835', phantom: false }
        ],
        'Bombo (Kick)': [
            { name: 'Shure Beta 52A', phantom: false }, 
            { name: 'AKG D112', phantom: false }, 
            { name: 'Sennheiser E902', phantom: false }
        ],
        'Caja (Snare)': [
            { name: 'Shure SM57', phantom: false }, 
            { name: 'Sennheiser E905', phantom: false }, 
            { name: 'Audix i5', phantom: false }
        ],
        'Toms': [
            { name: 'Sennheiser E604', phantom: false }, 
            { name: 'Shure Beta 98', phantom: false }
        ],
        'Overhead': [
            { name: 'Condensador Pequeño', phantom: true }, 
            { name: 'Condensador Grande', phantom: true }, 
            { name: 'Shure SM81 (Par)', phantom: true } 
        ],
        'Bajo (DI)': [
            { name: 'DI Activo', phantom: true }, 
            { name: 'DI Pasivo', phantom: false },
            { name: 'Radial JDI', phantom: false },
            { name: 'Ampli Bajo (Mic)', phantom: false }
        ],
        'Guitarra Eléctrica': [
            { name: 'Shure SM57', phantom: false }, 
            { name: 'Sennheiser E906', phantom: false }, 
            { name: 'Royer R-121', phantom: false }
        ],
        'Guitarra Acústica': [
            { name: 'DI Acústico', phantom: true }, 
            { name: 'Condensador Pequeño', phantom: true } 
        ],
        'Teclado': [
            { name: 'DI Estéreo (x2)', phantom: true }, 
            { name: 'DI Mono', phantom: true } 
        ],
        'Percusión': [
            { name: 'Shure SM57', phantom: false }, 
            { name: 'Condensador Pequeño', phantom: true } 
        ],
        'Otro': [
            { name: 'SM58', phantom: false }, 
            { name: 'SM57', phantom: false }, 
            { name: 'DI Pasivo', phantom: false }, 
            { name: 'DI Activo', phantom: true } 
        ],
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
        'Otro': 'Alto',
        
    };

    const STAND_OPTIONS = ['Alto', 'Pequeño', 'Base Redonda', 'Recto', 'Pinza', 'Ninguno'];
    
    // -------------------------------------------------------------------
    // --- 4. LÓGICA DE LISTA DE CANALES (Input List) ---
    // -------------------------------------------------------------------

    const addChannelBtn = document.getElementById('add-input-channel-btn');

    function getMicOptions() {
        const suggestedMics = new Set();
        Object.values(SUGERENCIAS_MIC).flat().forEach(mic => suggestedMics.add(mic.name));
        
        let options = [];
        suggestedMics.forEach(mic => {
            options.push(`<option value="${mic}">`); 
        });
        
        return options.join('');
    }
    
    function getStandOptions(currentStand) {
        return STAND_OPTIONS.map(stand => 
            `<option value="${stand}" ${stand === currentStand ? 'selected' : ''}>${stand}</option>`
        ).join('');
    }

    function createChannelRow(channelNumber) {
        const row = document.createElement('tr');
        row.draggable = true; 
        
        const defaultName = `Canal ${channelNumber}`;
        
        const defaultCategory = Object.keys(SUGERENCIAS_MIC).find(key => defaultName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
        
        const micSuggestions = SUGERENCIAS_MIC[defaultCategory] || SUGERENCIAS_MIC['Otro'];
        let defaultMicName = '';
        let defaultPhantomChecked = false;

        if (micSuggestions.length > 0) {
            defaultMicName = micSuggestions[0].name; 
            defaultPhantomChecked = micSuggestions[0].phantom; 
        }

        const defaultStand = SUGERENCIAS_STAND[defaultCategory];
        const defaultStandOptions = getStandOptions(defaultStand);

        let micDatalist = document.getElementById('mic-datalist');
        if (!micDatalist) {
            micDatalist = document.createElement('datalist');
            micDatalist.id = 'mic-datalist';
            document.body.appendChild(micDatalist);
        }
        micDatalist.innerHTML = getMicOptions();

        const defaultSubSnakeColor = '#FFFFFF'; 

        row.innerHTML = `
            <td data-label="Ch" contenteditable="true">${channelNumber}</td>
            <td data-label="Nombre de canal" contenteditable="true">${defaultName}</td>
            <td data-label="Mic/DI">
                <input type="text" 
                       value="${defaultMicName}" 
                       class="mic-input" 
                       list="mic-datalist" 
                       placeholder="Escribe o selecciona un Mic/DI">
            </td>
            <td data-label="Phantom"><input type="checkbox" ${defaultPhantomChecked ? 'checked' : ''} class="phantom-checkbox"></td>
            <td data-label="Pie">
                <select class="stand-select">
                    ${defaultStandOptions}
                </select>
            </td>
            <td data-label="Sub-Snake" class="subsnake-cell" style="background-color: ${defaultSubSnakeColor};">
                <input type="text" value="SS1" class="subsnake-name">
                <input type="color" value="${defaultSubSnakeColor}" class="subsnake-color-picker">
            </td>
            <td data-label="Notas" contenteditable="true"></td>
            <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
        `;
        
        const nameCell = row.children[1];
        const micInput = row.querySelector('.mic-input');
        const standSelect = row.querySelector('.stand-select');
        const phantomCheckbox = row.querySelector('.phantom-checkbox');
        
        updateRowDisplay(row); 

        nameCell.addEventListener('blur', () => {
            const newName = nameCell.textContent.trim();
            if (newName) {
                const category = Object.keys(SUGERENCIAS_MIC).find(key => newName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
                const micSuggestions = SUGERENCIAS_MIC[category];
                
                if (micSuggestions.length > 0) {
                    micInput.value = micSuggestions[0].name;
                    phantomCheckbox.checked = micSuggestions[0].phantom;
                }
                
                const suggestedStand = SUGERENCIAS_STAND[category];
                standSelect.innerHTML = getStandOptions(suggestedStand);
                
                updateRowDisplay(row); 
            }
        });
        
        micInput.addEventListener('input', () => {
            updateRowDisplay(row);
        });

        phantomCheckbox.addEventListener('change', () => {
            updateRowDisplay(row); 
        });

        const subSnakeColorPicker = row.querySelector('.subsnake-color-picker');
        const subSnakeCell = row.querySelector('.subsnake-cell');

        subSnakeColorPicker.addEventListener('input', (e) => {
            subSnakeCell.style.backgroundColor = e.target.value;
        });
        
        setupDragAndDrop(row);

        return row;
    }

    // -------------------------------------------------------------------
    // --- FUNCIÓN: LÓGICA PHANTOM (COLOR), PIE Y VISUALIZACIÓN ---
    // -------------------------------------------------------------------

    function updateRowDisplay(row) {
        const micInput = row.querySelector('.mic-input');
        const phantomCheckbox = row.querySelector('.phantom-checkbox');
        const phantomCell = row.children[3]; // Celda Phantom
        const standSelect = row.querySelector('.stand-select');
        
        const micValue = micInput.value.trim().toLowerCase();
        
        // 1. Lógica de Estilo Phantom (Color Rojo Sutil si está marcado)
        if (phantomCheckbox.checked) {
            phantomCell.classList.add('phantom-active');
            phantomCell.style.border = '1px solid var(--color-border)'; 
            phantomCell.style.padding = '10px'; 
        } else {
            phantomCell.classList.remove('phantom-active');
            phantomCell.style.border = '1px solid var(--color-border)'; 
            phantomCell.style.padding = '10px'; 
        }

        // 2. Lógica Pie (Stand)
        const currentSelectedStand = standSelect.value;
        const nameCell = row.children[1];
        const currentName = nameCell.textContent.trim();
        const category = Object.keys(SUGERENCIAS_STAND).find(key => currentName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
        const suggestedStand = SUGERENCIAS_STAND[category];

        if (micValue.includes('di') && micValue.length > 2) {
            if (currentSelectedStand !== 'Ninguno') {
                standSelect.innerHTML = getStandOptions('Ninguno');
            }
        } else {
            const standToKeep = currentSelectedStand === 'Ninguno' ? suggestedStand : currentSelectedStand;
            
            if (currentSelectedStand !== standToKeep) {
                 standSelect.innerHTML = getStandOptions(standToKeep);
            }
        }
    }
    
    // -------------------------------------------------------------------
    // --- FUNCIONES DE INICIALIZACIÓN DE LISTAS ---
    // -------------------------------------------------------------------

    function initializeInputList(count) {
        // Limpia cualquier canal existente
        inputListBody.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const newRow = createChannelRow(i); 
            inputListBody.appendChild(newRow);
        }
        updateChannelNumbers(); 
    }

    function initializeSendsList(count) {
        // Limpia cualquier envío existente
        sendsListBody.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const newRow = createSendsRow(i);
            sendsListBody.appendChild(newRow);
        }
        updateSendsNumbers(); 
    }
    
    // -------------------------------------------------------------------
    // --- LÓGICA DE DRAG & DROP PARA FILAS DE CANALES ---
    // -------------------------------------------------------------------
    
    function removeDropTargetClass() {
        document.querySelectorAll('.data-table tr.drop-target-before, .data-table tr.drop-target-after').forEach(el => el.classList.remove('drop-target-before', 'drop-target-after'));
    }

    function setupDragAndDrop(row) {
        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => row.classList.add('dragging'), 0); 
        });

        row.addEventListener('dragend', () => {
            draggedRow.classList.remove('dragging');
            draggedRow = null;
            removeDropTargetClass();
        });
        
        row.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            if (draggedRow === row || !draggedRow) return;

            removeDropTargetClass();

            const rect = row.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const middle = rect.height / 2;

            if (y < middle) {
                row.classList.add('drop-target-before');
            } else {
                row.classList.add('drop-target-after');
            }
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drop-target-before', 'drop-target-after');
        });

        row.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedRow === row || !draggedRow) return;

            removeDropTargetClass();
            
            const rect = row.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const middle = rect.height / 2;
            
            if (y < middle) {
                inputListBody.insertBefore(draggedRow, row);
            } else {
                inputListBody.insertBefore(draggedRow, row.nextSibling);
            }
            
            updateChannelNumbers();
        });
    }

    // Agrega el listener del botón de añadir canal
    addChannelBtn.addEventListener('click', () => {
        const currentCount = inputListBody.querySelectorAll('tr').length;
        const newRow = createChannelRow(currentCount + 1);
        inputListBody.appendChild(newRow);
        updateChannelNumbers();
    });

    function updateChannelNumbers() {
        const rows = inputListBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numCell = row.children[0];
            numCell.textContent = index + 1;
            
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.onclick = () => {
                row.remove();
                updateChannelNumbers();
            };
        });
    }
    
    // -------------------------------------------------------------------
    // --- 5. LÓGICA DE PALETA Y PESTAÑAS (STAGE PLOT) ---
    // -------------------------------------------------------------------

    const paletteTabButtons = document.querySelectorAll('.palette-tab-button');
    const paletteCategories = document.querySelectorAll('.palette-category');

    paletteTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const categoryId = button.getAttribute('data-category');
            paletteTabButtons.forEach(btn => btn.classList.remove('active'));
            paletteCategories.forEach(cat => cat.classList.remove('active'));
            button.classList.add('active');
            
            const targetCategory = document.getElementById(`category-${categoryId}`);
            if (targetCategory) {
                targetCategory.classList.add('active');
            }
        });
    });

    // -------------------------------------------------------------------
    // --- 6. LÓGICA DE ARRASTRE Y SOLTAR (STAGE PLOT) ---
    // -------------------------------------------------------------------

    const draggableIcons = document.querySelectorAll('#palette-content .stage-icon');
    let draggedElement = null;

    draggableIcons.forEach(icon => {
        icon.addEventListener('dragstart', (e) => {
            draggedElement = icon.cloneNode(true);
            draggedElement.classList.remove('stage-icon');
            draggedElement.classList.add('stage-element');
            
            const type = icon.dataset.type;

            if (type === 'text') {
                draggedElement.textContent = 'Etiqueta de Texto';
                draggedElement.dataset.type = 'text';
            } else {
                const iconHtml = draggedElement.innerHTML;
                draggedElement.innerHTML = iconHtml.match(/<i[^>]*><\/i>/i) + ` ${type.toUpperCase()} ${iconCounter}`;
                iconCounter++;
                draggedElement.dataset.type = type;
            }

            e.dataTransfer.setData('text/plain', type);
            e.dataTransfer.setDragImage(icon, 10, 10);
        });
    });

    stageCanvas.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    stageCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (draggedElement) {
            const rect = stageCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            draggedElement.style.position = 'absolute';
            draggedElement.style.left = `${x - 20}px`;
            draggedElement.style.top = `${y - 20}px`;
            
            stageCanvas.querySelector('.canvas-placeholder')?.remove();
            
            // Valores por defecto
            draggedElement.classList.add('shape-square');
            draggedElement.style.backgroundColor = '#3498db';
            draggedElement.style.zIndex = 10;
            
            stageCanvas.appendChild(draggedElement);
            makeElementEditable(draggedElement);
            draggedElement = null;
        }
    });

    function makeElementEditable(element) {
        let isDragging = false;
        let xOffset = 0;
        let yOffset = 0;
        
        element.dataset.rotation = element.dataset.rotation || 0;
        element.dataset.scale = element.dataset.scale || 1.0;
        
        element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.resizer') || e.target.closest('.rotator')) return;
            
            deselectElement();
            
            element.classList.add('selected');
            selectedElement = element;
            
            updateConfigPanel(element);
            addTransformationHandles(element);
            
            isDragging = true;
            xOffset = e.clientX - element.getBoundingClientRect().left;
            yOffset = e.clientY - element.getBoundingClientRect().top;
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            let newX = e.clientX - xOffset - stageCanvas.getBoundingClientRect().left;
            let newY = e.clientY - yOffset - stageCanvas.getBoundingClientRect().top;

            // Restricción al lienzo (simple)
            newX = Math.max(0, Math.min(newX, stageCanvas.offsetWidth - element.offsetWidth));
            newY = Math.max(0, Math.min(newY, stageCanvas.offsetHeight - element.offsetHeight));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        element.addEventListener('dblclick', () => {
            const currentName = element.textContent.trim();
            const newName = prompt('Introduce el nuevo nombre del elemento:', currentName);
            
            if (newName !== null && newName.trim() !== '') {
                const trimmedName = newName.trim();
                const iconElement = element.querySelector('i');
                
                if (element.dataset.type !== 'text') {
                    if (iconElement) {
                        element.innerHTML = iconElement.outerHTML + ' ' + trimmedName;
                    } else {
                        element.textContent = trimmedName;
                    }
                } else {
                    element.textContent = trimmedName;
                }
                
                updateConfigPanel(element);
            } else if (newName === '') {
                // Opción para resetear el nombre (si no es de tipo texto)
                const type = element.dataset.type;
                const iconElement = element.querySelector('i');

                if (type !== 'text') {
                     if (iconElement) {
                        element.innerHTML = iconElement.outerHTML;
                    } else {
                        element.textContent = '';
                    }
                } else {
                    element.textContent = '';
                }
            }
            deselectElement();
        });
    }

    function deselectElement() {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            selectedElement.querySelectorAll('.resizer, .rotator').forEach(h => h.remove());
            selectedElement = null;
            elementControls.style.display = 'none';
            configPanel.querySelector('.config-placeholder').style.display = 'block';
        }
    }

    function addTransformationHandles(element) {
        const resizerBR = document.createElement('div');
        resizerBR.className = 'resizer bottom-right';
        element.appendChild(resizerBR);

        const rotator = document.createElement('div');
        rotator.className = 'rotator';
        element.appendChild(rotator);

        setupResizing(element, resizerBR);
        setupRotation(element, rotator);
        updateConfigPanel(element);
    }

    function setupResizing(element, handle) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = element.offsetWidth;
            startHeight = element.offsetHeight;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newWidth = startWidth + deltaX;
            let newHeight = startHeight + deltaY;
            
            const minSize = element.dataset.type === 'text' ? 10 : 30;

            newWidth = Math.max(minSize, newWidth);
            newHeight = Math.max(minSize, newHeight);

            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }

    function setupRotation(element, rotator) {
        let isRotating = false;

        rotator.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isRotating = true;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isRotating) return;
            e.preventDefault();

            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) + 90;
            element.style.transform = `rotate(${angle}deg) scale(${element.dataset.scale})`;
            element.dataset.rotation = angle;
        });

        document.addEventListener('mouseup', () => {
            isRotating = false;
        });
    }

    function updateConfigPanel(element) {
        configPanel.querySelector('.config-placeholder').style.display = 'none';
        elementControls.style.display = 'block';

        const currentColor = element.style.backgroundColor || '#3498db';
        const currentShape = element.classList.contains('shape-circle') ? 'circle' : 'square';
        const currentZIndex = element.style.zIndex || 10;
        
        selectedElementTitle.textContent = element.textContent.trim() || 'Elemento Seleccionado';

        colorPicker.value = currentColor;
        shapeSelector.value = currentShape;
        zIndexSelector.value = currentZIndex;

        colorPicker.oninput = () => {
            element.style.backgroundColor = colorPicker.value;
        };
        
        shapeSelector.onchange = () => {
            element.classList.remove('shape-square', 'shape-circle');
            element.classList.add(`shape-${shapeSelector.value}`);
        };

        zIndexSelector.oninput = () => {
            element.style.zIndex = zIndexSelector.value;
        };

        deleteElementBtn.onclick = () => {
            element.remove();
            deselectElement();
        };
    }

    // -------------------------------------------------------------------
    // --- LÓGICA DE DESELECCIÓN Y ATAJOS DE TECLADO ---
    // -------------------------------------------------------------------

    document.addEventListener('click', (e) => {
        if (!selectedElement || selectedElement.contains(e.target) || e.target === stageCanvas) return;
        if (e.target.closest('#element-config-panel')) return;
        if (!e.target.closest('.stage-element')) {
            deselectElement();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            deselectElement();
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
            e.preventDefault();
            selectedElement.remove();
            deselectElement();
        }
    });
    
    // -------------------------------------------------------------------
    // --- 7. LÓGICA DE LISTA DE ENVÍOS (Sends List) ---
    // -------------------------------------------------------------------

    const addSendsBtn = document.getElementById('add-sends-btn');

    function createSendsRow(sendNumber) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td data-label="Nº" contenteditable="false">${sendNumber}</td>
            <td data-label="Nombre del Envío" contenteditable="true">Monitor ${sendNumber}</td>
            <td data-label="Tipo">
                <select>
                    <option value="wedge">Wedge</option>
                    <option value="iem">IEM</option>
                    <option value="sidefill">Sidefill</option>
                </select>
            </td>
            <td data-label="Input/Aux" contenteditable="true">Aux ${sendNumber}</td>
            <td data-label="Stereo">
                <input type="checkbox">
            </td>
            <td data-label="Notas" contenteditable="true"></td>
            <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
        `;
        return row;
    }

    addSendsBtn.addEventListener('click', () => {
        const currentCount = sendsListBody.querySelectorAll('tr').length;
        const newRow = createSendsRow(currentCount + 1);
        sendsListBody.appendChild(newRow);
        updateSendsNumbers();
    });

    function updateSendsNumbers() {
        const rows = sendsListBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numCell = row.children[0];
            numCell.textContent = index + 1;
            
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.onclick = () => {
                row.remove();
                updateSendsNumbers();
            };
        });
    }

    // -------------------------------------------------------------------
    // --- NUEVAS FUNCIONES: GESTIÓN DE LA INFORMACIÓN DE PROYECTO ---
    // -------------------------------------------------------------------

    function updateProjectInfoDisplay(config) {
        // Formato de la fecha: dd/mmm/yyyy (ej: 15 may. 2025)
        let dateDisplay = config.date ? new Date(config.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
        
        projectInfoDisplay.innerHTML = `
            <span>Proyecto: <strong>${config.projectName || 'Sin Nombre'}</strong></span>
            ${config.tourName ? `<span>Gira: <strong>${config.tourName}</strong></span>` : ''}
            <span>Fecha: <strong>${dateDisplay}</strong></span>
            <span>Escenario: <strong>${config.stageSize || 'N/A'}</strong></span>
        `;
    }
    
    // Función para llenar el formulario de preferencias con la configuración actual
    function fillPreferencesForm(config) {
        document.getElementById('pref-project-name').value = config.projectName || '';
        document.getElementById('pref-tour-name').value = config.tourName || '';
        document.getElementById('pref-date').value = config.date || '';
        document.getElementById('pref-stage-size').value = config.stageSize || '';
        document.getElementById('pref-input-channels').value = config.numInputChannels || 0;
        document.getElementById('pref-sends-count').value = config.numSends || 0;
    }
    
    // LÓGICA DE PREFERENCIAS (Abrir, Cerrar y Guardar)
    preferencesBtn.addEventListener('click', () => {
        if (!projectConfig.projectName) { // Verificar si el proyecto se ha creado
            alert('Por favor, primero crea el proyecto con el formulario inicial.');
            return;
        }
        fillPreferencesForm(projectConfig);
        preferencesScreen.classList.add('active');
    });

    closePreferencesBtn.addEventListener('click', () => {
        preferencesScreen.classList.remove('active');
    });

    projectPreferencesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const oldConfig = { ...projectConfig }; // Copia de la configuración antigua
        
        // 1. Recoger nuevos datos
        const newConfig = {
            projectName: document.getElementById('pref-project-name').value,
            tourName: document.getElementById('pref-tour-name').value,
            date: document.getElementById('pref-date').value,
            stageSize: document.getElementById('pref-stage-size').value,
            numInputChannels: parseInt(document.getElementById('pref-input-channels').value || 0),
            numSends: parseInt(document.getElementById('pref-sends-count').value || 0)
        };
        
        // 2. Actualizar projectConfig global
        projectConfig = newConfig;
        
        // 3. Actualizar display
        updateProjectInfoDisplay(projectConfig);
        
        // 4. Re-inicializar listas si los números han cambiado (reemplaza las listas completas)
        if (oldConfig.numInputChannels !== newConfig.numInputChannels) {
            initializeInputList(newConfig.numInputChannels);
        }
        if (oldConfig.numSends !== newConfig.numSends) {
            initializeSendsList(newConfig.numSends);
        }

        // 5. Cerrar preferencias
        preferencesScreen.classList.remove('active');
        alert('Configuración de proyecto actualizada.');
    });
    
    // -------------------------------------------------------------------
    // --- 8. LÓGICA DE GUARDAR Y CARGAR ---
    // -------------------------------------------------------------------

    function serializeProject() {
        const stageElements = [];
        stageCanvas.querySelectorAll('.stage-element').forEach(element => {
            const rect = element.getBoundingClientRect();
            const canvasRect = stageCanvas.getBoundingClientRect();
            
            stageElements.push({
                type: element.dataset.type,
                name: element.textContent.trim(),
                x: element.offsetLeft,
                y: element.offsetTop,
                width: element.offsetWidth,
                height: element.offsetHeight,
                color: element.style.backgroundColor,
                shape: element.classList.contains('shape-circle') ? 'circle' : 'square',
                zIndex: element.style.zIndex,
                rotation: element.dataset.rotation || 0,
                scale: element.dataset.scale || 1.0,
            });
        });

        const inputList = [];
        inputListBody.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            const subSnakeCell = cells[5];
            inputList.push({
                ch: cells[0].textContent,
                name: cells[1].textContent,
                mic: cells[2].querySelector('.mic-input').value,
                phantom: cells[3].querySelector('input[type="checkbox"]').checked,
                stand: cells[4].querySelector('select').value,
                subSnake: subSnakeCell.querySelector('.subsnake-name').value,
                subSnakeColor: subSnakeCell.querySelector('.subsnake-color-picker').value,
                notes: cells[6].textContent,
            });
        });

        const sendsList = [];
        sendsListBody.querySelectorAll('tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            sendsList.push({
                num: cells[0].textContent,
                name: cells[1].textContent,
                type: cells[2].querySelector('select').value,
                inputAux: cells[3].textContent,
                stereo: cells[4].querySelector('input[type="checkbox"]').checked,
                notes: cells[5].textContent,
            });
        });

        const riderContent = document.getElementById('rider-editor').innerHTML;

        const projectData = {
            meta: {
                app: "BARSTAGEplot",
                version: 1.2,
                dateSaved: new Date().toISOString()
            },
            config: projectConfig, // AHORA USA LA VARIABLE GLOBAL
            stage: stageElements,
            inputs: inputList,
            sends: sendsList,
            rider: riderContent,
            foh: [],
        };

        return projectData;
    }

    function saveProject() {
        const data = serializeProject();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.config.projectName || 'BARSTAGEplot_Proyecto'}_${new Date().toISOString().substring(0, 10)}.barstage`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert(`Proyecto "${data.config.projectName || 'Sin Nombre'}" guardado correctamente.`);
    }

    function loadProject(data) { 
        // 1. Cargar Configuración Inicial
        const config = data.config;
        
        // INICIO MODIFICACIÓN: Almacenar la configuración globalmente y actualizar el display
        projectConfig = config; 
        updateProjectInfoDisplay(projectConfig);
        
        // NUEVO: Asegurarse de que el modo inicial se desactive al cargar un proyecto
        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        body.classList.remove('init-screen'); 
        // FIN MODIFICACIÓN

        // 2. Cargar elementos de Stage
        stageCanvas.innerHTML = ''; // Limpiar el canvas
        if (data.stage && data.stage.length > 0) {
            stageCanvas.querySelector('.canvas-placeholder')?.remove(); // Eliminar placeholder
            data.stage.forEach(elementData => {
                const element = document.createElement('div');
                element.className = 'stage-element';
                element.dataset.type = elementData.type;
                
                element.style.position = 'absolute';
                element.style.left = `${elementData.x}px`;
                element.style.top = `${elementData.y}px`;
                element.style.width = `${elementData.width}px`;
                element.style.height = `${elementData.height}px`;
                element.style.backgroundColor = elementData.color;
                element.style.zIndex = elementData.zIndex;
                element.style.transform = `rotate(${elementData.rotation}deg) scale(${elementData.scale})`;
                element.dataset.rotation = elementData.rotation;
                element.dataset.scale = elementData.scale;

                element.classList.add(`shape-${elementData.shape}`);

                if (elementData.type === 'text') {
                    element.textContent = elementData.name;
                } else {
                    const icon = document.createElement('i');
                    // Buscar la clase de Font Awesome basándose en el tipo si es posible
                    let iconClass = 'fas fa-cube'; // Default icon
                    if (elementData.type === 'speaker') iconClass = 'fas fa-volume-up';
                    else if (elementData.type === 'monitor') iconClass = 'fas fa-headset';
                    else if (elementData.type === 'amp') iconClass = 'fas fa-cube';
                    else if (elementData.type === 'keyboard') iconClass = 'fas fa-keyboard';
                    else if (elementData.type === 'drums') iconClass = 'fas fa-drum';
                    else if (elementData.type === 'percussion') iconClass = 'fas fa-bong';
                    else if (elementData.type === 'riser') iconClass = 'fas fa-layer-group';
                    else if (elementData.type === 'vocal-mic') iconClass = 'fas fa-microphone';
                    else if (elementData.type === 'instrument-mic') iconClass = 'fas fa-microphone-alt';
                    else if (elementData.type === 'di') iconClass = 'fas fa-plug';
                    else if (elementData.type === 'guitar') iconClass = 'fas fa-guitar';
                    else if (elementData.type === 'bass') iconClass = 'fas fa-bass-drum';
                    else if (elementData.type === 'sax') iconClass = 'fas fa-saxophone';
                    else if (elementData.type === 'rectangle') iconClass = 'far fa-square';
                    else if (elementData.type === 'circle') iconClass = 'far fa-circle';
                    else if (elementData.type === 'triangle') iconClass = 'fas fa-caret-up';

                    icon.className = iconClass;
                    element.innerHTML = icon.outerHTML + ' ' + elementData.name;
                }

                stageCanvas.appendChild(element);
                makeElementEditable(element);
            });
        }
        
        // 3. Cargar Input List
        inputListBody.innerHTML = '';
        if (data.inputs && data.inputs.length > 0) {
            data.inputs.forEach(data => {
                const row = document.createElement('tr');
                row.draggable = true; 
                
                const defaultStandOptions = getStandOptions(data.stand);

                row.innerHTML = `
                    <td data-label="Ch" contenteditable="true">${data.ch}</td>
                    <td data-label="Nombre de canal" contenteditable="true">${data.name}</td>
                    <td data-label="Mic/DI">
                        <input type="text" value="${data.mic}" class="mic-input" list="mic-datalist" placeholder="Escribe o selecciona un Mic/DI">
                    </td>
                    <td data-label="Phantom"><input type="checkbox" ${data.phantom ? 'checked' : ''} class="phantom-checkbox"></td>
                    <td data-label="Pie">
                        <select class="stand-select">
                            ${defaultStandOptions}
                        </select>
                    </td>
                    <td data-label="Sub-Snake" class="subsnake-cell" style="background-color: ${data.subSnakeColor};">
                        <input type="text" value="${data.subSnake}" class="subsnake-name">
                        <input type="color" value="${data.subSnakeColor}" class="subsnake-color-picker">
                    </td>
                    <td data-label="Notas" contenteditable="true">${data.notes}</td>
                    <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
                `;
                
                // Re-attach listeners for dynamic logic
                const nameCell = row.children[1];
                const micInput = row.querySelector('.mic-input');
                const standSelect = row.querySelector('.stand-select');
                const phantomCheckbox = row.querySelector('.phantom-checkbox');
                const subSnakeColorPicker = row.querySelector('.subsnake-color-picker');
                const subSnakeCell = row.querySelector('.subsnake-cell');

                nameCell.addEventListener('blur', () => { 
                    // No es necesario rehacer la lógica de categorías aquí, solo asegurarse de que el display se actualice
                    updateRowDisplay(row); 
                });
                micInput.addEventListener('input', () => { updateRowDisplay(row); });
                phantomCheckbox.addEventListener('change', () => { updateRowDisplay(row); });
                subSnakeColorPicker.addEventListener('input', (e) => { subSnakeCell.style.backgroundColor = e.target.value; });

                updateRowDisplay(row);
                setupDragAndDrop(row);
                inputListBody.appendChild(row);
            });
            updateChannelNumbers(); 
        } else if (config.numInputChannels && parseInt(config.numInputChannels) > 0) {
            // Si no hay canales guardados, inicializa con el conteo de la configuración
            initializeInputList(parseInt(config.numInputChannels));
        }

        // 4. Cargar Sends List
        sendsListBody.innerHTML = '';
        if (data.sends && data.sends.length > 0) {
            data.sends.forEach(data => {
                const row = createSendsRow(data.num);
                row.children[1].textContent = data.name;
                row.children[2].querySelector('select').value = data.type;
                row.children[3].textContent = data.inputAux;
                row.children[4].querySelector('input[type="checkbox"]').checked = data.stereo;
                row.children[5].textContent = data.notes;
                sendsListBody.appendChild(row);
            });
            updateSendsNumbers();
        } else if (config.numSends && parseInt(config.numSends) > 0) {
            // Si no hay envíos guardados, inicializa con el conteo de la configuración
            initializeSendsList(parseInt(config.numSends));
        }

        // 5. Cargar Rider
        if (data.rider) {
            document.getElementById('rider-editor').innerHTML = data.rider;
        }

        activateTab('stage-plot'); // Ir al plano después de cargar
        alert('Proyecto cargado correctamente.');
    }

    const saveButton = document.querySelector('.file-actions .fa-save').closest('button');
    const loadButton = document.querySelector('.file-actions .fa-folder-open').closest('button');
    
    const fileLoader = document.createElement('input');
    fileLoader.type = 'file';
    fileLoader.id = 'file-loader';
    fileLoader.style.display = 'none';
    fileLoader.accept = '.barstage, application/json'; 
    document.body.appendChild(fileLoader);

    saveButton.addEventListener('click', saveProject);

    loadButton.addEventListener('click', () => {
        fileLoader.click(); 
    });

    fileLoader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.meta && data.meta.app === "BARSTAGEplot") {
                    loadProject(data);
                } else {
                    alert('Error: El archivo no parece ser un proyecto válido de BARSTAGEplot. Verifica la meta data.');
                }
            } catch (error) {
                console.error("Error al parsear JSON:", error);
                alert('Error al leer el archivo. Asegúrate de que sea un archivo de proyecto (.barstage o .json) válido.');
            }
            event.target.value = ''; // Reset the input so the same file can be loaded again
        };
        reader.readAsText(file);
    });

});
