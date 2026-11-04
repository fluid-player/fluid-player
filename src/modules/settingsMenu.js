/**
 * Compact (mobile) layout and its settings menu.
 *
 * The wrapper gets `fluid_mobile_layout` on touch devices (coarse pointer) and whenever the player is narrower than
 * COMPACT_MAX_WIDTH, e.g. a small player in a sidebar. The control bar then keeps only the core controls and everything
 * listed in SETTINGS_ITEMS moves into a bottom sheet opened by the settings (gear) button.
 */
export default function (playerInstance) {
    const COARSE_POINTER_QUERY = '(pointer: coarse)';
    const COMPACT_MAX_WIDTH = 640; // px, below this the full desktop control bar no longer fits
    const MOBILE_LAYOUT_CLASS = 'fluid_mobile_layout';
    const IN_SETTINGS_CLASS = 'fluid_button_in_settings';
    const OPEN_CLASS = 'fluid_settings_menu_open';

    /**
     * Sheet rows, in display order. Each row mirrors a control-bar button 1:1: it is shown exactly when the desktop
     * bar shows that button (whether or not it works in that situation), lists the same options, and acts through
     * the button's own handlers. To add a control to the sheet, add an entry here.
     *
     * - `items`: the row expands to the button's option elements; picking one clicks that option.
     *   `isSelected` overrides how the current option is found (default: the option's selected icon).
     *   Like the desktop menus, lists don't open during an ad; `isBlocked` adds the menu's other conditions.
     * - `isOn`: the row is a switch showing that state; tapping it clicks the button.
     * - neither: the row is a plain action; tapping it clicks the button.
     */
    const SETTINGS_ITEMS = [
        {
            label: 'Playback Speed',
            button: '.fluid_control_playback_rate',
            items: '.fluid_video_playback_rates_item',
            isSelected: option => Number(option.textContent.replace('x', '')) === playerInstance.domRef.player.playbackRate
        },
        {
            label: 'Quality',
            button: '.fluid_control_video_source',
            items: '.fluid_video_source_list_item',
            isBlocked: () => playerInstance.isShowingSuggestedVideos()
        },
        {label: 'Subtitles', button: '.fluid_control_subtitles', items: '.fluid_subtitle_list_item:not(.fluid_sub_menu_button)'},
        {label: 'Subtitle Size', button: '.fluid_control_subtitles', items: '.fluid_subtitle_size_button:not(.fluid_sub_menu_button)'},
        {label: 'VR', button: '.fluid_control_cardboard', isOn: () => !!playerInstance.vrMode},
        {label: 'Theatre Mode', button: '.fluid_control_theatre', isOn: () => !!playerInstance.theatreMode},
        {label: 'Mini Player', button: '.fluid_control_mini_player', isOn: () => !!playerInstance.miniPlayerToggledOn},
        {label: 'Download', button: '.fluid_control_download'},
    ];

    const SELECTED_ICON_SELECTOR = '.source_selected, .subtitle_selected, .subtitle_size_selected';
    const isSelectedByIcon = option => !!option.querySelector(SELECTED_ICON_SELECTOR);

    let menu = null;
    let sheet = null;
    let rows = null;

    const createElement = (tag, className, text) => {
        const element = document.createElement(tag);
        element.className = className;

        if (text) {
            element.textContent = text;
        }

        if (tag === 'button') {
            element.type = 'button';
        }

        return element;
    };

    // Option label without the desktop check icon, keeping extras such as the HD badge
    const cloneOptionLabel = (option, className) => {
        const label = createElement('span', className);
        label.innerHTML = option.innerHTML;
        label.querySelectorAll('.source_button_icon, .subtitle_button_icon').forEach(icon => icon.remove());
        return label;
    };

    playerInstance.isSettingsMenuOpen = () => !!menu && menu.classList.contains(OPEN_CLASS);

    playerInstance.createSettingsMenu = () => {
        const wrapper = playerInstance.domRef.wrapper;

        if (playerInstance.displayOptions.layoutControls.primaryColor) {
            wrapper.style.setProperty('--fluid-primary-color', playerInstance.displayOptions.layoutControls.primaryColor);
        }

        // Lets the compact layout take these buttons out of the control bar
        SETTINGS_ITEMS.forEach(item => {
            const button = wrapper.querySelector(item.button);
            if (button) {
                button.classList.add(IN_SETTINGS_CLASS);
            }
        });

        menu = createElement('div', 'fluid_settings_menu');

        const scrim = createElement('div', 'fluid_settings_scrim');
        scrim.addEventListener('click', playerInstance.closeSettingsMenu);

        sheet = createElement('div', 'fluid_settings_sheet');
        sheet.tabIndex = -1;
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-label', 'Settings');

        const header = createElement('div', 'fluid_settings_header');
        const closeButton = createElement('button', 'fluid_settings_close');
        closeButton.setAttribute('aria-label', 'Close settings');
        closeButton.addEventListener('click', playerInstance.closeSettingsMenu);
        header.append(createElement('span', 'fluid_settings_title', 'Settings'), closeButton);

        rows = createElement('div', 'fluid_settings_rows');
        sheet.append(header, rows);
        menu.append(scrim, sheet);
        menu.addEventListener('keydown', onMenuKeydown);
        wrapper.appendChild(menu);

        playerInstance.trackEvent(wrapper, 'click', '.fluid_control_settings', playerInstance.openSettingsMenu);
        watchSettingsButtonVisibility();

        const coarsePointer = window.matchMedia(COARSE_POINTER_QUERY);
        const updateLayout = () => {
            const isCompact = coarsePointer.matches || wrapper.offsetWidth < COMPACT_MAX_WIDTH;

            if (isCompact !== wrapper.classList.contains(MOBILE_LAYOUT_CLASS)) {
                wrapper.classList.toggle(MOBILE_LAYOUT_CLASS, isCompact);
                playerInstance.closeSettingsMenu();
            }

            // Small players hide the volume slider; its fill is sized in px, so redo it once it shows again
            playerInstance.controlVolumebarUpdate();
        };

        updateLayout();
        coarsePointer.addEventListener('change', updateLayout);
        const resizeObserver = new ResizeObserver(updateLayout);
        resizeObserver.observe(wrapper);

        playerInstance.destructors.push(() => {
            coarsePointer.removeEventListener('change', updateLayout);
            resizeObserver.disconnect();
        });
    };

    playerInstance.openSettingsMenu = () => {
        // Also during ads: the desktop buttons stay visible then too
        if (!renderRows()) {
            return;
        }

        menu.classList.add(OPEN_CLASS);
        playerInstance.domRef.controls.settings.setAttribute('aria-expanded', 'true');
        sheet.scrollTop = 0;
        sheet.focus({preventScroll: true});
    };

    playerInstance.closeSettingsMenu = () => {
        if (!playerInstance.isSettingsMenuOpen()) {
            return;
        }

        const hadFocus = menu.contains(document.activeElement);

        menu.classList.remove(OPEN_CLASS);
        playerInstance.domRef.controls.settings.setAttribute('aria-expanded', 'false');

        if (hadFocus) {
            playerInstance.domRef.controls.settings.focus({preventScroll: true});
        }
    };

    // Escape closes the sheet; Tab cycles through it
    const onMenuKeydown = event => {
        if (event.key === 'Escape') {
            playerInstance.closeSettingsMenu();
            return;
        }

        if (event.key !== 'Tab') {
            return;
        }

        const focusable = Array.from(sheet.querySelectorAll('button')).filter(button => button.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    // The SETTINGS_ITEMS whose control is currently enabled, with their options
    const getAvailableItems = () => SETTINGS_ITEMS
        .map(item => {
            const button = playerInstance.domRef.wrapper.querySelector(item.button);
            const isEnabled = !!button && getComputedStyle(button).display !== 'none';
            const options = isEnabled && item.items ? Array.from(button.querySelectorAll(item.items)) : [];

            return {item, button, isEnabled: isEnabled && (!item.items || options.length > 0), options};
        })
        .filter(entry => entry.isEnabled);

    // Rows are rebuilt on every open, so they always reflect which controls are enabled and their current state
    const renderRows = () => {
        rows.textContent = '';

        getAvailableItems().forEach(({item, button, options}) => {
            if (item.items) {
                rows.append(...createListRow(item, options));
            } else {
                rows.appendChild(createButtonRow(item, button));
            }
        });

        return rows.childElementCount > 0;
    };

    // Like the desktop bar, which has no secondary buttons when none are enabled. Controls get enabled (or their
    // options added) asynchronously, e.g. subtitles and HLS levels, so follow their style and children.
    const watchSettingsButtonVisibility = () => {
        const update = () => {
            playerInstance.domRef.controls.settings.style.display = getAvailableItems().length ? '' : 'none';
        };
        const observer = new MutationObserver(update);

        SETTINGS_ITEMS.forEach(item => {
            const button = playerInstance.domRef.wrapper.querySelector(item.button);
            if (button) {
                observer.observe(button, {attributes: true, attributeFilter: ['style'], childList: true});
            }
        });

        update();
        playerInstance.destructors.push(() => observer.disconnect());
    };

    const createButtonRow = (item, button) => {
        const row = createElement('button', 'fluid_settings_row');
        row.appendChild(createElement('span', 'fluid_settings_label', item.label));

        if (item.isOn) {
            row.setAttribute('role', 'switch');
            row.setAttribute('aria-checked', String(item.isOn()));
            row.appendChild(createElement('span', 'fluid_settings_switch'));
        }

        row.addEventListener('click', () => {
            playerInstance.closeSettingsMenu();
            button.click();
        });

        return row;
    };

    const createListRow = (item, options) => {
        const selected = options.find(item.isSelected || isSelectedByIcon);

        const row = createElement('button', 'fluid_settings_row');
        row.setAttribute('aria-expanded', 'false');
        row.appendChild(createElement('span', 'fluid_settings_label', item.label));
        if (selected) {
            row.appendChild(cloneOptionLabel(selected, 'fluid_settings_value'));
        }

        const list = createElement('div', 'fluid_settings_options');
        list.setAttribute('role', 'radiogroup');
        list.setAttribute('aria-label', item.label);
        list.hidden = true;

        options.forEach(option => {
            const optionButton = createElement('button', 'fluid_settings_option');
            optionButton.setAttribute('role', 'radio');
            optionButton.setAttribute('aria-checked', String(option === selected));
            optionButton.appendChild(cloneOptionLabel(option, 'fluid_settings_label'));
            optionButton.addEventListener('click', () => {
                playerInstance.closeSettingsMenu();
                option.click();
                // The option's own handler toggles its (hidden) desktop popup, keep that closed
                option.parentNode.style.display = 'none';
            });
            list.appendChild(optionButton);
        });

        // One expanded list at a time
        row.addEventListener('click', () => {
            if (playerInstance.isCurrentlyPlayingAd || (item.isBlocked && item.isBlocked())) {
                return;
            }

            const expand = list.hidden;

            rows.querySelectorAll('.fluid_settings_row[aria-expanded]').forEach(otherRow => {
                otherRow.setAttribute('aria-expanded', 'false');
                otherRow.nextSibling.hidden = true;
            });

            row.setAttribute('aria-expanded', String(expand));
            list.hidden = !expand;
        });

        return [row, list];
    };
}
