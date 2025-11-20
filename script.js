document.addEventListener('DOMContentLoaded', () => {
    // --- 1. REFERENCIAS GLOBALES ---
    const projectInitScreen = document.getElementById('project-init-screen');
    const mainNav = document.getElementById('main-nav');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabScreens = document.querySelectorAll('.tab-screen');
    const projectForm = document.getElementById('project-form');
    const themeToggleButton = document.getElementById('theme-toggle');
    const body = document.body;
    const newProjectBtn = document.getElementById('new-project-btn');
    
    // Variable para almacenar la configuración del proyecto
    let projectConfig = {}; 
    
    // Referencias de Preferencias y Barra Superior
    const preferencesBtn = document.getElementById('preferences-btn');
    const preferencesScreen = document.getElementById('preferences-screen');
    const closePreferencesBtn = document.getElementById('close-preferences-btn');
    const projectInfoDisplay = document.getElementById('project-info-display');
    const projectPreferencesForm = document.getElementById('project-preferences-form');

    // --- Referencias de Plano y Tablas ---
    const stageCanvas = document.getElementById('stage-canvas');
    const inputListBody = document.getElementById('input-list-body');
    const sendsListBody = document.getElementById('sends-list-body');
    
    // Referencia del control de rejilla
    const gridToggle = document.getElementById('grid-toggle'); 
    
    // --- Referencias del Panel de Configuración ---
    const configPanel = document.getElementById('element-config-panel');
    const elementControls = document.getElementById('element-controls');
    
    // Referencia del input de nombre
    const elementNameInput = document.getElementById('element-name-input');
    
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
    body.classList.add('init-screen'); 
    projectInitScreen.classList.add('active'); 

    // LÓGICA DE LA REJILLA: Inicializa la rejilla y establece el listener del toggle
    stageCanvas.classList.add('show-grid');
    if (gridToggle) {
        gridToggle.addEventListener('change', () => {
            if (gridToggle.checked) {
                stageCanvas.classList.add('show-grid');
            } else {
                stageCanvas.classList.remove('show-grid');
            }
        });
    }

    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Capturar y almacenar en la configuración global
        projectConfig = {
            projectName: document.getElementById('project-name').value,
            tourName: document.getElementById('tour-name').value,
            date: document.getElementById('date').value,
            stageSize: document.getElementById('stage-size').value,
            numInputChannels: parseInt(document.getElementById('input-channels')?.value || 0),
            numSends: parseInt(document.getElementById('sends-count')?.value || 0)
        };

        // 2. Ocultar pantalla inicial y mostrar navegación
        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        body.classList.remove('init-screen'); 
        
        // 3. Inicializar las listas con los números ingresados
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
    
    // Base de datos de sugerencias (sin cambios)
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

    // *****************************************************************
    // MODIFICACIÓN: Aceptar channelData para cargar datos guardados
    // *****************************************************************
    function createChannelRow(channelNumber, channelData = null) {
        const row = document.createElement('tr');
        row.draggable = true; 
        
        const isLoad = channelData !== null;
        
        // 1. Determinar valores por defecto o cargados
        const defaultName = isLoad ? channelData.name : `Canal ${channelNumber}`;
        
        // Determinar categoría para sugerencias (solo si no estamos cargando o para asegurar una sugerencia)
        const categoryForSuggestions = Object.keys(SUGERENCIAS_MIC).find(key => defaultName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
            
        const micSuggestions = SUGERENCIAS_MIC[categoryForSuggestions] || SUGERENCIAS_MIC['Otro'];

        let defaultMicName = isLoad ? channelData.mic : (micSuggestions.length > 0 ? micSuggestions[0].name : '');
        let defaultPhantomChecked = isLoad ? channelData.phantom : (micSuggestions.length > 0 ? micSuggestions[0].phantom : false);
        
        const defaultStand = isLoad ? channelData.stand : SUGERENCIAS_STAND[categoryForSuggestions];
        const defaultStandOptions = getStandOptions(defaultStand);

        const defaultSubSnakeName = isLoad ? channelData.subSnake : 'SS1';
        const defaultSubSnakeColor = isLoad ? channelData.subSnakeColor : '#FFFFFF'; 
        const defaultNotes = isLoad ? channelData.notes : '';


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
                <input type="text" value="${defaultSubSnakeName}" class="subsnake-name">
                <input type="color" value="${defaultSubSnakeColor}" class="subsnake-color-picker">
            </td>
            <td data-label="Notas" contenteditable="true">${defaultNotes}</td>
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
        
        // Buscar la categoría basada en el nombre del canal (para sugerir el pie)
        const category = Object.keys(SUGERENCIAS_STAND).find(key => currentName.toLowerCase().includes(key.toLowerCase())) || 'Otro';
        const suggestedStand = SUGERENCIAS_STAND[category];
        
        // Si es un DI, forzar 'Ninguno', a menos que el usuario lo haya cambiado intencionalmente
        if (micValue.includes('di') && micValue.length > 2) { 
            if (currentSelectedStand !== 'Ninguno') {
                standSelect.innerHTML = getStandOptions('Ninguno');
            }
        } else {
            // Si no es un DI, sugerir el pie normal
            const standToKeep = currentSelectedStand === 'Ninguno' ? suggestedStand : currentSelectedStand;
            if (currentSelectedStand !== standToKeep) {
                standSelect.innerHTML = getStandOptions(standToKeep);
            }
        }
    }

    // Función para crear la lista vacía o con la cantidad por defecto
    function initializeInputList(count) {
        inputListBody.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            inputListBody.appendChild(createChannelRow(i));
        }
        updateChannelNumbers();
    }
    
    // *****************************************************************
    // NUEVA FUNCIÓN: Cargar la lista de canales desde los datos guardados
    // *****************************************************************
    function loadInputList(channelsData) {
        inputListBody.innerHTML = '';
        if (channelsData && channelsData.length > 0) {
            channelsData.forEach((channelData, index) => {
                // Usamos los datos guardados para crear la fila
                const newRow = createChannelRow(index + 1, channelData); 
                inputListBody.appendChild(newRow);
            });
        }
        updateChannelNumbers();
    }
    
    // Función para crear la lista vacía o con la cantidad por defecto
    function initializeSendsList(count) {
        sendsListBody.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            sendsListBody.appendChild(createSendRow(i));
        }
        updateSendNumbers();
    }
    
    // *****************************************************************
    // NUEVA FUNCIÓN: Cargar la lista de envíos desde los datos guardados
    // *****************************************************************
    function loadSendsList(sendsData) {
        sendsListBody.innerHTML = '';
        if (sendsData && sendsData.length > 0) {
            sendsData.forEach((sendData, index) => {
                // Usamos los datos guardados para crear la fila
                const newRow = createSendRow(index + 1, sendData); 
                sendsListBody.appendChild(newRow);
            });
        }
        updateSendNumbers();
    }
    
    
    function updateProjectInfoDisplay(config) {
        projectInfoDisplay.innerHTML = `
            <span>Proyecto: <strong>${config.projectName || 'Sin Nombre'}</strong></span>
            <span>Gira: <strong>${config.tourName || 'N/A'}</strong></span>
            <span>Escenario: <strong>${config.stageSize || 'N/A'}</strong></span>
            <span>Ch. Entrada: <strong>${config.numInputChannels || 0}</strong></span>
            <span>Envíos: <strong>${config.numSends || 0}</strong></span>
        `;
    }
    
    function resetApplicationState() {
        projectConfig = {};
        stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
        iconCounter = 1; 
        
        // Limpiar listas, sin crear filas por defecto
        inputListBody.innerHTML = '';
        sendsListBody.innerHTML = '';
        
        updateProjectInfoDisplay(projectConfig);
        elementControls.style.display = 'none';
        configPanel.querySelector('.config-placeholder').style.display = 'block';
        tabScreens.forEach(screen => screen.classList.remove('active'));
        tabButtons.forEach(btn => btn.classList.remove('active'));
    }

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
                // Actualizar el conteo en projectConfig (aunque no se usa inmediatamente, es correcto)
                projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
                updateProjectInfoDisplay(projectConfig);
            };
        });
        // Actualizar el conteo en projectConfig
        projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
        updateProjectInfoDisplay(projectConfig);
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
            button.classList.add('active');
            
            paletteCategories.forEach(category => {
                if (category.id === `category-${categoryId}`) {
                    category.classList.add('active');
                } else {
                    category.classList.remove('active');
                }
            });
        });
    });

    // Lógica de arrastrar y soltar desde la paleta
    document.querySelectorAll('.stage-icon').forEach(icon => {
        icon.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', icon.dataset.type);
            e.dataTransfer.effectAllowed = 'move';
        });
    });

    stageCanvas.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';
    });

    // APLICACIÓN DE CAMBIOS: Drop Element
    stageCanvas.addEventListener('drop', (e) => {
        e.preventDefault();
        
        const type = e.dataTransfer.getData('text/plain');
        if (!type) return;

        // Calcular posición relativa al canvas
        const canvasRect = stageCanvas.getBoundingClientRect();
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;

        // Crear el elemento
        const draggedElement = document.createElement('div');
        draggedElement.className = 'stage-element';
        draggedElement.dataset.type = type;
        
        // Obtener el icono y el texto del elemento arrastrado de la paleta
        const sourceIcon = document.querySelector(`.stage-icon[data-type="${type}"]`);
        const iconHtml = sourceIcon.querySelector('i')?.outerHTML || '';
        const iconText = sourceIcon.textContent.trim();
        
        draggedElement.innerHTML = `${iconHtml} ${iconText}`;
        
        draggedElement.style.left = `${x}px`;
        draggedElement.style.top = `${y}px`;
        draggedElement.style.zIndex = '10'; // Valor inicial
        draggedElement.dataset.rotation = '0';
        draggedElement.dataset.scale = '1.0'; // Valor para tamaño/escala (usado en font-size para iconos)
        
        // Asignar un ID único basado en un contador
        draggedElement.dataset.elementId = `element-${iconCounter++}`;
        
        // Aplicar estilo por defecto de forma
        if (draggedElement.dataset.type.endsWith('-shape')) {
            // Color por defecto Gris (con transparencia)
            draggedElement.style.backgroundColor = 'rgba(128, 128, 128, 0.5)';
            draggedElement.style.width = '100px';
            draggedElement.style.height = '100px';
            draggedElement.innerHTML = ''; // Las formas no tienen texto por defecto

            if (draggedElement.dataset.type === 'circle-shape') {
                draggedElement.classList.add('shape-circle');
            } else if (draggedElement.dataset.type === 'line-shape') {
                // Estilos de Línea
                draggedElement.style.width = '150px';
                draggedElement.style.height = '5px';
                draggedElement.classList.add('shape-square');
                draggedElement.style.borderRadius = '0';
            } else {
                // square-shape
                draggedElement.classList.add('shape-square');
            }
        } else if (draggedElement.dataset.type === 'text') {
            // Inicialización del elemento de texto
            draggedElement.style.width = 'fit-content';
            draggedElement.style.height = 'fit-content';
            draggedElement.style.backgroundColor = 'transparent';
            draggedElement.style.border = 'none'; 
            draggedElement.innerHTML = 'Etiqueta';
            draggedElement.style.padding = '2px 5px';
            draggedElement.setAttribute('contenteditable', 'false'); 
            draggedElement.style.fontSize = '1.0em';
        } else {
            // ESTILO POR DEFECTO PARA ELEMENTOS CON ÍCONO (SIN FONDO)
            draggedElement.style.backgroundColor = 'transparent'; 
            draggedElement.style.color = 'var(--color-text)'; 
            draggedElement.style.padding = '5px'; 
            draggedElement.style.width = 'fit-content';
            draggedElement.style.height = 'fit-content';
            draggedElement.style.fontSize = '1.0em'; // Tamaño de fuente por defecto
        }
        
        stageCanvas.appendChild(draggedElement);
        setupElementInteractions(draggedElement);
        selectElement(draggedElement);
        
        // Quitar el placeholder si es el primer elemento
        const placeholder = stageCanvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
    });

    // -------------------------------------------------------------------
    // --- 6. LÓGICA DE INTERACCIÓN DE ELEMENTOS (SELECCIÓN, DRAG, CONFIG) ---
    // -------------------------------------------------------------------

    function getElementTextContent(element) {
        if (element.dataset.type === 'text') {
            return element.textContent.trim();
        }
        const icon = element.querySelector('i');
        // Si hay icono, obtén solo el texto, sino, todo el contenido.
        let textContent = element.textContent.trim();
        if (icon) {
            // Eliminar el texto del icono (que suele estar al inicio)
            textContent = textContent.replace(icon.textContent, '').trim(); 
        }
        return textContent;
    }
    
    function setElementTextContent(element, newText) {
        // Asegurar que el nuevo texto sea una cadena, si es null/undefined, usar vacío
        newText = newText || ''; 
        
        if (element.dataset.type === 'text') {
            element.textContent = newText;
            return;
        }
        
        // En lugar de buscar el ícono en el elemento (que puede haber sido eliminado),
        // buscamos el ícono original en la paleta para asegurar su existencia.
        const type = element.dataset.type;
        const sourceIcon = document.querySelector(`.stage-icon[data-type="${type}"]`);
        const iconHtml = sourceIcon?.querySelector('i')?.outerHTML || '';
        
        // Limpiamos el contenido del elemento
        element.innerHTML = '';
        
        // Reinsertamos el ícono y el texto
        if (iconHtml) {
             element.innerHTML = `${iconHtml} ${newText}`;
             // Restauramos la visibilidad si estaba editando
             const icon = element.querySelector('i');
             if (icon) icon.style.display = 'inline-block';
        } else {
             element.textContent = newText;
        }
        
        // Si se edita desde el panel, desactivar la edición inline
        element.setAttribute('contenteditable', 'false');
    }

    function setupElementInteractions(element) {
        // 1. Selección y Arrastre (Mantenido y Corregido)
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        
        element.addEventListener('mousedown', (e) => {
            // Evitar que mousedown en manejadores cancele la selección y empiece un drag
            if (e.target.classList.contains('resizer') || e.target.classList.contains('rotator')) {
                return;
            }
            
            e.stopPropagation(); 

            if (selectedElement !== element) {
                 selectElement(element);
            }
            // Si el elemento es editable INLINE y ya está en foco, el drag no debe ocurrir.
            if (element.getAttribute('contenteditable') === 'true' && element === document.activeElement) {
                return;
            }
            
            isDragging = true;
            element.classList.add('dragging');

            if (!element.dataset.type.endsWith('-shape') && element.dataset.type !== 'text') {
                 if (element.style.width === '' || element.dataset.wasResized !== 'true') {
                    element.style.width = 'fit-content';
                    element.style.height = 'fit-content';
                 }
            }


            const style = window.getComputedStyle(element);
            const currentX = parseFloat(style.left);
            const currentY = parseFloat(style.top);
            
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
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
            }
        });
        
        element.addEventListener('click', (e) => {
            e.stopPropagation(); 
        });
        
        // 2. Edición Rápida (Doble Click)
         if (!element.dataset.type.endsWith('-shape')) { // No formas
             element.addEventListener('dblclick', (e) => {
                 e.stopPropagation();
                 selectElement(element); // Asegura que esté seleccionado
                 
                 // Iniciar edición INLINE
                 element.setAttribute('contenteditable', 'true');
                 const icon = element.querySelector('i');
                 if (icon) icon.style.display = 'none'; // Oculta el icono para editar solo el texto
                 
                 // Seleccionar solo el texto si es posible (mover cursor al final)
                 const range = document.createRange();
                 const sel = window.getSelection();
                 range.selectNodeContents(element);
                 range.collapse(false); // Mover al final
                 sel.removeAllRanges();
                 sel.addRange(range);
                 
                 element.focus();
             });
        }
        
        // APLICACIÓN DE CORRECCIÓN: Asegurar que el ícono se restaure después de editar en línea
        element.addEventListener('blur', () => {
            const isPureTextElement = element.dataset.type === 'text';

            if (!isPureTextElement && element.getAttribute('contenteditable') === 'true') {
                
                // 1. CAPTURAR EL TEXTO EDITADO (SÓLO EL TEXTO VISIBLE, SIN ÍCONO)
                const newText = element.textContent.trim(); 

                // 2. RECONSTRUIR EL ELEMENTO (Esto fuerza la reinserción del ícono y deshabilita contenteditable)
                setElementTextContent(element, newText); 
                
                // Ahora, el elemento ya está reconstruido y contenteditable='false' (dentro de setElementTextContent)
            }
            
            // Si el elemento está seleccionado, actualizar el input del panel
            if (selectedElement === element && elementNameInput) {
                const elementText = getElementTextContent(element);
                elementNameInput.value = elementText;
                selectedElementTitle.textContent = elementText || 'Elemento Seleccionado';
            }
        });

        // 4. Asegurar estado inicial de edición 
        // Para el elemento de texto, aseguramos que esté en false al inicio
        if (element.dataset.type === 'text') {
             element.setAttribute('contenteditable', 'false'); 
        }
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
        if (selectedElement) {
            
            // 1. Limpieza visual y de manejadores
            selectedElement.classList.remove('selected');
            selectedElement.querySelectorAll('.resizer, .rotator').forEach(h => h.remove());
            
            // Si el elemento no es de texto puro, nos aseguramos de que no quede editable INLINE.
            if (selectedElement.dataset.type !== 'text') {
                 selectedElement.setAttribute('contenteditable', 'false');
            }
            
            // Aseguramos que el icono sea visible si no es de texto
            const icon = selectedElement.querySelector('i');
            if (icon) icon.style.display = 'inline-block';

            selectedElement = null;
            elementControls.style.display = 'none';
            configPanel.querySelector('.config-placeholder').style.display = 'block';
        }
    }

    function addTransformationHandles(element) {
        // Asegurarse de que el elemento tenga un width/height explícito para la redimensión visual
        if (element.style.width === 'fit-content') { 
            element.style.width = `${element.offsetWidth}px`;
        }
        if (element.style.height === 'fit-content') {
            element.style.height = `${element.offsetHeight}px`;
        }
        
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

    // Lógica de redimensión para iconos/texto y formas
    function setupResizing(element, handle) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startScale;
        const isShape = element.dataset.type.endsWith('-shape');
        const isIconOrText = !isShape; 

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            
            // Si es Icono/Texto, forzamos las dimensiones actuales para tener una base para el cálculo
            if (isIconOrText) {
                 // Usamos offsetWidth/Height porque el estilo es 'fit-content'
                 startWidth = element.offsetWidth;
                 startHeight = element.offsetHeight;
                 // Temporalmente fijamos width/height para tener una base de arrastre
                 element.style.width = `${startWidth}px`;
                 element.style.height = `${startHeight}px`;
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
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newWidth = Math.max(20, startWidth + dx);
            let newHeight = Math.max(20, startHeight + dy);

            if (isShape) {
                // SHAPE: Aplicar a width/height
                element.style.width = `${newWidth}px`;
                element.style.height = `${newHeight}px`;
            } else {
                // ICONO/TEXTO: Aplicar a font-size (scale)
                
                // Usamos la dimensión con el mayor cambio para el cálculo
                const delta = Math.abs(dx) > Math.abs(dy) ? dx / startWidth : dy / startHeight;
                
                // Calculamos el nuevo factor de escala, limitando el cambio
                const newScale = startScale * (1 + delta);
                
                const finalScale = Math.max(0.5, Math.min(5.0, newScale)); // Limitar escala
                
                // Aplicar solo si ha habido un cambio significativo
                if (Math.abs(finalScale - startScale) > 0.01) {
                    element.style.fontSize = `${finalScale}em`;
                    element.dataset.scale = finalScale.toFixed(2);
                }
                
                // El contenedor vuelve a fit-content para ajustarse al nuevo font-size
                element.style.width = 'fit-content';
                element.style.height = 'fit-content';
            }
            
            element.dataset.wasResized = 'true';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                element.classList.remove('dragging');
                
                // Limpieza del ancho/alto temporal si es un ícono/texto
                if (isIconOrText) {
                    element.style.width = 'fit-content';
                    element.style.height = 'fit-content';
                }
            }
        });
    }

    function setupRotation(element, handle) {
        let isRotating = false;

        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            isRotating = true;
            element.classList.add('dragging');
        });

        document.addEventListener('mousemove', (e) => {
            if (!isRotating) return;
            e.preventDefault();

            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            let angleDeg = angleRad * (180 / Math.PI) + 90; 
            
            angleDeg = Math.round(angleDeg / 45) * 45;
            if (angleDeg < 0) angleDeg += 360; 
            
            const currentSize = element.dataset.scale || '1.0';
            const isShape = element.dataset.type.endsWith('-shape');
            
            let transformValue = `rotate(${angleDeg}deg)`;
            
            // Solo aplicar scale si es una forma (para evitar estirar el contenedor del ícono/texto)
            if (isShape) {
                // Si es Linea, no escalamos, ya que redimensionamos el width/height directamente
                if(element.dataset.type !== 'line-shape') {
                     transformValue += ` scale(${currentSize})`; 
                }
            }
            
            element.style.transform = transformValue;
            element.dataset.rotation = angleDeg;
        });

        document.addEventListener('mouseup', () => {
            if (isRotating) {
                isRotating = false;
                element.classList.remove('dragging');
            }
        });
    }

    function updateConfigPanel(element) {
        if (!element) return;
        
        elementControls.style.display = 'block';
        configPanel.querySelector('.config-placeholder').style.display = 'none';
        
        const currentBackgroundColor = element.style.backgroundColor || 'transparent';
        const isShape = element.dataset.type.endsWith('-shape');
        
        // El color que se muestra en el picker es el de fondo para formas, o el de texto/ícono para otros.
        const colorToDisplay = isShape 
            ? (currentBackgroundColor === 'transparent' ? '#007bff' : currentBackgroundColor) 
            : (element.style.color || '#007bff');
            
        const currentShape = element.classList.contains('shape-circle') ? 'circle' : 
                              (element.dataset.type === 'line-shape' ? 'line' : 
                              (currentBackgroundColor !== 'transparent' && element.dataset.type.endsWith('-shape') ? 'square' : 'none'));
        const currentZIndex = element.style.zIndex || 10;
        
        // 1. Lógica de Nombre
        const elementText = getElementTextContent(element);
        elementNameInput.value = elementText;
        selectedElementTitle.textContent = elementText || 'Elemento Seleccionado';
        elementNameInput.oninput = () => {
            setElementTextContent(element, elementNameInput.value);
            selectedElementTitle.textContent = elementNameInput.value || 'Elemento Seleccionado';
        };
        
        // 2. Lógica de Color (Aplicar al texto/ícono si no es forma)
        colorPicker.value = colorToDisplay;
        colorPicker.oninput = () => {
            if (isShape) {
                element.style.backgroundColor = colorPicker.value;
                element.style.color = 'var(--color-text)'; // Asegurar color de texto predeterminado en formas
            } else {
                element.style.color = colorPicker.value; // El color afecta al ícono/texto
                element.style.backgroundColor = 'transparent'; // Asegurar transparencia si es un ícono
            }
        };
        
        // 3. Lógica de Forma (Sin cambios)
        shapeSelector.value = currentShape === 'none' ? 'square' : currentShape;
        shapeSelector.onchange = () => {
            element.classList.remove('shape-square', 'shape-circle');
            
            if (element.dataset.type.endsWith('-shape') || element.style.backgroundColor !== 'transparent') {
                if(shapeSelector.value === 'line') {
                    // La línea se mantiene con 'shape-square' para el box-model pero sin border-radius
                    element.style.borderRadius = '0';
                } else {
                    element.classList.add(`shape-${shapeSelector.value}`);
                    element.style.borderRadius = ''; // Dejar que el CSS lo maneje
                }
            }
        };
        
        // 4. Lógica de Z-Index
        zIndexSelector.value = currentZIndex;
        zIndexSelector.oninput = () => {
            element.style.zIndex = zIndexSelector.value;
        };
        
        // 5. Lógica de Escala (Usar font-size para íconos/texto)
        const currentScale = element.dataset.scale || 1.0;
        
        document.getElementById('scale-selector').value = currentScale;
        document.getElementById('scale-selector').oninput = (e) => {
            const newScale = e.target.value;
            
            if (isShape) {
                 // Para formas, aplicamos scale en el transform (excepto Linea)
                 if(element.dataset.type !== 'line-shape') {
                     element.style.transform = `rotate(${element.dataset.rotation || 0}deg) scale(${newScale})`;
                 }
                 // Para la línea, el escalado es solo visual, no funcional sobre width/height
            } else {
                 // Para íconos/texto, escalamos el contenido usando font-size
                 element.style.fontSize = `${newScale}em`;
                 // Mantenemos solo la rotación en el transform
                 element.style.transform = `rotate(${element.dataset.rotation || 0}deg)`; 
            }
            element.dataset.scale = newScale;
        };

        // 6. Lógica de Eliminación (Sin cambios)
        deleteElementBtn.onclick = () => {
            element.remove();
            deselectElement();
            // Mostrar placeholder si ya no quedan elementos
            if (stageCanvas.children.length === 0) {
                 stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
            }
        };
    }

    // -------------------------------------------------------------------
    // --- LÓGICA DE DESELECCIÓN Y ATAJOS DE TECLADO ---
    // -------------------------------------------------------------------

    document.addEventListener('click', (e) => {
        // Permitir clic si estamos editando texto dentro del elemento
        if (selectedElement && selectedElement.getAttribute('contenteditable') === 'true' && selectedElement.contains(e.target)) {
            return;
        }
        
        if (e.target.closest('#element-config-panel') || e.target.closest('.resizer') || e.target.closest('.rotator')) return;
        
        if (!selectedElement || selectedElement.contains(e.target) || e.target === stageCanvas) return;
        
        if (!e.target.closest('.stage-element')) {
            deselectElement();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Aseguramos que la edición inline se detenga
            if(selectedElement && selectedElement.getAttribute('contenteditable') === 'true') {
                 selectedElement.blur(); 
            }
            deselectElement();
        }
    });
    
    // CORRECCIÓN DEFINITIVA DE BORRADO: (Mantenida)
    document.addEventListener('keydown', (e) => {
        const isDeleteOrBackspace = (e.key === 'Delete' || e.key === 'Backspace');
        
        if (isDeleteOrBackspace) {
            
            const activeElement = document.activeElement;
            
            // 1. Verificar si el usuario está activamente editando texto.
            const isEditingText = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.isContentEditable === true
            );

            // Si está editando cualquier elemento de texto, deja que el navegador maneje la tecla.
            if (isEditingText) {
                return; 
            }

            // 2. Si NO está editando y hay un ícono seleccionado, bórralo.
            if (selectedElement) {
                e.preventDefault(); 
                selectedElement.remove();
                deselectElement();
                
                // Mostrar placeholder si ya no quedan elementos
                if (stageCanvas.children.length === 0) {
                     stageCanvas.innerHTML = '<p class="canvas-placeholder">Arrastra y suelta elementos aquí. (Plano Proporcional A4)</p>';
                }
            }
        }
    });

    // -------------------------------------------------------------------
    // --- 7. LÓGICA DE LISTA DE ENVÍOS (Sends List) ---
    // -------------------------------------------------------------------
    
    const addSendBtn = document.getElementById('add-send-btn');
    
    const SEND_TYPE_OPTIONS = ['Monitor Cuña', 'In-Ear Mono', 'In-Ear Estéreo', 'FX Reverb', 'FX Delay', 'FX Otro'];

    function getSendTypeOptions(currentType) {
        return SEND_TYPE_OPTIONS.map(type => 
            `<option value="${type}" ${type === currentType ? 'selected' : ''}>${type}</option>`
        ).join('');
    }

    // *****************************************************************
    // MODIFICACIÓN: Aceptar sendData para cargar datos guardados
    // *****************************************************************
    function createSendRow(sendNumber, sendData = null) {
        const row = document.createElement('tr');
        row.draggable = true;
        
        const isLoad = sendData !== null;
        
        const defaultName = isLoad ? sendData.name : `Envío ${sendNumber}`;
        const defaultType = isLoad ? sendData.type : SEND_TYPE_OPTIONS[0]; 
        const defaultMix = isLoad ? sendData.mix : '';
        const defaultEQFX = isLoad ? sendData.eqfx : '';
        const defaultNotes = isLoad ? sendData.notes : '';
        
        const defaultOptions = getSendTypeOptions(defaultType);
        
        row.innerHTML = `
            <td data-label="Send" contenteditable="true">${sendNumber}</td>
            <td data-label="Nombre" contenteditable="true">${defaultName}</td>
            <td data-label="Tipo">
                <select class="send-type-select">
                    ${defaultOptions}
                </select>
            </td>
            <td data-label="Mix" contenteditable="true">${defaultMix}</td>
            <td data-label="EQ/FX" contenteditable="true">${defaultEQFX}</td>
            <td data-label="Notas" contenteditable="true">${defaultNotes}</td>
            <td data-label="Eliminar"><button class="btn delete-btn"><i class="fas fa-times"></i></button></td>
        `;

        setupDragAndDrop(row, true);

        return row;
    }

    addSendBtn.addEventListener('click', () => {
        const currentCount = sendsListBody.querySelectorAll('tr').length;
        const newRow = createSendRow(currentCount + 1);
        sendsListBody.appendChild(newRow);
        updateSendNumbers();
    });

    function updateSendNumbers() {
        const rows = sendsListBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            const numCell = row.children[0];
            numCell.textContent = index + 1;
            const deleteBtn = row.querySelector('.delete-btn');
            deleteBtn.onclick = () => {
                row.remove();
                updateSendNumbers();
                // Actualizar el conteo en projectConfig
                projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;
                updateProjectInfoDisplay(projectConfig);
            };
        });
        // Actualizar el conteo en projectConfig
        projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;
        updateProjectInfoDisplay(projectConfig);
    }

    // -------------------------------------------------------------------
    // --- 7. LÓGICA DE DRAG & DROP PARA FILAS DE LISTAS ---
    // -------------------------------------------------------------------
    
    function setupDragAndDrop(row, isSendList = false) {
        row.addEventListener('dragstart', (e) => {
            draggedRow = row;
            e.dataTransfer.effectAllowed = 'move';
            row.classList.add('dragging');
        });

        row.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (draggedRow !== row) {
                row.classList.add('drag-over');
            }
        });

        row.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        row.addEventListener('dragleave', () => {
            row.classList.remove('drag-over');
        });

        row.addEventListener('drop', () => {
            row.classList.remove('drag-over');
            if (draggedRow !== row) {
                const parent = row.parentNode;
                const draggingIndex = Array.from(parent.children).indexOf(draggedRow);
                const targetIndex = Array.from(parent.children).indexOf(row);
                
                if (draggingIndex > targetIndex) {
                    parent.insertBefore(draggedRow, row);
                } else {
                    parent.insertBefore(draggedRow, row.nextSibling);
                }

                if (isSendList) {
                    updateSendNumbers();
                } else {
                    updateChannelNumbers();
                }
            }
        });

        row.addEventListener('dragend', () => {
            draggedRow.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            draggedRow = null;
        });
    }

    // -------------------------------------------------------------------
    // --- 8. LÓGICA DE FOH (Front of House) ---
    // -------------------------------------------------------------------
    
    const fohConfigForm = document.getElementById('foh-config-form');
    
    if (fohConfigForm) {
        fohConfigForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Configuración FOH guardada (solo en la sesión actual).'); 
        });
    }

    // -------------------------------------------------------------------
    // --- 9. LÓGICA DE PREFERENCIAS ---
    // -------------------------------------------------------------------

    function fillPreferencesForm(config) {
        document.getElementById('pref-project-name').value = config.projectName || '';
        document.getElementById('pref-tour-name').value = config.tourName || '';
        document.getElementById('pref-date').value = config.date || '';
        document.getElementById('pref-stage-size').value = config.stageSize || '';
        document.getElementById('pref-input-channels').value = config.numInputChannels || 0;
        document.getElementById('pref-sends-count').value = config.numSends || 0;
    }
    
    preferencesBtn.addEventListener('click', () => {
        if (projectConfig.projectName) {
             fillPreferencesForm(projectConfig);
        } else {
            alert('Crea o carga un proyecto primero para modificar sus preferencias.');
            return;
        }

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
        if (activeTabButton) {
            activateTab(activeTabButton.dataset.tab);
        } else {
            activateTab('stage-plot');
        }
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
        
        // NO actualizamos projectConfig.numInputChannels/numSends aquí. Se actualiza en loadInputList/loadSendsList al hacer submit o al añadir/borrar.
        
        if (newNumInputChannels !== oldNumInputChannels) {
            // Si el usuario cambia el número de canales, volvemos a la lógica de inicialización.
            // Esto podría borrar las filas existentes si reduce el número.
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

    // -------------------------------------------------------------------
    // --- 10. LÓGICA DE GUARDAR Y CARGAR PROYECTOS ---
    // -------------------------------------------------------------------
    
    function collectStageElements() {
        const elements = [];
        stageCanvas.querySelectorAll('.stage-element').forEach(element => {
            
            // Aseguramos que el width/height sean numéricos para guardar (solo para formas, ya que ícono/texto es fit-content)
            let widthToSave = element.style.width === 'fit-content' ? element.offsetWidth : parseFloat(element.style.width);
            let heightToSave = element.style.height === 'fit-content' ? element.offsetHeight : parseFloat(element.style.height);

            elements.push({
                type: element.dataset.type,
                x: parseFloat(element.style.left),
                y: parseFloat(element.style.top),
                width: widthToSave, 
                height: heightToSave,
                // Guardar color (ícono/texto) y backgroundColor (fondo/forma) por separado
                color: element.style.color || '', 
                backgroundColor: element.style.backgroundColor || '',
                zIndex: element.style.zIndex,
                rotation: element.dataset.rotation,
                scale: element.dataset.scale, // Ahora representa el valor de font-size para íconos/texto
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
                // Almacenar el color de fondo de la celda
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
                type: row.querySelector('.send-type-select').value,
                name: cells[2].textContent.trim(),
                mix: cells[3].textContent.trim(),
                eqfx: cells[4].textContent.trim(),
                notes: cells[5].textContent.trim()
            });
        });
        return sends;
    }

    function saveProject() {
        if (!projectConfig.projectName) {
            alert('Por favor, nombra el proyecto antes de guardar.');
            return;
        }
        
        // Recalcular los conteos finales antes de guardar
        projectConfig.numInputChannels = inputListBody.querySelectorAll('tr').length;
        projectConfig.numSends = sendsListBody.querySelectorAll('tr').length;

        const projectData = {
            config: projectConfig,
            stageElements: collectStageElements(),
            inputList: collectInputList(), // AHORA GUARDA LOS DATOS REALES DE LAS FILAS
            sendsList: collectSendsList(), // AHORA GUARDA LOS DATOS REALES DE LAS FILAS
        };

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
    
    document.querySelector('.file-actions .btn:nth-child(2)').addEventListener('click', saveProject);
    
    
    document.querySelector('.file-actions .btn:nth-child(3)').addEventListener('click', () => {
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

    function loadProject(data) {
        resetApplicationState();
        projectConfig = data.config;
        
        // ***************************************************************
        // CORRECCIÓN CLAVE: Cargar datos de listas guardadas, no solo por conteo
        // ***************************************************************
        loadInputList(data.inputList); 
        loadSendsList(data.sendsList); 
        
        loadStageElements(data.stageElements);
        updateProjectInfoDisplay(projectConfig);
        projectInitScreen.classList.remove('active');
        mainNav.style.display = 'flex';
        body.classList.remove('init-screen'); 
        activateTab('stage-plot');
        
        const maxId = (data.stageElements || []).reduce((max, el) => {
            const idNum = parseInt(el.elementId?.split('-')[1]) || 0;
            return Math.max(max, idNum);
        }, 0);
        iconCounter = maxId + 1;
    }
    
    function loadStageElements(elementsData) {
        stageCanvas.innerHTML = '';
        if (elementsData && elementsData.length > 0) {
            elementsData.forEach(elementData => {
                const element = document.createElement('div');
                element.className = `stage-element ${elementData.class}`;
                element.dataset.type = elementData.type;
                
                element.style.left = `${elementData.x}px`;
                element.style.top = `${elementData.y}px`;
                
                // Aplicar ancho/alto guardados
                if (elementData.width) {
                    element.style.width = `${elementData.width}px`;
                }
                if (elementData.height) {
                    element.style.height = `${elementData.height}px`;
                }
                
                // Si es un ícono o texto, restablecer a fit-content
                if (!element.dataset.type.endsWith('-shape')) {
                     element.style.width = 'fit-content';
                     element.style.height = 'fit-content';
                }

                // Cargar color de ícono/texto y color de fondo
                element.style.color = elementData.color || 'var(--color-text)'; 
                element.style.backgroundColor = elementData.backgroundColor || 'transparent'; 
                
                element.style.zIndex = elementData.zIndex;
                
                // Aplicar tamaño/escala
                const sizeValue = elementData.scale || '1.0';
                
                // Si es Linea, aplicamos solo la rotación, el tamaño viene de width/height
                if (element.dataset.type === 'line-shape') {
                     element.style.transform = `rotate(${elementData.rotation}deg)`;
                } 
                // Si es otra forma, aplicamos rotación y scale
                else if (element.dataset.type.endsWith('-shape')) {
                     element.style.transform = `rotate(${elementData.rotation}deg) scale(${sizeValue})`;
                } else {
                     // Para íconos/texto, aplicamos font-size
                     element.style.fontSize = `${sizeValue}em`;
                     element.style.transform = `rotate(${elementData.rotation}deg)`; 
                }
                
                element.dataset.rotation = elementData.rotation;
                element.dataset.scale = sizeValue; 
                
                // Cargar estado de redimensión para el DRAG & DROP
                element.dataset.wasResized = elementData.wasResized ? 'true' : 'false';

                if (elementData.isCircle) {
                    element.classList.add('shape-circle');
                } else {
                    element.classList.add('shape-square');
                }
                
                // Cargar contenido (texto e icono)
                if (element.dataset.type !== 'text') {
                    const iconClass = document.querySelector(`.stage-icon[data-type="${elementData.type}"] i`)?.className;
                    if (iconClass) {
                        element.innerHTML = `<i class="${iconClass}"></i> ${elementData.content}`;
                    } else {
                        element.textContent = elementData.content;
                    }
                     element.setAttribute('contenteditable', 'false'); 
                } else {
                    element.textContent = elementData.content;
                    // Asegurar que el elemento de texto se carga con contenteditable = false
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
    
    if(newProjectBtn) {
        newProjectBtn.addEventListener('click', () => {
            if (projectConfig.projectName) {
                 const shouldSave = confirm('¿Quieres guardar el proyecto actual antes de empezar uno nuevo?');
                
                if (shouldSave) {
                    saveProject(); 
                }
            }
            resetApplicationState();
            projectInitScreen.classList.add('active');
            mainNav.style.display = 'none';
            body.classList.add('init-screen'); 
            
            if (preferencesScreen) {
               preferencesScreen.classList.remove('active');
            }
        });
    }

});
