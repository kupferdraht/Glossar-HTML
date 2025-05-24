// Formatierungsfunktionen
function formatText(command) {
    document.execCommand(command, false, null);
}

function formatFont(fontName) {
    document.execCommand('fontName', false, fontName);
}

function formatSize(size) {
    document.execCommand('fontSize', false, size);
}

function insertLink() {
    const url = prompt('URL eingeben:', 'http://');
    if (url) {
        document.execCommand('createLink', false, url);
    }
}

// Datenbank-Funktionen
let db;
let currentEditId = null;
let dbInitialized = false;

// Datenbank initialisieren
function initDB() {
    if (dbInitialized) return;

    const request = indexedDB.open('GlossarDB', 1);

    request.onerror = (event) => {
        console.error('IndexedDB Fehler:', event.target.error);
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('entries')) {
            const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
            store.createIndex('order', 'order');
        }
    };

    request.onsuccess = (event) => {
        console.log('IndexedDB erfolgreich initialisiert');
        db = event.target.result;
        dbInitialized = true;
        loadEntries();
        checkForEdit();
    };
}

// Prüfe ob ein Eintrag bearbeitet werden soll
function checkForEdit() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    if (editId && db) {
        const transaction = db.transaction(['entries'], 'readonly');
        const objectStore = transaction.objectStore('entries');
        const request = objectStore.get(parseInt(editId));

        request.onsuccess = () => {
            const entry = request.result;// Import Funktion
function importEntries(event) {
    console.log("Import Funktion wird ausgeführt...");
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedEntries = JSON.parse(e.target.result);
            console.log("Importierte Einträge:", importedEntries);

            if (!db) {
                console.error('IndexedDB nicht initialisiert');
                alert('Datenbank ist noch nicht bereit. Bitte warten Sie einen Moment.');
                return;
            }

            const transaction = db.transaction(['entries'], 'readwrite');
            const objectStore = transaction.objectStore('entries');

            // Bestehende Einträge löschen
            const clearRequest = objectStore.clear();

            clearRequest.onsuccess = () => {
                console.log("Bestehende Einträge gelöscht.");
                // Importierte Einträge hinzufügen
                importedEntries.forEach(entry => {
                    // 'id' entfernen, damit IndexedDB eine neue zuweist
                    delete entry.id;
                    objectStore.add(entry);
                });

                transaction.oncomplete = () => {
                    alert('Backup erfolgreich importiert!');
                    loadEntries(); // Einträge nach dem Import neu laden
                };

                transaction.onerror = (event) => {
                    console.error('Fehler beim Importieren der Einträge:', event.target.error);
                    alert('Fehler beim Importieren des Backups.');
                };
            };

            clearRequest.onerror = (event) => {
                 console.error('Fehler beim Löschen bestehender Einträge:', event.target.error);
                 alert('Fehler beim Löschen bestehender Einträge vor dem Import.');
            };


        } catch (e) {
            console.error('Fehler beim Parsen der JSON-Datei:', e);
            alert('Ungültiges Backup-Dateiformat.');
        }
    };
    reader.readAsText(file);
}

            if (entry) {
                const editor = document.getElementById('editor');
                const titleInput = document.getElementById('entry-title');
                if (editor && titleInput) {
                    editor.innerHTML = entry.content;
                    titleInput.value = entry.title;
                    currentEditId = parseInt(editId);
                }
            }
        };
    }
}

// Einträge laden
function loadEntries() {
    if (!db) return;

    const transaction = db.transaction(['entries'], 'readonly');
    const objectStore = transaction.objectStore('entries');
    const request = objectStore.getAll();

    request.onsuccess = () => {
        const entries = request.result;
        entries.sort((a, b) => (a.order || 0) - (b.order || 0));
        displayEntries(entries);
    };
}

