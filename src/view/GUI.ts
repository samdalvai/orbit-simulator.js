import { USE_MOBILE_LAYOUT } from '../shared/Device';

const SHORTCUTS: Array<[string, string]> = [
    ['[1-5]', 'Select scenario'],
    ['L', 'Toggle labels'],
    ['D', 'Toggle debug panel'],
    ['T', 'Toggle textures'],
    ['M', 'Toggle moon labels'],
    ['P', 'Pause / resume'],
    ['.', 'Step simulation'],
    [',', 'Reverse simulation step'],
    ['+', 'Increase simulation speed'],
    ['-', 'Decrease simulation speed'],
    ['*', 'Increase substeps'],
    ['/', 'Decrease substeps'],
    ['Shift + R', 'Reset solar system'],
    ['B', 'Create black hole at mouse'],
    ['Shift + B', 'Remove black hole'],
    ['Mouse wheel', 'Zoom'],
    ['Middle drag / Cmd drag', 'Pan camera'],
    ['Space', 'Pan to next planet/star'],
    ['Left/Right arrow', 'Rotate camera horizontally'],
    ['Up/Down arrow', 'Rotate camera vertically'],
];

// Inline SVG icons (unicode media symbols are rendered as emoji on some mobile browsers)
const PAUSE_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const PLAY_ICON =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>';

const TOUCH_CONTROLS: Array<[string, string]> = [
    ['Tap', 'Select and follow a body'],
    ['Tap empty space', 'Stop following'],
    ['One finger drag', 'Rotate camera'],
    ['Pinch', 'Zoom'],
    ['Two finger drag', 'Pan camera'],
    ['Scenario menu', 'Select scenario'],
    ['Play / pause', 'Pause / resume simulation'],
    ['\u2212 / +', 'Decrease / increase simulation speed'],
    ['\u22EF', 'More: next planet, labels, textures, stats, black hole, reset, substeps'],
];

export type ControlState = {
    demoIndex: number;
    paused: boolean;
    showLabels: boolean;
    showMoonLabels: boolean;
    showTextures: boolean;
    debug: boolean;
    hasBlackHole: boolean;
    simulationSpeed: number;
    subSteps: number;
};

/** Actions triggered by the on-screen controls shown on touch devices */
export type ControlActions = {
    demoLabels: string[];
    getState(): ControlState;
    selectDemo(index: number): void;
    resetDemo(): void;
    togglePause(): void;
    step(): void;
    changeSimulationSpeed(direction: 1 | -1): void;
    changeSubSteps(direction: 1 | -1): void;
    nextBody(): void;
    toggleLabels(): void;
    toggleMoonLabels(): void;
    toggleTextures(): void;
    toggleDebug(): void;
    toggleBlackHole(): void;
};

type ToggleKey = 'showLabels' | 'showMoonLabels' | 'showTextures' | 'debug' | 'hasBlackHole';

export default class GUI {
    private static shortcutsOverlay: HTMLDivElement | null = null;

    // Control bar
    private static actions: ControlActions | null = null;
    private static demoSelect: HTMLSelectElement | null = null;
    private static pauseButton: HTMLButtonElement | null = null;
    private static speedLabel: HTMLSpanElement | null = null;
    private static subStepsLabel: HTMLSpanElement | null = null;
    private static moreButton: HTMLButtonElement | null = null;
    private static moreMenu: HTMLDivElement | null = null;
    private static toggleButtons: Array<[ToggleKey, HTMLButtonElement]> = [];

    static initialize(actions?: ControlActions) {
        this.createShortcutsButton();

        if (actions) {
            this.actions = actions;
            this.createControls(actions);
            this.refreshControls();
        }
    }

    /** Height in CSS pixels covered by the bottom control bar, including its margin (0 when not shown) */
    static bottomBarHeight(): number {
        const bar = document.getElementById('controlBar');
        return bar ? Math.max(0, window.innerHeight - bar.getBoundingClientRect().top) : 0;
    }

