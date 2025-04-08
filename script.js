document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('search-input');
    const roleFilterButtons = document.querySelectorAll('#role-filters button');
    const tagFilterButtons = document.querySelectorAll('#tag-filters button');
    const commandCards = document.querySelectorAll('.command-card');
    const commandHeaders = document.querySelectorAll('.command-header');
    const copyButtons = document.querySelectorAll('.copy-btn');
    const contentArea = document.querySelector('.content-area');

    const pageMapList = document.getElementById('map-list');
    const pageMap = document.getElementById('page-map');
    const pageMapContainer = document.getElementById('page-map-container');

    const fullscreenOverlay = document.getElementById('fullscreen-overlay');
    const fullscreenImageContainer = document.querySelector('.fullscreen-image-container');
    const fullscreenImage = document.getElementById('fullscreen-image');
    const fullscreenClose = document.getElementById('fullscreen-close');
    const fullscreenPrevBtn = document.getElementById('fullscreen-prev');
    const fullscreenNextBtn = document.getElementById('fullscreen-next');
    const fullscreenDotsContainer = document.getElementById('fullscreen-dots');
    const fullscreenCounter = document.getElementById('fullscreen-counter');
    const fullscreenZoomInBtn = document.getElementById('fullscreen-zoom-in');
    const fullscreenZoomOutBtn = document.getElementById('fullscreen-zoom-out');
    const fullscreenZoomResetBtn = document.getElementById('fullscreen-zoom-reset');

    let mapLinks = [];
    let cardsObserver;
    let currentActiveMapLink = null;
    let fullscreenImageList = [];
    let currentFullscreenIndex = -1;
    let fullscreenDots = [];

    let currentZoom = 1;
    let minZoom = 1;
    let maxZoom = 5;
    let zoomStep = 0.2;
    let isDragging = false;
    let startX, startY, translateX = 0, translateY = 0;
    let isFullscreenPanning = false; 

    function generatePageMap() {
        if (!pageMapList) return;
        pageMapList.innerHTML = '';

        commandCards.forEach((card, index) => {
            const id = card.id || `cmd-${index + 1}`; 
            if (!card.id) card.id = id; 
            const title = card.querySelector('.command-title')?.textContent || `Command ${card.querySelector('.command-number')?.textContent || index + 1}`;

            const listItem = document.createElement('li');
            listItem.classList.add('map-item');
            const link = document.createElement('a');
            link.classList.add('map-link');
            link.href = `#${id}`;
            link.textContent = title;
            link.dataset.targetId = id;

            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetElement = document.getElementById(id);
                if (targetElement) {

                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start' 
                    });

                    setTimeout(() => {
                        const targetHeader = targetElement.querySelector('.command-header');
                        if (targetElement.classList.contains('collapsed') && targetHeader) {
                            targetHeader.click();
                        }

                        updateActiveMapLink(link);
                    }, 350); 
                }
            });

            listItem.appendChild(link);
            pageMapList.appendChild(listItem);
        });
        mapLinks = Array.from(pageMapList.querySelectorAll('.map-link'));
    }

    function updateActiveMapLink(newActiveLink) {
        if (newActiveLink && newActiveLink !== currentActiveMapLink) {
            if (currentActiveMapLink) {
                currentActiveMapLink.classList.remove('active');
            }
            newActiveLink.classList.add('active');
            currentActiveMapLink = newActiveLink;

            if (pageMap && pageMap.scrollHeight > pageMap.clientHeight) {
                const mapRect = pageMap.getBoundingClientRect();
                const linkRect = currentActiveMapLink.getBoundingClientRect();
                if (linkRect.top < mapRect.top || linkRect.bottom > mapRect.bottom) {
                    currentActiveMapLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    }

    function setupIntersectionObserver() {
        if (!pageMapContainer || window.innerWidth < 1024 || mapLinks.length === 0) {
            if (cardsObserver) cardsObserver.disconnect();
            return;
        }

        const topMargin = -Math.floor(window.innerHeight * 0.3); 
        const bottomMargin = -Math.floor(window.innerHeight * 0.3); 

        const options = {
            root: null, 
            rootMargin: `${topMargin}px 0px ${bottomMargin}px 0px`,
            threshold: 0 
        };

        const callback = (entries) => {
             let bestCandidateEntry = null;

             entries.forEach(entry => {

                 if (entry.isIntersecting) {

                     if (!bestCandidateEntry) {
                         bestCandidateEntry = entry;
                     }
                 }
             });

             if (bestCandidateEntry) {
                 const targetId = bestCandidateEntry.target.id;
                 const newActiveLink = mapLinks.find(link => link.dataset.targetId === targetId);
                  updateActiveMapLink(newActiveLink);
             }
        };

        if (cardsObserver) cardsObserver.disconnect();
        cardsObserver = new IntersectionObserver(callback, options);

        commandCards.forEach(card => {
            if (!card.classList.contains('hidden')) {
                cardsObserver.observe(card); 
            }
        });
    }

    function refreshObserver() {
        if (window.innerWidth < 1024) {
            if (cardsObserver) cardsObserver.disconnect();
            if (currentActiveMapLink) {
                currentActiveMapLink.classList.remove('active');
                currentActiveMapLink = null;
            }
            return;
        }

        if (cardsObserver) {
            cardsObserver.disconnect(); 

            commandCards.forEach(card => {
                if (!card.classList.contains('hidden')) {
                    cardsObserver.observe(card);
                }
            });
        } else {
            setupIntersectionObserver(); 
        }
    }

    function filterAndSearchCommands() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const activeRoleFilterBtn = document.querySelector('#role-filters button.active');
        const activeTagFilterBtn = document.querySelector('#tag-filters button.active');
        const activeRole = activeRoleFilterBtn ? activeRoleFilterBtn.dataset.filter : 'all';
        const activeTag = activeTagFilterBtn ? activeTagFilterBtn.dataset.filter : 'all';
        let hasVisibleCards = false;

        commandCards.forEach(card => {
            const tags = (card.dataset.tags || '').toLowerCase().split(' ');
            const cardRole = (card.dataset.role || '').toLowerCase(); 
            const cardText = (
                card.querySelector('.command-title')?.textContent + ' ' +
                card.querySelector('.purpose')?.textContent + ' ' +
                Array.from(card.querySelectorAll('.command-usage')).map(el => el.textContent).join(' ') + ' ' +
                Array.from(card.querySelectorAll('.notes-list li')).map(el => el.textContent).join(' ')
            ).toLowerCase();

            const roleMatch = activeRole === 'all' || cardRole.includes(activeRole); 
            const tagMatch = activeTag === 'all' || tags.includes(activeTag);
            const searchMatch = searchTerm === '' || cardText.includes(searchTerm);
            const shouldBeVisible = roleMatch && tagMatch && searchMatch;

            card.classList.toggle('hidden', !shouldBeVisible);
            if (shouldBeVisible) hasVisibleCards = true;
        });

        refreshObserver(); 

    }

    function handleFilterClick(buttonGroupSelector) {
        const buttons = document.querySelectorAll(`${buttonGroupSelector} button`);
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const currentlyActive = document.querySelector(`${buttonGroupSelector} button.active`);
                if (currentlyActive) {
                    currentlyActive.classList.remove('active');
                    currentlyActive.setAttribute('aria-pressed', 'false');
                }
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');
                filterAndSearchCommands();
            });
        });
    }

    commandHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const card = this.closest('.command-card');
            if (!card) return;
            const isCollapsed = card.classList.toggle('collapsed');
            this.setAttribute('aria-expanded', String(!isCollapsed));
        });

        const card = header.closest('.command-card');
        if (card) {
            header.setAttribute('aria-expanded', String(!card.classList.contains('collapsed')));
        }
    });

    copyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); 
            const commandUsageContainer = this.closest('.command-usage-container');
            if (!commandUsageContainer) return;
            const commandUsageDiv = commandUsageContainer.querySelector('.command-usage');
            if (!commandUsageDiv) return;

            const usageClone = commandUsageDiv.cloneNode(true);
            usageClone.querySelectorAll('.param, .optional').forEach(span => {
                span.replaceWith(document.createTextNode(span.textContent));
            });
            let textToCopy = usageClone.textContent.trim();

            if (textToCopy.startsWith('Right-click on a user -> Apps ->') || textToCopy.startsWith('Click the corresponding button')) {
                textToCopy = 'This action is performed via UI interaction in Discord, not by typing a command.';
                alert(textToCopy);
                return;
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.classList.add('copied');
                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 1500);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                alert('Failed to copy command.');
            });
        });
    });

    document.querySelectorAll('.image-area').forEach(area => {
        const container = area.querySelector('.carousel-container');
        const dotsContainer = area.querySelector('.carousel-dots');
        const images = Array.from(container?.querySelectorAll('img') ?? []);

        if (!container || images.length <= 1) {
            if (dotsContainer) dotsContainer.style.display = 'none';
            if (images.length === 1) {
                images[0].style.cursor = 'zoom-in';
                images[0].draggable = false;
                images[0].setAttribute('data-fullscreenable', 'true');
            }
            return;
        }

        let isDown = false, startX, scrollLeftStart, dots = [];
        let scrollEndTimer;

        dotsContainer.innerHTML = '';
        images.forEach((img, i) => {
            const dot = document.createElement('button');
            dot.classList.add('dot');
            dot.setAttribute('aria-label', `Go to image ${i + 1}`);
            dot.addEventListener('click', () => {
                snapToImage(i); 
            });
            dotsContainer.appendChild(dot);
            dots.push(dot);

            img.setAttribute('data-fullscreenable', 'true');
            img.style.cursor = 'zoom-in';
            img.draggable = false;
        });

        const updateActiveDot = (targetIndex = -1) => {
            requestAnimationFrame(() => {
                if (images.length === 0) return;
                let activeIndex = targetIndex;

                if (activeIndex === -1) {
                    const containerWidth = container.offsetWidth;
                    if (containerWidth === 0) return;
                    const scrollCenter = container.scrollLeft + containerWidth / 2;
                    let minDistance = Infinity;
                    for (let i = 0; i < images.length; i++) {
                        const imgCenter = i * containerWidth + containerWidth / 2;
                        const distance = Math.abs(scrollCenter - imgCenter);
                        if (distance < minDistance) {
                            minDistance = distance;
                            activeIndex = i;
                        }
                    }
                    activeIndex = Math.max(0, Math.min(images.length - 1, activeIndex));
                }

                dots.forEach((dot, i) => {
                    const isActive = i === activeIndex;
                    dot.classList.toggle('active', isActive);
                    dot.setAttribute('aria-pressed', String(isActive));
                });
            });
        };

        const snapToImage = (targetIndex = -1) => {
            if (images.length === 0) return;
            const containerWidth = container.offsetWidth;
            if (containerWidth === 0) return;

            if (targetIndex === -1) {
                const currentScroll = container.scrollLeft;
                targetIndex = Math.round(currentScroll / containerWidth);
                targetIndex = Math.max(0, Math.min(images.length - 1, targetIndex));
            }

            const targetScroll = targetIndex * containerWidth;

            if (Math.abs(container.scrollLeft - targetScroll) > 1) {
                container.scrollTo({ left: targetScroll, behavior: 'smooth' });
            } else {
                updateActiveDot(targetIndex);
            }
        };

        container.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
            isDown = true;
            container.classList.add('grabbing');
            startX = e.pageX - container.offsetLeft;
            scrollLeftStart = container.scrollLeft;
            container.style.scrollBehavior = 'auto';
            container.style.cursor = 'grabbing';
            clearTimeout(scrollEndTimer);
        });

        const stopDragging = () => {
            if (!isDown) return;
            isDown = false;
            container.classList.remove('grabbing');
            container.style.scrollBehavior = 'smooth';
            container.style.cursor = 'grab';
            snapToImage();
        };

        container.addEventListener('mouseleave', stopDragging);
        container.addEventListener('mouseup', stopDragging);

        container.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX);
            container.scrollLeft = scrollLeftStart - walk;
            updateActiveDot();
        });

        container.addEventListener('scroll', () => {
            if (!isDown) {
                updateActiveDot();
                clearTimeout(scrollEndTimer);
                scrollEndTimer = setTimeout(() => {
                    snapToImage();
                }, 150);
            }
        }, { passive: true });

        const resizeObserver = new ResizeObserver(() => {
            const currentActiveDotIndex = dots.findIndex(dot => dot.classList.contains('active'));
            if (currentActiveDotIndex !== -1) {
                const containerWidth = container.offsetWidth;
                if (containerWidth > 0) {
                    container.scrollTo({ left: currentActiveDotIndex * containerWidth, behavior: 'instant' });
                }
            }
            updateActiveDot(currentActiveDotIndex); 
        });
        resizeObserver.observe(container);

        updateActiveDot(); 
    });

    function applyTransform() {

        const safeTranslateX = Number.isFinite(translateX) ? translateX : 0;
        const safeTranslateY = Number.isFinite(translateY) ? translateY : 0;
        const safeZoom = Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : 1;
        fullscreenImage.style.transform = `translate(${safeTranslateX}px, ${safeTranslateY}px) scale(${safeZoom})`;
    }

    function zoomIn() {
        if (currentZoom >= maxZoom) return;
        currentZoom = Math.min(maxZoom, currentZoom + zoomStep * currentZoom);
        updateZoomButtons();
        applyTransform();
        fullscreenImageContainer.classList.add('zoomed');
    }

    function zoomOut() {
        if (currentZoom <= minZoom) return;
        const prevZoom = currentZoom;
        currentZoom = Math.max(minZoom, currentZoom - zoomStep * currentZoom);

        translateX *= currentZoom / prevZoom;
        translateY *= currentZoom / prevZoom;

        if (currentZoom === minZoom) {
            resetZoom(false); 
        } else {
            updateZoomButtons();
            applyTransform();
        }
        fullscreenImageContainer.classList.toggle('zoomed', currentZoom > minZoom);
    }

    function resetZoom(apply = true) {
        currentZoom = minZoom;
        translateX = 0;
        translateY = 0;
        updateZoomButtons();
        if (apply) applyTransform();
        fullscreenImageContainer.classList.remove('zoomed');
        fullscreenImageContainer.classList.remove('grabbing');
        isFullscreenPanning = false; 
    }

    function updateZoomButtons() {
        fullscreenZoomInBtn.disabled = currentZoom >= maxZoom;
        fullscreenZoomOutBtn.disabled = currentZoom <= minZoom;
        fullscreenZoomResetBtn.disabled = currentZoom === minZoom && translateX === 0 && translateY === 0;
    }

    function handlePanStart(e) {
        if (currentZoom <= minZoom) return;

        if (e.cancelable) e.preventDefault();
        isFullscreenPanning = true;
        startX = (e.touches ? e.touches[0].clientX : e.clientX) - translateX;
        startY = (e.touches ? e.touches[0].clientY : e.clientY) - translateY;
        fullscreenImageContainer.classList.add('grabbing');
        fullscreenImage.style.transition = 'none'; 
    }

    function handlePanMove(e) {
        if (!isFullscreenPanning || currentZoom <= minZoom) return;
         if (e.cancelable) e.preventDefault();
        const currentX = e.touches ? e.touches[0].clientX : e.clientX;
        const currentY = e.touches ? e.touches[0].clientY : e.clientY;
        translateX = currentX - startX;
        translateY = currentY - startY;
        applyTransform();
    }

    function handlePanEnd(e) {
        if (!isFullscreenPanning) return;
         if (e.cancelable) e.preventDefault();
        isFullscreenPanning = false;
        fullscreenImageContainer.classList.remove('grabbing');
        fullscreenImage.style.transition = 'transform 0.3s ease-out, opacity 0.2s ease-in-out'; 
        updateZoomButtons();
    }

    function handleWheelZoom(e) {
        if (!fullscreenOverlay.classList.contains('active')) return;
        e.preventDefault(); 
        const delta = Math.sign(e.deltaY);

        if (delta < 0) { 
            zoomIn();
        } else { 
            zoomOut();
        }
    }

    function setupFullscreenCarousel(clickedImageElement) {
        const parentCarousel = clickedImageElement.closest('.carousel-container');

        if (!parentCarousel && clickedImageElement.matches('img[data-fullscreenable="true"]')) {
            fullscreenImageList = [{ src: clickedImageElement.src, alt: clickedImageElement.alt }];
            currentFullscreenIndex = 0;
        } else if (parentCarousel) {
            const allImages = Array.from(parentCarousel.querySelectorAll('img[data-fullscreenable="true"]'));
            fullscreenImageList = allImages.map(img => ({ src: img.src, alt: img.alt }));
            currentFullscreenIndex = allImages.findIndex(img => img === clickedImageElement);
        } else {
            return; 
        }

        if (currentFullscreenIndex === -1) currentFullscreenIndex = 0; 

        fullscreenDotsContainer.innerHTML = '';
        fullscreenDots = [];

        if (fullscreenImageList.length > 1) {
            fullscreenImageList.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.classList.add('dot');
                dot.setAttribute('aria-label', `Go to image ${index + 1}`);
                dot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    displayFullscreenImage(index)
                });
                fullscreenDotsContainer.appendChild(dot);
                fullscreenDots.push(dot);
            });
        }

        displayFullscreenImage(currentFullscreenIndex);
        fullscreenOverlay.classList.add('active');
        window.addEventListener('wheel', handleWheelZoom, { passive: false }); 
    }

    function displayFullscreenImage(index) {
        if (index < 0 || index >= fullscreenImageList.length) return;
        currentFullscreenIndex = index;
        const imageData = fullscreenImageList[index];

        resetZoom(false); 

        fullscreenImage.classList.add('loading');
        fullscreenOverlay.classList.add('no-bg-close');

        const img = new Image();
        img.onload = () => {
            fullscreenImage.src = imageData.src;
            fullscreenImage.alt = imageData.alt || 'Fullscreen image';
            fullscreenImage.classList.remove('loading');
            applyTransform(); 
            setTimeout(() => fullscreenOverlay.classList.remove('no-bg-close'), 50);
            updateZoomButtons();
        };
        img.onerror = () => {
            console.error("Failed to load fullscreen image:", imageData.src);
            fullscreenImage.alt = "Image failed to load";
            fullscreenImage.src = "";
            fullscreenImage.classList.remove('loading');
            applyTransform(); 
            setTimeout(() => fullscreenOverlay.classList.remove('no-bg-close'), 50);
            updateZoomButtons();
        };
        img.src = imageData.src;

        fullscreenDots.forEach((dot, i) => {
            const isActive = i === currentFullscreenIndex;
            dot.classList.toggle('active', isActive);
            dot.setAttribute('aria-pressed', String(isActive));
        });

        fullscreenPrevBtn.disabled = currentFullscreenIndex === 0;
        fullscreenNextBtn.disabled = currentFullscreenIndex === fullscreenImageList.length - 1;

        const showNavControls = fullscreenImageList.length > 1;
        fullscreenCounter.textContent = showNavControls ? `Image ${currentFullscreenIndex + 1} / ${fullscreenImageList.length}` : '';
        fullscreenPrevBtn.style.display = showNavControls ? 'flex' : 'none';
        fullscreenNextBtn.style.display = showNavControls ? 'flex' : 'none';
        fullscreenDotsContainer.style.display = showNavControls ? 'flex' : 'none';

    }

    function closeFullscreen() {
        fullscreenOverlay.classList.remove('active');
        window.removeEventListener('wheel', handleWheelZoom); 
        setTimeout(() => {
            resetZoom(false);
            fullscreenImage.src = '';
            fullscreenImage.alt = '';
            fullscreenImageList = [];
            currentFullscreenIndex = -1;
            fullscreenDotsContainer.innerHTML = '';
            fullscreenDots = [];
            fullscreenCounter.textContent = '';
            isFullscreenPanning = false; 
            fullscreenImageContainer.classList.remove('zoomed', 'grabbing');
            fullscreenImage.style.transition = '';
        }, 300);
    }

    searchInput.addEventListener('input', filterAndSearchCommands);

    handleFilterClick('#role-filters');
    handleFilterClick('#tag-filters');

    if (contentArea) {
        contentArea.addEventListener('click', (e) => {
            const targetImage = e.target.closest('img[data-fullscreenable="true"]');
            if (targetImage) {
                e.preventDefault();
                setupFullscreenCarousel(targetImage);
            }
        });
    }

    fullscreenPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentFullscreenIndex > 0) {
            displayFullscreenImage(currentFullscreenIndex - 1);
        }
    });

    fullscreenNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentFullscreenIndex < fullscreenImageList.length - 1) {
            displayFullscreenImage(currentFullscreenIndex + 1);
        }
    });

    fullscreenZoomInBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); });
    fullscreenZoomOutBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); });
    fullscreenZoomResetBtn.addEventListener('click', (e) => { e.stopPropagation(); resetZoom(); });

    fullscreenImageContainer.addEventListener('mousedown', handlePanStart);
    fullscreenImageContainer.addEventListener('mousemove', handlePanMove);
    fullscreenImageContainer.addEventListener('mouseup', handlePanEnd);
    fullscreenImageContainer.addEventListener('mouseleave', handlePanEnd);
    fullscreenImageContainer.addEventListener('touchstart', handlePanStart, { passive: false }); 
    fullscreenImageContainer.addEventListener('touchmove', handlePanMove, { passive: false });  
    fullscreenImageContainer.addEventListener('touchend', handlePanEnd);
    fullscreenImageContainer.addEventListener('touchcancel', handlePanEnd);

    fullscreenClose.addEventListener('click', (e) => { e.stopPropagation(); closeFullscreen(); });
    fullscreenOverlay.addEventListener('click', (e) => {
        if (e.target === fullscreenOverlay && !fullscreenOverlay.classList.contains('no-bg-close') && !isFullscreenPanning) { 
            closeFullscreen();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (fullscreenOverlay.classList.contains('active')) {

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'Escape':
                    closeFullscreen();
                    break;
                case 'ArrowLeft':
                    fullscreenPrevBtn.click();
                    break;
                case 'ArrowRight':
                    fullscreenNextBtn.click();
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    fullscreenZoomInBtn.click();
                    break;
                case '-':
                    e.preventDefault();
                    fullscreenZoomOutBtn.click();
                    break;
                case '0':
                    e.preventDefault();
                    fullscreenZoomResetBtn.click();
                    break;

            }
        }
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            refreshObserver();

        }, 250);
    });

    generatePageMap();
    setupIntersectionObserver();
    filterAndSearchCommands(); 

}); 