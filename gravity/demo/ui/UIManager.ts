const SHORTCUT_SECTIONS = [
    {
        title: 'Scene',
        items: [
            '[ 0-99 ] Select demo (type 2 digits quickly)',
            '[ Shift + R ] Restart demo',
            '[ G ] Toggle gravity',
            '[ D ] Toggle debug rendering',
            '[ A ] Toggle AABB debug',
            '[ S ] Toggle contact and joint debug',
            '[ P ] Pause simulation',
            '[ . ] Step simulation',
            '[ , ] Step backward (testing only)',
            '[ + ] [ - ] Increase or decrease solver iterations',
            '[ * ] [ / ] Increase or decrease substeps',
        ],
    },
    {
        title: 'Spawn',
        items: [
            '[ Left Mouse ] Spawn circle / Grab body',
            '[ Right Mouse ] Spawn box',
            '[ C ] Spawn particles while held',
            '[ X ] Spawn capsule',
            '[ Z ] Spawn segment',
            '[ R ] Spawn random convex polygon',
            '[ B ] Shoot bullet',
            '[ E ] Trigger explosion at mouse',
            '[ F ] Spawn black hole at mouse',
            '[ Shift + F ] Clear black hole',
        ],
    },
    {
        title: 'Player And Camera',
        items: [
            '[ Q ] Spawn player at mouse',
            '[ Space ] Jump',
            '[ Left Arrow ] [ Right Arrow ] Move player',
            '[ Middle Mouse ] Drag camera',
            '[ Mouse Wheel ] Zoom camera',
        ],
    },
] as const;

export interface UIState {
    demoIndex: number;
    demoLabels: string[];
    debug: boolean;
    showLabels: boolean;
    showAABB: boolean;
    showContacts: boolean;
    showRuntimeStatsHud: boolean;
    ccd: boolean;
    applyGravity: boolean;
    grab: boolean;
    paused: boolean;
    solverIterations: number;
    subSteps: number;
}

export interface UIActions {
    onSelectDemo(index: number): void;
    onRestartDemo(): void;
    onSetDebug(value: boolean): void;
    onSetShowLabels(value: boolean): void;
    onSetShowAABB(value: boolean): void;
    onSetShowContacts(value: boolean): void;
    onSetShowRuntimeStatsHud(value: boolean): void;
    onSetCCD(checked: boolean): void;
    onSetApplyGravity(value: boolean): void;
    onSetGrab(checked: boolean): void;
    onSetPaused(value: boolean): void;
    onSetSolverIterations(value: number): void;
    onSetSubSteps(value: number): void;
    onStep(): void;
}

export default class UIManager {
    private currentState: UIState | null = null;
    private toolbar: HTMLElement | null = null;

    // Select
    private demoSelect: HTMLSelectElement | null = null;

    // Checkboxes
    private debugCheckbox: HTMLInputElement | null = null;
    private showLabelsCheckbox: HTMLInputElement | null = null;
    private showAABBCheckbox: HTMLInputElement | null = null;
    private ccdCheckbox: HTMLInputElement | null = null;
    private showContactsCheckbox: HTMLInputElement | null = null;
    private gravityCheckbox: HTMLInputElement | null = null;
    private pausedCheckbox: HTMLInputElement | null = null;

    // Inputs
    private solverIterationsInput: HTMLInputElement | null = null;
    private subStepsInput: HTMLInputElement | null = null;

    // Buttons
    private stepButton: HTMLButtonElement | null = null;
    private restartButton: HTMLButtonElement | null = null;
    private runtimeStatsButton: HTMLButtonElement | null = null;
    private shortcutsButton: HTMLButtonElement | null = null;
    private shortcutsDialog: HTMLDialogElement | null = null;
    private grabCheckbox: HTMLInputElement | null = null;