    /** Syncs the control bar with the current application state (e.g. after keyboard shortcuts) */
    static refreshControls(): void {
        if (!this.actions) return;

        const state = this.actions.getState();

        // Only touch the DOM when something changed, this runs every frame
        if (this.demoSelect && this.demoSelect.value !== String(state.demoIndex)) {
            this.demoSelect.value = String(state.demoIndex);
        }

        if (this.pauseButton && this.pauseButton.getAttribute('aria-pressed') !== String(state.paused)) {
            this.pauseButton.innerHTML = state.paused ? PLAY_ICON : PAUSE_ICON;
            this.pauseButton.ariaLabel = state.paused ? 'Resume' : 'Pause';
            this.pauseButton.title = this.withShortcut(this.pauseButton.ariaLabel, 'P');
            this.pauseButton.setAttribute('aria-pressed', String(state.paused));
        }

        this.setText(this.speedLabel, `${state.simulationSpeed}\u00D7`);
        this.setText(this.subStepsLabel, `Substeps ${state.subSteps}`);

        for (const [key, button] of this.toggleButtons) {
            if (button.getAttribute('aria-pressed') !== String(state[key])) {
                button.setAttribute('aria-pressed', String(state[key]));
            }
        }
    }

    private static setText(element: HTMLElement | null, text: string): void {
        if (element && element.textContent !== text) {
            element.textContent = text;
        }
    }

    private static createControls(actions: ControlActions): void {
        document.body.classList.add(USE_MOBILE_LAYOUT ? 'mobile-layout' : 'desktop-layout');

        const bar = document.createElement('div');
        bar.id = 'controlBar';
        bar.className = 'control-bar';
        bar.setAttribute('role', 'toolbar');
        bar.ariaLabel = 'Simulation controls';

        const select = document.createElement('select');
        select.className = 'control-select';
        select.ariaLabel = 'Scenario';
        select.title = this.withShortcut('Scenario', '1-5');
        actions.demoLabels.forEach((label, i) => {
            const option = document.createElement('option');
            option.value = String(i + 1);
            option.textContent = label;
            select.appendChild(option);
        });
        select.addEventListener('change', () => {
            actions.selectDemo(Number(select.value));
            this.refreshControls();
            // Give the keyboard back to the simulation shortcuts
            select.blur();
        });
        this.demoSelect = select;

        this.pauseButton = this.createButton('', 'Pause', () => actions.togglePause(), 'P');
        this.pauseButton.classList.add('control-icon');

        const speedGroup = document.createElement('div');
        speedGroup.className = 'control-group';
        this.speedLabel = document.createElement('span');
        this.speedLabel.className = 'control-value';
        speedGroup.append(
            this.createButton('\u2212', 'Decrease simulation speed', () => actions.changeSimulationSpeed(-1), '-'),
            this.speedLabel,
            this.createButton('+', 'Increase simulation speed', () => actions.changeSimulationSpeed(1), '+'),
        );

        this.moreButton = this.createButton('\u22EF', 'More options', () => this.toggleMoreMenu());

        const menu = document.createElement('div');
        menu.className = 'control-menu';
        menu.hidden = true;

        if (USE_MOBILE_LAYOUT) {
            // Space is limited on phones: the next body button lives in the menu
            const nextButton = this.createButton('Next planet / star', 'Pan to next planet or star', () => {
                actions.nextBody();
                this.toggleMoreMenu(false);
            });
            nextButton.classList.add('control-span');
            menu.appendChild(nextButton);
            bar.append(select, this.pauseButton, speedGroup, this.moreButton);
        } else {
            const nextButton = this.createButton(
                'Next',
                'Pan to next planet or star',
                () => actions.nextBody(),
                'Space',
            );
            nextButton.classList.add('control-text');
            bar.append(select, this.pauseButton, speedGroup, nextButton, this.moreButton);
        }

        const toggles: Array<[ToggleKey, string, () => void, string]> = [
            ['showLabels', 'Labels', () => actions.toggleLabels(), 'L'],
            ['showMoonLabels', 'Moon labels', () => actions.toggleMoonLabels(), 'M'],
            ['showTextures', 'Textures', () => actions.toggleTextures(), 'T'],
            ['debug', 'Stats', () => actions.toggleDebug(), 'D'],
            ['hasBlackHole', 'Black hole', () => actions.toggleBlackHole(), 'B'],
        ];

        for (const [key, label, action, shortcut] of toggles) {
            const button = this.createButton(label, label, action, shortcut);
            button.classList.add('control-toggle');
            this.toggleButtons.push([key, button]);
            menu.appendChild(button);
        }

        menu.appendChild(this.createButton('Step', 'Step simulation', () => actions.step(), '.'));
        menu.appendChild(this.createButton('Reset', 'Reset scenario', () => actions.resetDemo(), 'Shift + R'));

        const subStepsGroup = document.createElement('div');
        subStepsGroup.className = 'control-group control-span';
        this.subStepsLabel = document.createElement('span');
        this.subStepsLabel.className = 'control-value';
        subStepsGroup.append(
            this.createButton('\u2212', 'Decrease substeps', () => actions.changeSubSteps(-1), '/'),
            this.subStepsLabel,
            this.createButton('+', 'Increase substeps', () => actions.changeSubSteps(1), '*'),
        );
        menu.appendChild(subStepsGroup);

        this.moreMenu = menu;

        // Close the menu when touching anywhere else
        window.addEventListener('pointerdown', event => {
            const target = event.target as Node | null;
            if (menu.hidden || !target) return;
            if (menu.contains(target) || this.moreButton?.contains(target)) return;
            this.toggleMoreMenu(false);
        });

        // The menu opens above the bar, aligned to its right edge
        bar.appendChild(menu);
        document.body.appendChild(bar);
    }

