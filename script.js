document.addEventListener('DOMContentLoaded', () => {
    // --- 1. REFERENCIAS GLOBALES ---
    const projectInitScreen = document.getElementById('project-init-screen');
    const mainNav = document.getElementById('main-nav');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabScreens = document.querySelectorAll('.tab-screen');
    const projectForm = document.getElementById('project-form');
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;

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
    projectInitScreen.classList.add('active'); 

    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // CORREGIDO: Obtener los números de canales y envíos con los IDs correctos
        const numChannels = parseInt(document.getElementById('input-channels')?.value || 0);
        const numSends = parseInt(document.getElementById('sends-count')?.value || 0);

        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        
        // Inicializar las listas con los números ingresados
        initializeInputList(numChannels);
        initializeSendsList(numSends);

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
                inputListBody.insertBefore(draggedRow, row.nextElementSibling);
            }

            updateChannelNumbers(); 
        });
    }

    function updateChannelNumbers() {
        const rows = inputListBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const chCell = row.children[0];
            chCell.textContent = index + 1; 
            
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.onclick = () => {
                row.remove();
                updateChannelNumbers(); 
            };
        });
    }

    function addChannel() {
        const currentChannelNumber = inputListBody.children.length + 1;
        const newRow = createChannelRow(currentChannelNumber);
        inputListBody.appendChild(newRow);
        updateChannelNumbers(); 
    }
    
    if (addChannelBtn) {
        addChannelBtn.addEventListener('click', addChannel);
    }
    
    // -------------------------------------------------------------------
    // --- 5. LÓGICA DE NAVEGACIÓN DE CATEGORÍAS DE LA PALETA ---
    // -------------------------------------------------------------------
    const paletteTabButtons = document.querySelectorAll('.palette-tab-button');
    const paletteCategories = document.querySelectorAll('.palette-category');

    paletteTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const categoryId = `category-${button.dataset.category}`;
            
            paletteTabButtons.forEach(btn => btn.classList.remove('active'));
            paletteCategories.forEach(cat => cat.classList.remove('active'));
            
            button.classList.add('active');
            const targetCategory = document.getElementById(categoryId);
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
            if (e.target.classList.contains('resizer') || e.target.classList.contains('rotator')) {
                return; 
            }
            
            e.preventDefault();
            xOffset = e.clientX - element.getBoundingClientRect().left;
            yOffset = e.clientY - element.getBoundingClientRect().top;
            isDragging = true;
            element.style.cursor = 'grabbing';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            element.style.cursor = 'grab';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();

            let newX = e.clientX - stageCanvas.getBoundingClientRect().left - xOffset;
            let newY = e.clientY - stageCanvas.getBoundingClientRect().top - yOffset;

            newX = Math.max(0, Math.min(newX, stageCanvas.offsetWidth - element.offsetWidth));
            newY = Math.max(0, Math.min(newY, stageCanvas.offsetHeight - element.offsetHeight));

            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        });
        
        element.addEventListener('click', (e) => {
            e.stopPropagation(); 
            
            document.querySelectorAll('.stage-element').forEach(el => {
                el.classList.remove('selected');
                el.querySelectorAll('.resizer, .rotator').forEach(h => h.remove()); 
            });

            element.classList.add('selected');
            selectedElement = element; 
            
            element.style.width = `${element.offsetWidth}px`;
            element.style.height = `${element.offsetHeight}px`;
            
            addTransformationHandles(element);
        });
        
        element.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            
            const iconElement = element.querySelector('i');
            let currentName = element.textContent.trim(); 
            
            if (iconElement) {
                currentName = element.innerHTML.replace(iconElement.outerHTML, '').trim();
            }

            const newName = prompt('Ingrese el nuevo nombre para el elemento (deje vacío para ocultar):', currentName);
            
            if (newName !== null) { 
                const trimmedName = newName.trim();
                
                if (trimmedName === '') {
                    element.style.padding = '0';
                    element.style.minWidth = '40px'; 
                    element.style.minHeight = '40px'; 
                    element.style.textAlign = 'center';

                    if (element.dataset.type !== 'text' && iconElement) {
                        element.innerHTML = iconElement.outerHTML; 
                    } else {
                        element.textContent = ''; 
                    }
                    
                } else {
                    if (element.dataset.type !== 'text') {
                         element.style.padding = ''; 
                         element.style.minWidth = '';
                         element.style.minHeight = '';
                         element.style.textAlign = '';
                    } else {
                         element.style.padding = '2px 5px'; 
                         element.style.minWidth = '';
                         element.style.minHeight = '';
                         element.style.textAlign = '';
                    }

                    if (iconElement) {
                         element.innerHTML = iconElement.outerHTML + ' ' + trimmedName;
                    } else {
                         element.textContent = trimmedName;
                    }
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
            
            const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            const angleDeg = angleRad * (180 / Math.PI) + 90; 

            const currentScale = element.dataset.scale || 1.0;
            element.style.transform = `scale(${currentScale}) rotate(${angleDeg}deg)`;
            element.dataset.rotation = angleDeg; 
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
        
        const tempElement = element.cloneNode(true); 
        tempElement.querySelectorAll('.resizer, .rotator').forEach(h => h.remove());

        const iconElement = tempElement.querySelector('i');
        if (iconElement) {
            iconElement.remove();
        }

        let titleText = tempElement.textContent.trim();

        selectedElementTitle.textContent = titleText || 'Elemento Seleccionado';
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
            <td data-label="Nombre del Envío" contenteditable="true">Monitor 1</td>
            <td data-label="Tipo">
                <select>
                    <option value="wedge">Wedge</option>
                    <option value="iem">IEM</option>
                </select>
            </td>
            <td data-label="Input/Aux" contenteditable="true">Aux 1</td>
            <td data-label="Stereo">
                <input type="checkbox">
            </td>
            <td data-label="Notas" contenteditable="true">Voz Principal</td>
            <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
        `;
        return row;
    }

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

    function addSend() {
        const currentSendNumber = sendsListBody.children.length + 1;
        const newRow = createSendsRow(currentSendNumber);
        sendsListBody.appendChild(newRow);
        updateSendsNumbers();
    }

    if (sendsListBody && addSendsBtn) {
        addSendsBtn.addEventListener('click', addSend);
    }
    
    // -------------------------------------------------------------------
    // --- 8. LÓGICA DE PERSISTENCIA (GUARDAR Y CARGAR) ---
    // -------------------------------------------------------------------
    
    function serializeProject() {
        const projectConfig = {
            name: document.getElementById('project-name').value,
            tourName: document.getElementById('tour-name').value,
            date: document.getElementById('date').value,
            stageSize: document.getElementById('stage-size').value,
            // CORREGIDO: Usar los IDs correctos para guardar la configuración
            numInputChannels: document.getElementById('input-channels')?.value || '',
            numSends: document.getElementById('sends-count')?.value || '',
        };

        const stageElements = [];
        const elementsOnCanvas = stageCanvas.querySelectorAll('.stage-element');
        elementsOnCanvas.forEach(el => {
            const elClone = el.cloneNode(true);
            elClone.querySelectorAll('.resizer, .rotator').forEach(h => h.remove());
            
            stageElements.push({
                contentHtml: elClone.innerHTML, 
                type: el.dataset.type,
                style: {
                    left: el.style.left,
                    top: el.style.top,
                    width: el.style.width,
                    height: el.style.height,
                    transform: el.style.transform,
                    backgroundColor: el.style.backgroundColor || '',
                    zIndex: el.style.zIndex || '',
                    padding: el.style.padding || '',
                    minWidth: el.style.minWidth || '',
                    minHeight: el.style.minHeight || '',
                },
                classes: Array.from(el.classList).filter(c => c.startsWith('shape-') || c === 'stage-element'),
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
            config: projectConfig,
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
        a.download = `${data.config.name || 'BARSTAGEplot_Proyecto'}_${new Date().toISOString().substring(0, 10)}.barstage`; 
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`Proyecto "${data.config.name || 'Sin Nombre'}" guardado correctamente.`);
    }

    function loadProject(projectData) {
        
        // 1. Cargar Configuración Inicial
        const config = projectData.config;
        document.getElementById('project-name').value = config.name || '';
        document.getElementById('tour-name').value = config.tourName || '';
        document.getElementById('date').value = config.date || '';
        document.getElementById('stage-size').value = config.stageSize || '';

        // CORREGIDO: Cargar los valores de conteo usando los IDs de tu HTML
        const numInputChannelsInput = document.getElementById('input-channels');
        if (numInputChannelsInput && config.numInputChannels) {
            numInputChannelsInput.value = config.numInputChannels;
        }
        const numSendsInput = document.getElementById('sends-count');
        if (numSendsInput && config.numSends) {
            numSendsInput.value = config.numSends;
        }

        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        activateTab('stage-plot'); 
        
        // 2. Reconstruir Elementos del Plano
        stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Lienzo Proporcional A4)</p>';
        if(projectData.stage && projectData.stage.length > 0) {
            stageCanvas.querySelector('.canvas-placeholder')?.remove(); 
        }

        projectData.stage.forEach(elementData => {
            const el = document.createElement('div');
            el.className = elementData.classes.join(' '); 
            
            el.innerHTML = elementData.contentHtml || elementData.content || ''; 
            
            el.dataset.type = elementData.type;
            
            el.style.cssText = `
                position: absolute;
                left: ${elementData.style.left};
                top: ${elementData.style.top};
                width: ${elementData.style.width || '50px'};
                height: ${elementData.style.height || '30px'};
                transform: ${elementData.style.transform || 'none'};
                background-color: ${elementData.style.backgroundColor || '#3498db'};
                z-index: ${elementData.style.zIndex || 10};
                padding: ${elementData.style.padding || ''};
                min-width: ${elementData.style.minWidth || ''};
                min-height: ${elementData.style.minHeight || ''};
            `;

            stageCanvas.appendChild(el);
            makeElementEditable(el); 
        });
        
        // 3. Reconstruir Lista de Canales
        inputListBody.innerHTML = ''; 
        if (projectData.inputs && projectData.inputs.length > 0) {
            projectData.inputs.forEach(data => {
                const row = createChannelRow(data.ch);
                
                row.children[0].textContent = data.ch; 
                row.children[1].textContent = data.name; 
                
                const micInput = row.children[2].querySelector('.mic-input');
                micInput.value = data.mic; 

                const phantomCheckbox = row.children[3].querySelector('input[type="checkbox"]');
                phantomCheckbox.checked = data.phantom;
                
                const standSelect = row.children[4].querySelector('select');
                standSelect.innerHTML = getStandOptions(data.stand); 
                
                const subSnakeCell = row.children[5];
                const subSnakeNameInput = subSnakeCell.querySelector('.subsnake-name');
                const subSnakeColorPicker = subSnakeCell.querySelector('.subsnake-color-picker');
                
                subSnakeNameInput.value = data.subSnake;
                subSnakeColorPicker.value = data.subSnakeColor;
                subSnakeCell.style.backgroundColor = data.subSnakeColor; 

                row.children[6].textContent = data.notes;
                
                updateRowDisplay(row); 
                setupDragAndDrop(row); 

                inputListBody.appendChild(row);
            });
            updateChannelNumbers(); 
        } else if (config.numInputChannels && parseInt(config.numInputChannels) > 0) {
            // Si no hay canales guardados, inicializa con el conteo de la configuración
            initializeInputList(parseInt(config.numInputChannels));
        }

        // 4. Reconstruir Lista de Envíos
        sendsListBody.innerHTML = ''; 
        if (projectData.sends && projectData.sends.length > 0) {
            projectData.sends.forEach(data => {
                const row = createSendsRow(data.num);
                row.children[1].textContent = data.name;
                if(row.children[2].querySelector('select')) {
                     row.children[2].querySelector('select').value = data.type;
                }
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
        
        // 5. Cargar Contenido del Rider
        if (projectData.rider) {
             document.getElementById('rider-editor').innerHTML = projectData.rider;
        }

        alert(`Proyecto "${config.name}" cargado exitosamente.`);
    }
    
    // --- Conexión de Eventos a Botones de Guardar/Cargar ---
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
            event.target.value = ''; 
        };
        reader.readAsText(file);
    });

});