// Einträge anzeigen
function displayEntries(entries) {
    const entriesList = document.getElementById('entries-list');
    if (!entriesList) return;

    entriesList.innerHTML = entries.map(entry => `
        <div class="entry" draggable="true" data-id="${entry.id}">
            <div class="drag-handle">⋮⋮</div>
            <div class="entry-title">${entry.title}</div>
            <div class="entry-content">${entry.content}</div>
            <div class="entry-date">${new Date(entry.date).toLocaleDateString()}</div>
            <div class="entry-actions">
                <button onclick="editEntry(${entry.id})" class="edit-button">Bearbeiten</button>
                <button onclick="confirmDelete(${entry.id})" class="delete-button">Löschen</button>
            </div>
        </div>
    `).join('');

    // Drag & Drop Event Listener
    const entryElements = entriesList.querySelectorAll('.entry');
    entryElements.forEach(entry => {
        entry.addEventListener('dragstart', handleDragStart);
        entry.addEventListener('dragover', handleDragOver);
        entry.addEventListener('drop', handleDrop);
        entry.addEventListener('dragend', handleDragEnd);
    });
}

// Drag & Drop Funktionen
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = e.target;
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const dropTarget = e.target.closest('.entry');
    
    if (dropTarget && draggedItem !== dropTarget) {
        const allEntries = [...document.querySelectorAll('.entry')];
        const draggedPos = allEntries.indexOf(draggedItem);
        const droppedPos = allEntries.indexOf(dropTarget);

        if (draggedPos < droppedPos) {
            dropTarget.parentNode.insertBefore(draggedItem, dropTarget.nextSibling);
        } else {
            dropTarget.parentNode.insertBefore(draggedItem, dropTarget);
        }
        
        updateEntryOrder();
    }
    draggedItem.classList.remove('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedItem = null;
}

// Reihenfolge aktualisieren
function updateEntryOrder() {
    if (!db) return;

    const entries = Array.from(document.querySelectorAll('.entry'));
    const transaction = db.transaction(['entries'], 'readwrite');
    const store = transaction.objectStore('entries');

    entries.forEach((entry, index) => {
        const id = parseInt(entry.dataset.id);
        const request = store.get(id);

        request.onsuccess = () => {
            const data = request.result;
            data.order = index;
            store.put(data);
        };
    });
}

// Eintrag speichern
function saveEntry() {
    if (!db) {
        console.error('IndexedDB nicht initialisiert');
        return;
    }

    const editor = document.getElementById('editor');
    const titleInput = document.getElementById('entry-title');
    
    if (!titleInput || !editor) {
        console.error('Editor oder Title Input nicht gefunden');
        return;
    }
    
    const content = editor.innerHTML;
    const title = titleInput.value.trim();

    if (!title) {
        alert('Bitte geben Sie eine Überschrift ein!');
        titleInput.focus();
        return;
    }

    const transaction = db.transaction(['entries'], 'readwrite');
    const objectStore = transaction.objectStore('entries');
    
    if (currentEditId) {
        const getRequest = objectStore.get(currentEditId);
        getRequest.onsuccess = () => {
            const entry = getRequest.result;
            entry.title = title;
            entry.content = content;
            entry.lastModified = new Date().toISOString();
            
            const updateRequest = objectStore.put(entry);
            updateRequest.onsuccess = () => {
                alert('Änderungen wurden gespeichert!');
                currentEditId = null;
                window.location.href = 'index.html';
            };
        };
    } else {
        const maxOrderRequest = objectStore.getAll();
        maxOrderRequest.onsuccess = () => {
            const entries = maxOrderRequest.result;
            const maxOrder = entries.reduce((max, entry) => Math.max(max, entry.order || 0), 0);
            
            const entry = {
                title: title,
                content: content,
                date: new Date().toISOString(),
                order: maxOrder + 1
            };
            
            const addRequest = objectStore.add(entry);
            addRequest.onsuccess = () => {
                alert('Neuer Eintrag wurde gespeichert!');
                window.location.href = 'index.html';
            };
        };
    }
}

// Eintrag löschen
function confirmDelete(id) {
    if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
        deleteEntry(id);
    }
}

function deleteEntry(id) {
    if (!db) return;

    const transaction = db.transaction(['entries'], 'readwrite');
    const objectStore = transaction.objectStore('entries');
    const request = objectStore.delete(id);

    request.onsuccess = () => {
        loadEntries();
    };
}