    private static toggleMoreMenu(open?: boolean): void {
        if (!this.moreMenu) return;

        const shouldOpen = open ?? this.moreMenu.hidden;
        this.moreMenu.hidden = !shouldOpen;
        this.moreButton?.setAttribute('aria-expanded', String(shouldOpen));
    }

    /** Tooltip with the keyboard shortcut, only useful on the desktop layout */
    private static withShortcut(label: string, shortcut?: string): string {
        return shortcut && !USE_MOBILE_LAYOUT ? `${label} (${shortcut})` : label;
    }

    private static createButton(
        text: string,
        label: string,
        onClick: () => void,
        shortcut?: string,
    ): HTMLButtonElement {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'control-button';
        button.textContent = text;
        button.ariaLabel = label;
        button.title = this.withShortcut(label, shortcut);
        button.addEventListener('click', event => {
            event.stopPropagation();
            onClick();
            this.refreshControls();
            // Don't keep focus, so that Space keeps working as a simulation shortcut
            button.blur();
        });
        return button;
    }

    static shortcutsOverlayVisible(): boolean {
        return this.shortcutsOverlay !== null;
    }

    private static createShortcutsButton(): void {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '?';
        button.title = USE_MOBILE_LAYOUT ? 'Show controls' : 'Show shortcuts';
        button.ariaLabel = button.title;
        button.className = 'help-button';

        Object.assign(button.style, {
            position: 'fixed',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: 'calc(18px + env(safe-area-inset-right, 0px))',
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
        title.textContent = USE_MOBILE_LAYOUT ? 'Controls' : 'Shortcuts';
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

        for (const [keys, action] of USE_MOBILE_LAYOUT ? TOUCH_CONTROLS : SHORTCUTS) {
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

    static setLoadingMessage(message: string | null) {
        let element = document.getElementById('loadingMessage');

        if (element === null) {
            element = document.createElement('div');
        }

        element.id = 'loadingMessage';
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
        element.hidden = true;
        element.textContent = message ?? '';
        element.hidden = message === null;
        document.body.append(element);
    }
}
