export function setupNavigation(navButtonsSelector = '.nav-item', sectionSelector = '.content-section') {
    const navButtons = document.querySelectorAll(navButtonsSelector);
    const sections = document.querySelectorAll(sectionSelector);

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.dataset.section;

            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            sections.forEach(section => {
                if (section.id === targetSection) {
                    section.classList.add('active');
                    const titleEl = document.getElementById('sectionTitle');
                    if (titleEl) {
                        titleEl.textContent = button.textContent.trim();
                    }
                    if (typeof window.loadSectionData === 'function') {
                        window.loadSectionData(targetSection);
                    }
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });
} 