// Eintrag bearbeiten
function editEntry(id) {
    window.location.href = `editor.html?edit=${id}`;
}

// Inhaltsverzeichnis anzeigen
function showTableOfContents() {
    if (!db) return;

    const transaction = db.transaction(['entries'], 'readonly');
    const objectStore = transaction.objectStore('entries');
    const request = objectStore.getAll();

    request.onsuccess = () => {
        const entries = request.result;
        const tocContent = document.getElementById('tocContent');
        tocContent.innerHTML = entries
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(entry => `
                <div class="toc-item" onclick="scrollToEntry(${entry.id})">
                    ${entry.title}
                </div>
            `).join('');
        
        document.getElementById('tocWindow').style.display = 'block';
    };
}

// Inhaltsverzeichnis schließen
function hideTocWindow() {
    document.getElementById('tocWindow').style.display = 'none';
}

// Zu Eintrag scrollen
function scrollToEntry(id) {
    const entry = document.querySelector(`.entry[data-id="${id}"]`);
    if (entry) {
        entry.scrollIntoView({ behavior: 'smooth' });
        entry.classList.add('highlight');
        setTimeout(() => entry.classList.remove('highlight'), 2000);
        hideTocWindow();
    }
}

// Inhaltsverzeichnis verschiebbar machen
const tocWindow = document.getElementById('tocWindow');
const tocHeader = document.querySelector('.toc-header');

let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

if (tocHeader) {
    tocHeader.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);
}

function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;

    if (e.target === tocHeader) {
        isDragging = true;
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, tocWindow);
    }
}

function dragEnd() {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
}

// Such-Funktionalität
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (!db) return;

        const transaction = db.transaction(['entries'], 'readonly');
        const objectStore = transaction.objectStore('entries');
        const request = objectStore.getAll();

        request.onsuccess = () => {
            const entries = request.result;
            const filteredEntries = entries.filter(entry => 
                entry.title.toLowerCase().includes(searchTerm) ||
                entry.content.toLowerCase().includes(searchTerm)
            );
            displayEntries(filteredEntries);
        };
    });
}