    initialize(state: UIState, actions: UIActions): void {
        this.currentState = state;
        const toolbar = document.getElementById('demo-toolbar');
        if (!(toolbar instanceof HTMLElement)) {
            return;
        }

        this.toolbar = toolbar;
        toolbar.replaceChildren();

        const createGroup = () => {
            const group = document.createElement('div');
            group.className = 'toolbar-group';
            toolbar.appendChild(group);
            return group;
        };

        const createLabeledControl = (group: HTMLElement, labelText: string, control: HTMLElement) => {
            const label = document.createElement('label');
            label.className = 'toolbar-control';

            const text = document.createElement('span');
            text.textContent = labelText;

            label.append(text, control);
            group.appendChild(label);
        };

        const createCheckbox = (group: HTMLElement, labelText: string, onChange: (checked: boolean) => void) => {
            const label = document.createElement('label');
            label.className = 'toolbar-control';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.addEventListener('change', () => onChange(input.checked));

            label.append(input, document.createTextNode(labelText));
            group.appendChild(label);

            return input;
        };

        const createNumberInput = (group: HTMLElement, labelText: string, onChange: (value: number) => void) => {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '1';
            input.step = '1';
            input.addEventListener('change', () => onChange(Number.parseInt(input.value)));
            createLabeledControl(group, labelText, input);
            return input;
        };

        const demoGroup = createGroup();
        this.demoSelect = document.createElement('select');
        state.demoLabels.forEach((label, index) => {
            const option = document.createElement('option');
            option.value = `${index}`;
            option.textContent = label;
            this.demoSelect!.appendChild(option);
        });
        this.demoSelect.addEventListener('change', () => actions.onSelectDemo(Number.parseInt(this.demoSelect!.value)));
        createLabeledControl(demoGroup, 'Demo', this.demoSelect);

        this.restartButton = document.createElement('button');
        this.restartButton.type = 'button';
        this.restartButton.className = 'toolbar-button';
        this.restartButton.textContent = 'Restart';
        this.restartButton.addEventListener('click', () => actions.onRestartDemo());
        demoGroup.appendChild(this.restartButton);

        const toggleGroup = createGroup();
        this.debugCheckbox = createCheckbox(toggleGroup, 'Debug', checked => actions.onSetDebug(checked));
        this.showLabelsCheckbox = createCheckbox(toggleGroup, 'Labels', checked => actions.onSetShowLabels(checked));
        this.showAABBCheckbox = createCheckbox(toggleGroup, 'Show AABB', checked => actions.onSetShowAABB(checked));
        this.showContactsCheckbox = createCheckbox(toggleGroup, 'Show Contacts', checked =>
            actions.onSetShowContacts(checked),
        );
        this.ccdCheckbox = createCheckbox(toggleGroup, 'CCD', checked => actions.onSetCCD(checked));
        this.gravityCheckbox = createCheckbox(toggleGroup, 'Gravity', checked => actions.onSetApplyGravity(checked));
        this.grabCheckbox = createCheckbox(toggleGroup, 'Grab', checked => actions.onSetGrab(checked));
        this.pausedCheckbox = createCheckbox(toggleGroup, 'Paused', checked => actions.onSetPaused(checked));

        const numericGroup = createGroup();
        this.solverIterationsInput = createNumberInput(numericGroup, 'Iterations', value =>
            actions.onSetSolverIterations(value),
        );
        this.subStepsInput = createNumberInput(numericGroup, 'Substeps', value => actions.onSetSubSteps(value));

        this.stepButton = document.createElement('button');
        this.stepButton.type = 'button';
        this.stepButton.className = 'toolbar-button';
        this.stepButton.textContent = 'Step';
        this.stepButton.addEventListener('click', () => actions.onStep());
        numericGroup.appendChild(this.stepButton);

        const actionsGroup = createGroup();
        actionsGroup.classList.add('toolbar-group-actions');
        this.runtimeStatsButton = document.createElement('button');
        this.runtimeStatsButton.type = 'button';
        this.runtimeStatsButton.className = 'toolbar-button';
        this.runtimeStatsButton.addEventListener('click', () =>
            actions.onSetShowRuntimeStatsHud(!this.currentState?.showRuntimeStatsHud),
        );
        actionsGroup.appendChild(this.runtimeStatsButton);

        this.shortcutsButton = document.createElement('button');
        this.shortcutsButton.type = 'button';
        this.shortcutsButton.className = 'toolbar-button';
        this.shortcutsButton.textContent = 'Shortcuts';
        this.shortcutsButton.addEventListener('click', () => this.shortcutsDialog?.showModal());
        actionsGroup.appendChild(this.shortcutsButton);

        this.shortcutsDialog = document.createElement('dialog');
        this.shortcutsDialog.id = 'demo-shortcuts-modal';
        this.shortcutsDialog.addEventListener('click', event => {
            if (event.target === this.shortcutsDialog) {
                this.shortcutsDialog?.close();
            }
        });

        const dialogHeader = document.createElement('div');
        dialogHeader.className = 'shortcuts-modal-header';

        const dialogTitle = document.createElement('h2');
        dialogTitle.textContent = 'Keyboard And Mouse Shortcuts';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'toolbar-button';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => this.shortcutsDialog?.close());

