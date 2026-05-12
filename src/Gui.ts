const SHORTCUTS: Array<[string, string]> = [
    ['L', 'Toggle labels'],
    ['D', 'Toggle debug panel'],
    ['T', 'Toggle textures'],
    ['M', 'Toggle moon labels'],
    ['P', 'Pause / resume'],
    ['.', 'Step simulation'],
    [',', 'Reverse simulation step'],
    ['*', 'Increase substeps'],
    ['/', 'Decrease substeps'],
    ['Shift + R', 'Reset solar system'],
    ['B', 'Create black hole at mouse'],
    ['Shift + B', 'Remove black hole'],
    ['Mouse wheel', 'Zoom'],
    ['Middle drag / Cmd drag', 'Pan camera'],
    ['Space', 'Pan to next planet/star'],
];

export default class Gui {
    private static shortcutsOverlay: HTMLDivElement | null = null;

    static initialize() {
        this.createShortcutsButton();
    }

    private static createShortcutsButton(): void {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '?';
        button.title = 'Show shortcuts';
        button.ariaLabel = 'Show shortcuts';

        Object.assign(button.style, {
            position: 'fixed',
            top: '16px',
            right: '18px',
            zIndex: '10',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            background: 'rgba(10, 12, 16, 0.78)',
            color: '#ffffff',
            cursor: 'pointer',
            font: '700 20px Arial, sans-serif',
            lineHeight: '34px',
            padding: '0',
        });

        button.addEventListener('mousedown', event => {
            event.stopPropagation();
        });
        button.addEventListener('click', event => {
            event.stopPropagation();
            this.showShortcuts();
        });

        document.body.appendChild(button);
    }

    private static showShortcuts(): void {
        if (this.shortcutsOverlay) {
            this.shortcutsOverlay.remove();
        }

        const overlay = document.createElement('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.55)',
            padding: '24px',
        });

        const modal = document.createElement('section');
        Object.assign(modal.style, {
            width: 'min(520px, 100%)',
            maxHeight: 'min(680px, calc(100vh - 48px))',
            overflow: 'auto',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            background: 'rgba(10, 12, 16, 0.94)',
            boxShadow: '0 18px 60px rgba(0, 0, 0, 0.55)',
            padding: '20px 22px 22px',
        });

        const title = document.createElement('h2');
        title.textContent = 'Shortcuts';
        Object.assign(title.style, {
            margin: '0 0 16px',
            color: '#ffb15c',
            font: '700 18px Arial, sans-serif',
        });

        const list = document.createElement('dl');
        Object.assign(list.style, {
            display: 'grid',
            gridTemplateColumns: 'minmax(128px, max-content) 1fr',
            gap: '10px 18px',
            margin: '0',
            color: '#ffffff',
            font: '14px Arial, sans-serif',
        });

        for (const [keys, action] of SHORTCUTS) {
            const term = document.createElement('dt');
            const key = document.createElement('kbd');
            key.textContent = keys;
            Object.assign(key.style, {
                display: 'inline-block',
                minWidth: '28px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                font: '700 13px Arial, sans-serif',
                textAlign: 'center',
            });
            term.appendChild(key);

            const description = document.createElement('dd');
            description.textContent = action;
            Object.assign(description.style, {
                margin: '0',
                color: 'rgba(255, 255, 255, 0.78)',
                lineHeight: '24px',
            });

            list.append(term, description);
        }

        modal.append(title, list);
        modal.addEventListener('mousedown', event => {
            event.stopPropagation();
        });

        overlay.addEventListener('mousedown', event => {
            event.stopPropagation();
            if (event.target === overlay) {
                this.hideShortcuts();
            }
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        this.shortcutsOverlay = overlay;
    }

    private static hideShortcuts(): void {
        this.shortcutsOverlay?.remove();
        this.shortcutsOverlay = null;
    }
}