// Initialisierung beim Laden der Seite
window.addEventListener('load', initDB);// Backup erstellen Funktion
function exportEntries() {
    if (!db) {
        console.error('IndexedDB nicht initialisiert');
        alert('Datenbank ist noch nicht bereit. Bitte warten Sie einen Moment.');
        return;
    }

    const transaction = db.transaction(['entries'], 'readonly');
    const objectStore = transaction.objectStore('entries');
    const request = objectStore.getAll();

    request.onsuccess = () => {
        const entries = request.result;
        const dataStr = JSON.stringify(entries, null, 2); // Format as JSON

        // Generate filename with current date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE').replace(/\./g, '-'); // e.g., 24-07-2023
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-'); // e.g., 10-30-00
        const filename = `HTML-Glossar-Backup-${dateStr}-${timeStr}.json`;

        // Create a Blob and a download link
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Append to body to make it clickable

        a.click(); // Trigger the download

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    request.onerror = (event) => {
        console.error('Fehler beim Exportieren der Einträge:', event.target.error);
        alert('Fehler beim Erstellen des Backups.');
    };
}

// Import Funktion (Platzhalter, falls benötigt)
function importEntries(event) {
    console.log("Import Funktion wird ausgeführt...");
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedEntries = JSON.parse(e.target.result);
            console.log("Importierte Einträge:", importedEntries);

            if (!db) {
                console.error('IndexedDB nicht initialisiert');
                alert('Datenbank ist noch nicht bereit. Bitte warten Sie einen Moment.');
                return;
            }

            const transaction = db.transaction(['entries'], 'readwrite');
            const objectStore = transaction.objectStore('entries');

            // Clear existing entries before importing (optional, depending on desired behavior)
            // const clearRequest = objectStore.clear();
            // clearRequest.onsuccess = () => {
            //     console.log("Bestehende Einträge gelöscht.");
            //     // Add imported entries
            //     importedEntries.forEach(entry => {
            //         // Remove 'id' to let IndexedDB assign a new one
            //         delete entry.id;
            //         objectStore.add(entry);
            //     });
            //     transaction.oncomplete = () => {
            //         alert('Backup erfolgreich importiert!');
            //         loadEntries(); // Reload entries after import
            //     };
            //     transaction.onerror = (event) => {
            //         console.error('Fehler beim Importieren der Einträge:', event.target.error);
            //         alert('Fehler beim Importieren des Backups.');
            //     };
            // };
             // Add imported entries
             importedEntries.forEach(entry => {
                // Remove 'id' to let IndexedDB assign a new one
                delete entry.id;
                objectStore.add(entry);
            });
            transaction.oncomplete = () => {
                alert('Backup erfolgreich importiert!');
                loadEntries(); // Reload entries after import
            };
            transaction.onerror = (event) => {
                console.error('Fehler beim Importieren der Einträge:', event.target.error);
                alert('Fehler beim Importieren des Backups.');
            };


        } catch (e) {
            console.error('Fehler beim Parsen der JSON-Datei:', e);
            alert('Ungültiges Backup-Dateiformat.');
        }
    };
    reader.readAsText(file);
}
// Backup erstellen Funktion
function exportEntries() {
    if (!db) {
        console.error('IndexedDB nicht initialisiert');
        alert('Datenbank ist noch nicht bereit. Bitte warten Sie einen Moment.');
        return;
    }

    const transaction = db.transaction(['entries'], 'readonly');
    const objectStore = transaction.objectStore('entries');
    const request = objectStore.getAll();

    request.onsuccess = () => {
        const entries = request.result;
        const dataStr = JSON.stringify(entries, null, 2); // Format as JSON

        // Generate filename with current date and time
        const now = new Date();
        const dateStr = now.toLocaleDateString('de-DE').replace(/\./g, '-'); // e.g., 24-07-2023
        const timeStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/:/g, '-'); // e.g., 10-30-00
        const filename = `HTML-Glossar-Backup-${dateStr}-${timeStr}.json`;

        // Create a Blob and a download link
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a); // Append to body to make it clickable

        a.click(); // Trigger the download

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    request.onerror = (event) => {
        console.error('Fehler beim Exportieren der Einträge:', event.target.error);
        alert('Fehler beim Erstellen des Backups.');
    };
}

// Import Funktion (Platzhalter, falls benötigt)
function importEntries(event) {
    console.log("Import Funktion wird ausgeführt...");
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedEntries = JSON.parse(e.target.result);
            console.log("Importierte Einträge:", importedEntries);

            if (!db) {
                console.error('IndexedDB nicht initialisiert');
                alert('Datenbank ist noch nicht bereit. Bitte warten Sie einen Moment.');
                return;
            }

            const transaction = db.transaction(['entries'], 'readwrite');
            const objectStore = transaction.objectStore('entries');

            // Bestehende Einträge löschen, dann importieren
            const clearRequest = objectStore.clear();
            clearRequest.onsuccess = () => {
                console.log("Bestehende Einträge gelöscht.");

                importedEntries.forEach(entry => {
                    delete entry.id; // ID neu vergeben lassen
                    objectStore.add(entry);
                });

                transaction.oncomplete = () => {
                    alert('Backup erfolgreich importiert!');
                    loadEntries(); // Neu laden nach Import
                };
                transaction.onerror = (event) => {
                    console.error('Fehler beim Importieren der Einträge:', event.target.error);
                    alert('Fehler beim Importieren des Backups.');
                };
            };

            clearRequest.onerror = (event) => {
                console.error('Fehler beim Löschen bestehender Einträge:', event.target.error);
                alert('Fehler beim Zurücksetzen der Datenbank vor dem Import.');
            };

        } catch (e) {
            console.error('Fehler beim Parsen der JSON-Datei:', e);
            alert('Ungültiges Backup-Dateiformat.');
        }
    };
    reader.readAsText(file);
}