        dialogHeader.append(dialogTitle, closeButton);
        this.shortcutsDialog.appendChild(dialogHeader);

        const dialogContent = document.createElement('div');
        dialogContent.className = 'shortcuts-modal-content';

        SHORTCUT_SECTIONS.forEach(section => {
            const sectionEl = document.createElement('section');
            sectionEl.className = 'shortcuts-section';

            const title = document.createElement('h3');
            title.textContent = section.title;
            sectionEl.appendChild(title);

            const list = document.createElement('ul');
            section.items.forEach(item => {
                const listItem = document.createElement('li');
                listItem.textContent = item;
                list.appendChild(listItem);
            });

            sectionEl.appendChild(list);
            dialogContent.appendChild(sectionEl);
        });

        this.shortcutsDialog.appendChild(dialogContent);
        toolbar.appendChild(this.shortcutsDialog);

        this.sync(state);
    }

    sync(state: UIState): void {
        this.currentState = state;
        if (
            !this.demoSelect ||
            !this.debugCheckbox ||
            !this.showLabelsCheckbox ||
            !this.showAABBCheckbox ||
            !this.showContactsCheckbox ||
            !this.ccdCheckbox ||
            !this.gravityCheckbox ||
            !this.grabCheckbox ||
            !this.pausedCheckbox ||
            !this.solverIterationsInput ||
            !this.subStepsInput
        ) {
            return;
        }

        this.demoSelect.value = `${state.demoIndex}`;

        this.debugCheckbox.checked = state.debug;
        this.showLabelsCheckbox.checked = state.showLabels;
        this.showAABBCheckbox.checked = state.showAABB;
        this.showContactsCheckbox.checked = state.showContacts;

        this.ccdCheckbox.checked = state.ccd;
        this.gravityCheckbox.checked = state.applyGravity;
        this.grabCheckbox.checked = state.grab;
        this.pausedCheckbox.checked = state.paused;
        this.solverIterationsInput.value = `${state.solverIterations}`;
        this.subStepsInput.value = `${state.subSteps}`;
        this.showAABBCheckbox.disabled = !state.debug;
        this.showContactsCheckbox.disabled = !state.debug;

        if (this.stepButton) {
            this.stepButton.disabled = !state.paused;
        }

        if (this.runtimeStatsButton) {
            this.runtimeStatsButton.textContent = state.showRuntimeStatsHud ? 'Collapse HUD' : 'Expand HUD';
            this.runtimeStatsButton.disabled = !state.debug;
        }
    }

    get headerHeight(): number {
        return this.toolbar?.offsetHeight ?? 0;
    }
}
