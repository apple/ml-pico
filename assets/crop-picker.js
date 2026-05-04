/*
For licensing see accompanying LICENSE file.
Copyright (C) 2026 Apple Inc. All Rights Reserved.
*/

// Crop Position Picker Tool
const CropPicker = {
    scenes: [
        'philipp-reiner-207',
        '1035a35332e08ee1e7793f7be86d6ca1',
        '26f350af0f6ee2fb314606ebc2b56e56',
        '7a663d483f843a589bc41698ce3257e7',
        '90b622e11ecc37edd42297427403ee81',
        'b1400e99ef413c8fee7d5c0be41d7d1e',
        'alexander-shustov-73',
        'amy-zhang-15940',
        'dogancan-ozturan-395',
        'stefan-kunze-26931'
    ],

    sceneNames: {
        'philipp-reiner-207': 'Countryside Sunset',
        '1035a35332e08ee1e7793f7be86d6ca1': 'Korean Palace Gate',
        '26f350af0f6ee2fb314606ebc2b56e56': 'Stockholm Subway',
        '7a663d483f843a589bc41698ce3257e7': 'Lakeside Village',
        '90b622e11ecc37edd42297427403ee81': 'Modern Urban Street',
        'b1400e99ef413c8fee7d5c0be41d7d1e': 'Highway Driving',
        'alexander-shustov-73': 'Rustic Bicycle Shed',
        'amy-zhang-15940': 'Mountain Prayer Flags',
        'dogancan-ozturan-395': 'Vintage Bar',
        'stefan-kunze-26931': 'Coastal Mountain Road'
    },

    currentScene: null,
    currentSceneIndex: 0,
    panX: 0,
    panY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    savedPositions: {},
    containerHeightSet: false,
    fixedContainerHeight: null,
    imageWidth: null,
    imageHeight: null,

    init() {
        this.currentScene = this.scenes[0];
        this.loadSavedPositions();
        this.populateSceneSelector();
        this.setupEventListeners();
        this.loadImage();
    },

    loadSavedPositions() {
        const saved = localStorage.getItem('cropPickerPositions');
        if (saved) {
            try {
                this.savedPositions = JSON.parse(saved);
                this.updateSavedCount();
            } catch (e) {
                console.error('Failed to load saved positions:', e);
                this.savedPositions = {};
            }
        }
    },

    saveTolocalStorage() {
        localStorage.setItem('cropPickerPositions', JSON.stringify(this.savedPositions));
    },

    populateSceneSelector() {
        const select = document.getElementById('scene-select');
        this.scenes.forEach((scene, index) => {
            const option = document.createElement('option');
            option.value = index;
            const savedMark = this.savedPositions[scene] ? ' ✓' : '';
            option.textContent = `${index + 1}. ${this.sceneNames[scene]}${savedMark}`;
            select.appendChild(option);
        });
        select.value = this.currentSceneIndex;
    },

    setupEventListeners() {
        const viewer = document.getElementById('crop-viewer');
        const img = document.getElementById('crop-viewer-img');

        // Mouse events for panning
        viewer.addEventListener('mousedown', (e) => this.startPan(e));
        document.addEventListener('mousemove', (e) => this.doPan(e));
        document.addEventListener('mouseup', () => this.endPan());

        // Touch events for mobile
        viewer.addEventListener('touchstart', (e) => this.startPan(e.touches[0]));
        document.addEventListener('touchmove', (e) => this.doPan(e.touches[0]));
        document.addEventListener('touchend', () => this.endPan());

        // Keyboard events for fine control
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Button events
        document.getElementById('prev-scene').addEventListener('click', () => this.prevScene());
        document.getElementById('next-scene').addEventListener('click', () => this.nextScene());
        document.getElementById('scene-select').addEventListener('change', (e) => {
            this.currentSceneIndex = parseInt(e.target.value);
            this.currentScene = this.scenes[this.currentSceneIndex];
            this.loadImage();
        });
        document.getElementById('save-position').addEventListener('click', () => this.savePosition());
        document.getElementById('reset-center').addEventListener('click', () => this.resetToCenter());
        document.getElementById('export-positions').addEventListener('click', () => this.exportPositions());
        document.getElementById('copy-positions').addEventListener('click', () => this.copyToClipboard());

        // Image load event
        img.addEventListener('load', () => this.onImageLoad());
    },

    loadImage() {
        const img = document.getElementById('crop-viewer-img');
        const path = `assets/scenes/${this.currentScene}/reference.png`;
        img.src = path;
        this.updateStatus('Loading image...');
    },

    onImageLoad() {
        const img = document.getElementById('crop-viewer-img');
        const container = document.getElementById('crop-viewer');
        const containerWidth = container.offsetWidth;

        // Set container height only once
        if (!this.containerHeightSet) {
            if (img.naturalWidth && img.naturalHeight) {
                const aspectRatio = img.naturalHeight / img.naturalWidth;
                const containerHeight = Math.max(containerWidth * aspectRatio, 500);
                container.style.height = containerHeight + 'px';
                this.containerHeightSet = true;
                this.fixedContainerHeight = containerHeight;
            }
        }

        // Set image to 3x container size
        this.imageWidth = containerWidth * 3;
        img.style.width = this.imageWidth + 'px';
        img.style.height = 'auto';

        // Calculate actual image height
        this.imageHeight = (img.naturalHeight / img.naturalWidth) * this.imageWidth;

        // Load saved position for this scene or center
        if (this.savedPositions[this.currentScene]) {
            this.applyPercentagePosition(
                this.savedPositions[this.currentScene].x,
                this.savedPositions[this.currentScene].y
            );
        } else {
            this.resetToCenter();
        }

        this.updateStatus(`Scene ${this.currentSceneIndex + 1}/10: ${this.sceneNames[this.currentScene]}`);
        this.updatePositionDisplay();
    },

    startPan(e) {
        this.isPanning = true;
        this.startX = e.pageX - this.panX;
        this.startY = e.pageY - this.panY;
    },

    doPan(e) {
        if (!this.isPanning) return;
        e.preventDefault();

        const container = document.getElementById('crop-viewer');
        const containerWidth = container.offsetWidth;
        const containerHeight = this.fixedContainerHeight || container.offsetHeight;

        const newPanX = e.pageX - this.startX;
        const newPanY = e.pageY - this.startY;

        const maxPanX = Math.max(this.imageWidth - containerWidth, 0);
        const maxPanY = Math.max(this.imageHeight - containerHeight, 0);

        this.panX = Math.max(0, Math.min(newPanX, maxPanX));
        this.panY = Math.max(0, Math.min(newPanY, maxPanY));

        this.updateImageTransform();
        this.updatePositionDisplay();
    },

    endPan() {
        this.isPanning = false;
    },

    handleKeyboard(e) {
        const step = e.shiftKey ? 10 : 1;
        let updated = false;

        switch (e.key) {
            case 'ArrowLeft':
                this.panX = Math.max(0, this.panX - step);
                updated = true;
                break;
            case 'ArrowRight':
                const maxPanX = Math.max(this.imageWidth - document.getElementById('crop-viewer').offsetWidth, 0);
                this.panX = Math.min(maxPanX, this.panX + step);
                updated = true;
                break;
            case 'ArrowUp':
                this.panY = Math.max(0, this.panY - step);
                updated = true;
                break;
            case 'ArrowDown':
                const maxPanY = Math.max(this.imageHeight - this.fixedContainerHeight, 0);
                this.panY = Math.min(maxPanY, this.panY + step);
                updated = true;
                break;
        }

        if (updated) {
            e.preventDefault();
            this.updateImageTransform();
            this.updatePositionDisplay();
        }
    },

    updateImageTransform() {
        const img = document.getElementById('crop-viewer-img');
        img.style.transform = `translate(${-this.panX}px, ${-this.panY}px)`;
    },

    updatePositionDisplay() {
        const percent = this.calculatePercentagePosition();
        document.getElementById('current-x').textContent = percent.x;
        document.getElementById('current-y').textContent = percent.y;
        document.getElementById('pixel-x').textContent = Math.round(this.panX);
        document.getElementById('pixel-y').textContent = Math.round(this.panY);
    },

    calculatePercentagePosition() {
        const container = document.getElementById('crop-viewer');
        const containerWidth = container.offsetWidth;
        const containerHeight = this.fixedContainerHeight || container.offsetHeight;

        const maxPanX = Math.max(this.imageWidth - containerWidth, 0);
        const maxPanY = Math.max(this.imageHeight - containerHeight, 0);

        const percentX = maxPanX > 0 ? (this.panX / maxPanX) * 100 : 50;
        const percentY = maxPanY > 0 ? (this.panY / maxPanY) * 100 : 50;

        return { x: Math.round(percentX), y: Math.round(percentY) };
    },

    applyPercentagePosition(percentX, percentY) {
        const container = document.getElementById('crop-viewer');
        const containerWidth = container.offsetWidth;
        const containerHeight = this.fixedContainerHeight || container.offsetHeight;

        const maxPanX = Math.max(this.imageWidth - containerWidth, 0);
        const maxPanY = Math.max(this.imageHeight - containerHeight, 0);

        this.panX = (percentX / 100) * maxPanX;
        this.panY = (percentY / 100) * maxPanY;

        this.updateImageTransform();
        this.updatePositionDisplay();
    },

    resetToCenter() {
        const container = document.getElementById('crop-viewer');
        const containerWidth = container.offsetWidth;
        const containerHeight = this.fixedContainerHeight || container.offsetHeight;

        this.panX = Math.max(0, (this.imageWidth - containerWidth) / 2);
        this.panY = Math.max(0, (this.imageHeight - containerHeight) / 2);

        this.updateImageTransform();
        this.updatePositionDisplay();
    },

    savePosition() {
        const percent = this.calculatePercentagePosition();
        this.savedPositions[this.currentScene] = { x: percent.x, y: percent.y };
        this.saveTolocalStorage();
        this.updateSavedCount();
        this.updateSceneSelector();
        this.updateStatus(`✓ Position saved for ${this.sceneNames[this.currentScene]}`);
        this.exportPositions();
    },

    updateSavedCount() {
        const count = Object.keys(this.savedPositions).length;
        document.getElementById('saved-count').textContent = count;
    },

    updateSceneSelector() {
        const select = document.getElementById('scene-select');
        const currentValue = select.value;
        select.innerHTML = '';
        this.populateSceneSelector();
        select.value = currentValue;
    },

    updateStatus(message) {
        document.getElementById('status-text').textContent = message;
    },

    prevScene() {
        this.currentSceneIndex = (this.currentSceneIndex - 1 + this.scenes.length) % this.scenes.length;
        this.currentScene = this.scenes[this.currentSceneIndex];
        document.getElementById('scene-select').value = this.currentSceneIndex;
        this.loadImage();
    },

    nextScene() {
        this.currentSceneIndex = (this.currentSceneIndex + 1) % this.scenes.length;
        this.currentScene = this.scenes[this.currentSceneIndex];
        document.getElementById('scene-select').value = this.currentSceneIndex;
        this.loadImage();
    },

    exportPositions() {
        let output = 'sceneInitialPositions: {\n';
        output += '    // Custom initial crop positions for each scene (x, y as percentages 0-100)\n';
        output += '    // x: 0 = left edge, 50 = center, 100 = right edge\n';
        output += '    // y: 0 = top edge, 50 = center, 100 = bottom edge\n';
        output += '    // Scenes not listed here default to center crop (50, 50)\n';

        this.scenes.forEach(scene => {
            if (this.savedPositions[scene]) {
                const pos = this.savedPositions[scene];
                const name = this.sceneNames[scene];
                output += `    '${scene}': { x: ${pos.x}, y: ${pos.y} },  // ${name}\n`;
            }
        });

        output += '},';

        document.getElementById('positions-output').textContent = output;
    },

    async copyToClipboard() {
        const text = document.getElementById('positions-output').textContent;
        try {
            await navigator.clipboard.writeText(text);
            this.updateStatus('✓ Copied to clipboard!');
            setTimeout(() => {
                this.updateStatus(`Scene ${this.currentSceneIndex + 1}/10: ${this.sceneNames[this.currentScene]}`);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback: select the text
            const output = document.getElementById('positions-output');
            const range = document.createRange();
            range.selectNodeContents(output);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            this.updateStatus('Text selected - press Cmd+C to copy');
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    CropPicker.init();
});
