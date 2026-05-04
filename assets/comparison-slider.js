/*
For licensing see accompanying LICENSE file.
Copyright (C) 2026 Apple Inc. All Rights Reserved.
*/

// Comparison slider for PICO compression results
const ComparisonSlider = {
    ZOOM_THRESHOLD_PIXELS: 500000,  // Images at or above this use 3x zoom
    ZOOM_2X_WIDTH_THRESHOLD: 512,   // Images below ZOOM_THRESHOLD_PIXELS use 2x if width > this, else 1x
    scenes: [
        'philipp-reiner-207',
        'kodim15',
        'kodak_kodim04',
        'sergey-zolkin-1045',
        'b1400e99ef413c8fee7d5c0be41d7d1e',
        'alexander-shustov-73',
        'amy-zhang-15940',
        'stefan-kunze-26931',
        'kodim23'
    ],
    methods: {
        'reference': 'Target',
        'hific': 'HiFiC',
        'dcvc': 'DCVC-RT',
        'vvc': 'VVC',
        'bpg': 'BPG'
    },
    currentScene: 'philipp-reiner-207',
    leftMethod: 'pico',  // Fixed to PICO
    rightMethod: 'vvc',
    bppData: null,
    sceneInitialPositions: {
        // Custom initial crop positions for each scene (x, y as percentages 0-100)
        // x: 0 = left edge, 50 = center, 100 = right edge
        // y: 0 = top edge, 50 = center, 100 = bottom edge
        // Scenes not listed here default to center crop (50, 50)
        'philipp-reiner-207': { x: 5, y: 28 },  // Countryside Sunset
        'b1400e99ef413c8fee7d5c0be41d7d1e': { x: 93, y: 52 },  // Highway Driving
        'alexander-shustov-73': { x: 74, y: 76 },  // Rustic Bicycle Shed
        'amy-zhang-15940': { x: 57, y: 80 },  // Mountain Prayer Flags
        'stefan-kunze-26931': { x: 35, y: 68 },  // Coastal Mountain Road
    },

    // Pure function: compute center pan position given image and container dims
    calcCenter(imageWidth, imageHeight, containerWidth, containerHeight) {
        return {
            x: (imageWidth - containerWidth) / 2,
            y: (imageHeight - containerHeight) / 2
        };
    },

    // Pure function: compute max pan given image and container dims
    calcMaxPan(imageWidth, imageHeight, containerWidth, containerHeight) {
        return {
            x: Math.max(imageWidth - containerWidth, 0),
            y: Math.max(imageHeight - containerHeight, 0)
        };
    },

    async init() {
        // Load BPP data
        try {
            const response = await fetch('assets/bpp_data.json');
            this.bppData = await response.json();
        } catch (error) {
            console.error('Failed to load BPP data:', error);
            this.bppData = {};
        }

        // Initialize pan to center from the start
        this.panX = undefined;
        this.panY = undefined;

        this.createSceneThumbnails();
        this.createMethodTabs();
        this.loadComparison();
        this.setupSlider();
    },

    createSceneThumbnails() {
        const container = document.getElementById('scene-thumbnails');
        this.scenes.forEach(scene => {
            const thumb = document.createElement('div');
            thumb.className = 'scene-thumb' + (scene === this.currentScene ? ' thumb-active' : '');
            thumb.onclick = () => this.selectScene(scene, thumb);

            const img = document.createElement('img');
            img.src = `assets/scenes/${scene}/thumb.png`;
            img.alt = scene;

            thumb.appendChild(img);
            // Removed label - no text on thumbnails
            container.appendChild(thumb);
        });
    },

    createMethodTabs() {
        const rightContainer = document.getElementById('right-method-tabs');

        Object.entries(this.methods).forEach(([key, label], index) => {
            const tab = document.createElement('button');
            tab.className = 'method-tab';
            tab.setAttribute('data-method', key);
            tab.textContent = label;
            tab.onclick = () => this.selectMethod(key, tab);

            // Add reference-tab class for gradient styling
            if (key === 'reference') {
                tab.classList.add('reference-tab');
            }

            const isActive = (key === this.rightMethod);
            if (isActive) tab.classList.add('active');

            rightContainer.appendChild(tab);
        });

        // Update BPP display for initial state
        this.updateBppDisplay();
    },

    selectScene(scene, thumbElement) {
        this.currentScene = scene;
        document.querySelectorAll('.scene-thumb').forEach(thumb => thumb.classList.remove('thumb-active'));
        thumbElement.classList.add('thumb-active');

        // Reset pan to center when changing scenes
        this.panX = undefined;
        this.panY = undefined;

        // Update BPP display first (may change rightMethod if current codec unavailable)
        this.updateBppDisplay();
        this.loadComparison();
    },

    selectMethod(method, tabElement) {
        this.rightMethod = method;
        document.querySelectorAll('#right-method-tabs .method-tab').forEach(tab => tab.classList.remove('active'));
        tabElement.classList.add('active');

        // Keep pan position when changing methods (don't reset)

        this.loadComparison();
        this.updateBppDisplay();
    },

    updateBppDisplay() {
        if (!this.bppData || !this.bppData[this.currentScene]) return;

        const sceneBpp = this.bppData[this.currentScene];

        // Update left button (PICO)
        const leftButton = document.querySelector('.left-selector button span');
        if (leftButton && sceneBpp.pico) {
            leftButton.textContent = `PICO (Ours)\n${sceneBpp.pico} bpp`;
        }

        // Update right buttons: show/hide based on codec availability, update BPP text
        let activeMethodHidden = false;
        Object.entries(this.methods).forEach(([key, label]) => {
            const tab = document.querySelector(`[data-method="${key}"]`);
            if (!tab) return;

            // Reference is always available; other codecs require bpp data
            const isAvailable = key === 'reference' || !!sceneBpp[key];

            tab.style.display = isAvailable ? '' : 'none';

            if (!isAvailable && key === this.rightMethod) {
                activeMethodHidden = true;
            }

            if (isAvailable) {
                if (key === 'reference') {
                    tab.textContent = label;
                } else {
                    tab.textContent = `${label}\n${sceneBpp[key]} bpp`;
                }
            }
        });

        // If the active right method is not available for this scene, fall back to VVC
        if (activeMethodHidden) {
            this.rightMethod = 'vvc';
            document.querySelectorAll('#right-method-tabs .method-tab').forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-method') === 'vvc');
            });
        }
    },

    getImagePath(scene, method) {
        const methodMap = {
            'reference': 'reference.png',
            'hific': 'hific.png',
            'dcvc': 'dcvc.png',
            'vvc': 'vvc.png',
            'bpg': 'bpg.png',
            'pico': 'pico.png'
        };
        return `assets/scenes/${scene}/${methodMap[method]}`;
    },

    showSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('show');
        }
    },

    hideSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.remove('show');
        }
    },

    loadComparison() {
        const leftImg = document.getElementById('comparison-left-img');
        const rightImg = document.getElementById('comparison-right-img');
        const container = document.querySelector('.comparison-slider');

        // Show spinner at the start of loading
        this.showSpinner();

        // Track loading state of both images
        let leftLoaded = false;
        let rightLoaded = false;

        const checkBothLoaded = () => {
            if (leftLoaded && rightLoaded) {
                this.setupImageZoom();
                this.hideSpinner();
            }
        };

        // Set onload handlers before src to avoid missing cached image loads
        leftImg.onload = () => {
            leftLoaded = true;
            checkBothLoaded();
        };

        rightImg.onload = () => {
            rightLoaded = true;
            checkBothLoaded();
        };

        // Handle loading errors
        leftImg.onerror = () => {
            leftLoaded = true;
            checkBothLoaded();
            console.error('Failed to load left image');
        };

        rightImg.onerror = () => {
            rightLoaded = true;
            checkBothLoaded();
            console.error('Failed to load right image');
        };

        // Set sources to trigger loading
        leftImg.src = this.getImagePath(this.currentScene, this.leftMethod);
        rightImg.src = this.getImagePath(this.currentScene, this.rightMethod);
    },

    setupImageZoom() {
        const leftImg = document.getElementById('comparison-left-img');
        const rightImg = document.getElementById('comparison-right-img');
        const container = document.querySelector('.comparison-slider');

        const containerWidth = container.offsetWidth;

        // Calculate zoom based on image resolution and width
        const imagePixels = rightImg.naturalWidth * rightImg.naturalHeight;
        let zoomFactor;
        if (imagePixels >= this.ZOOM_THRESHOLD_PIXELS) {
            zoomFactor = 3;
        } else if (rightImg.naturalWidth > this.ZOOM_2X_WIDTH_THRESHOLD) {
            zoomFactor = 1.6;
        } else {
            zoomFactor = 1;
        }

        // Set container height only once (first load), then keep it fixed
        if (!this.containerHeightSet) {
            if (rightImg.naturalWidth && rightImg.naturalHeight) {
                const aspectRatio = rightImg.naturalHeight / rightImg.naturalWidth;
                // Use aspect ratio but ensure minimum height of 500px
                const containerHeight = Math.max(containerWidth * aspectRatio, 500);
                container.style.height = containerHeight + 'px';
                this.containerHeightSet = true;
                this.fixedContainerHeight = containerHeight;
            }
        }

        // Set images to dynamic zoom (1x, 2x, or 3x based on resolution)
        leftImg.style.width = (containerWidth * zoomFactor) + 'px';
        leftImg.style.height = 'auto';
        rightImg.style.width = (containerWidth * zoomFactor) + 'px';
        rightImg.style.height = 'auto';

        // Calculate actual image dimensions at current zoom level
        const imageWidth = containerWidth * zoomFactor;
        const imageHeight = rightImg.naturalHeight / rightImg.naturalWidth * imageWidth;

        // Store actual image dimensions for pan constraints
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;

        // Initialize pan to center if not already set, otherwise keep existing pan position
        if (this.panX === undefined || this.panY === undefined) {
            // Check if this scene has custom initial position
            const customPosition = this.sceneInitialPositions[this.currentScene];

            if (customPosition) {
                // Calculate max pan bounds
                const maxPan = this.calcMaxPan(imageWidth, imageHeight, containerWidth, this.fixedContainerHeight || containerWidth);

                // Convert percentages to pixel positions
                // 0% = 0px, 100% = maxPan
                this.panX = (customPosition.x / 100) * maxPan.x;
                this.panY = (customPosition.y / 100) * maxPan.y;
            } else {
                // Fallback to center
                const center = this.calcCenter(imageWidth, imageHeight, containerWidth, this.fixedContainerHeight || containerWidth);
                this.panX = center.x;
                this.panY = center.y;
            }
        }

        this.updateImageTransforms();
    },

    updateImageTransforms() {
        const leftImg = document.getElementById('comparison-left-img');
        const rightImg = document.getElementById('comparison-right-img');

        const transform = `translate(${-this.panX}px, ${-this.panY}px)`;
        leftImg.style.transform = transform;
        rightImg.style.transform = transform;
    },

    setupSlider() {
        const dragElement = document.querySelector('.divider');
        const resizeElement = document.querySelector('.resize');
        const container = document.querySelector('.comparison-slider');

        // Pan state flags only - panX/panY are set by setupImageZoom()
        this.isPanning = false;
        this.isDraggingDivider = false;

        let touched = false;
        window.addEventListener('touchstart', () => { touched = true; });
        window.addEventListener('touchend', () => { touched = false; });

        // Divider drag handler
        const startDividerDrag = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isDraggingDivider = true;
            dragElement.classList.add('draggable');
            resizeElement.classList.add('resizable');

            const startX = e.pageX || (e.touches && e.touches[0].pageX);
            const dragWidth = dragElement.offsetWidth;
            const posX = dragElement.getBoundingClientRect().left + dragWidth - startX;
            const containerRect = container.getBoundingClientRect();
            const containerOffset = containerRect.left;
            const containerWidth = containerRect.width;
            const minLeft = 10;
            const maxLeft = containerWidth - dragWidth - 10;

            const onDividerMove = (e) => {
                if (!touched) e.preventDefault();
                const moveX = e.pageX || (e.touches && e.touches[0].pageX);
                let leftValue = moveX + posX - dragWidth - containerOffset;
                leftValue = Math.min(Math.max(leftValue, minLeft), maxLeft);
                const widthValue = ((leftValue + dragWidth / 2) / containerWidth * 100) + "%";

                dragElement.style.left = widthValue;
                resizeElement.style.width = widthValue;
            };

            const onDividerEnd = () => {
                this.isDraggingDivider = false;
                dragElement.classList.remove('draggable');
                resizeElement.classList.remove('resizable');
                document.removeEventListener('mousemove', onDividerMove);
                document.removeEventListener('mouseup', onDividerEnd);
                document.removeEventListener('touchmove', onDividerMove);
                document.removeEventListener('touchend', onDividerEnd);
            };

            document.addEventListener('mousemove', onDividerMove);
            document.addEventListener('mouseup', onDividerEnd);
            document.addEventListener('touchmove', onDividerMove);
            document.addEventListener('touchend', onDividerEnd);
        };

        // Pan handler for the container
        const startPan = (e) => {
            // Don't pan if clicking on divider, buttons, or selectors
            if (e.target === dragElement || dragElement.contains(e.target)) {
                return;
            }
            if (e.target.closest('.left-selector') || e.target.closest('.right-selector')) {
                return;
            }

            e.preventDefault();
            this.isPanning = true;
            container.classList.add('panning');

            const startX = e.pageX || (e.touches && e.touches[0].pageX);
            const startY = e.pageY || (e.touches && e.touches[0].pageY);
            const startPanX = this.panX;
            const startPanY = this.panY;

            const containerRect = container.getBoundingClientRect();
            const rightImg = document.getElementById('comparison-right-img');

            // Calculate zoom factor for fallback (if imageWidth/imageHeight not set)
            const imagePixels = rightImg.naturalWidth * rightImg.naturalHeight;
            const zoomFactor = imagePixels < this.ZOOM_THRESHOLD_PIXELS ? 1 : 3;

            // Use actual image dimensions for pan constraints
            const maxPan = this.calcMaxPan(
                this.imageWidth || containerRect.width * zoomFactor,
                this.imageHeight || containerRect.height * zoomFactor,
                containerRect.width,
                containerRect.height
            );

            const onPanMove = (e) => {
                if (!this.isPanning) return;
                if (!touched) e.preventDefault();

                const moveX = e.pageX || (e.touches && e.touches[0].pageX);
                const moveY = e.pageY || (e.touches && e.touches[0].pageY);

                const deltaX = moveX - startX;
                const deltaY = moveY - startY;

                // Update pan with constraints
                this.panX = Math.min(Math.max(startPanX - deltaX, 0), maxPan.x);
                this.panY = Math.min(Math.max(startPanY - deltaY, 0), maxPan.y);

                this.updateImageTransforms();
            };

            const onPanEnd = () => {
                this.isPanning = false;
                container.classList.remove('panning');
                document.removeEventListener('mousemove', onPanMove);
                document.removeEventListener('mouseup', onPanEnd);
                document.removeEventListener('touchmove', onPanMove);
                document.removeEventListener('touchend', onPanEnd);
            };

            document.addEventListener('mousemove', onPanMove);
            document.addEventListener('mouseup', onPanEnd);
            document.addEventListener('touchmove', onPanMove);
            document.addEventListener('touchend', onPanEnd);
        };

        // Attach event listeners
        dragElement.addEventListener('mousedown', startDividerDrag);
        dragElement.addEventListener('touchstart', startDividerDrag);

        container.addEventListener('mousedown', startPan);
        container.addEventListener('touchstart', startPan);
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ComparisonSlider.init());
} else {
    ComparisonSlider.init();
}
