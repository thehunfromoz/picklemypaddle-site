/**
 * A small accessible combobox for the order form's brand and model fields (SCRUM-40), following
 * the WAI-ARIA 1.2 "list autocomplete" pattern: the text field keeps focus, the suggestions are a
 * listbox it controls, and the highlighted option is announced through aria-activedescendant.
 *
 * Free text always stays: suggestions only help, they never replace or block what was typed.
 * Keys: ↓/↑ move (↓ also opens), Enter picks the highlighted one, Escape closes, Tab leaves.
 */
export interface ComboboxOptions {
  /**
   * The suggestions for the current text (already ranked and limited). showAll is true when ↓ is
   * pressed in an empty field: offer a short list to browse (e.g. the chosen brand's models).
   */
  suggest: (text: string, showAll: boolean) => string[];
  /** Called after a suggestion is picked (e.g. to refresh the model field's list). */
  onPick?: (value: string) => void;
}

let counter = 0;

export function attachCombobox(input: HTMLInputElement, opts: ComboboxOptions): void {
  if (input.dataset.combobox === 'on') return;
  input.dataset.combobox = 'on';
  const listId = `${input.id || `combo-${++counter}`}-listbox`;

  const list = document.createElement('ul');
  list.id = listId;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', `Suggestions for ${input.labels?.[0]?.textContent?.trim() ?? 'this field'}`);
  list.className =
    'absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-border bg-surface py-1 shadow-lg';
  list.hidden = true;
  input.insertAdjacentElement('afterend', list);

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.setAttribute('autocomplete', 'off');

  let items: string[] = [];
  let active = -1;

  const options = () => [...list.querySelectorAll<HTMLLIElement>('[role="option"]')];

  const highlight = (i: number) => {
    active = i;
    options().forEach((li, n) => {
      const on = n === i;
      li.setAttribute('aria-selected', String(on));
      li.classList.toggle('bg-tint-blue', on);
      if (on) li.scrollIntoView({ block: 'nearest' });
    });
    if (i >= 0) input.setAttribute('aria-activedescendant', `${listId}-${i}`);
    else input.removeAttribute('aria-activedescendant');
  };

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    highlight(-1);
  };

  const open = (all = false) => {
    items = opts.suggest(all ? '' : input.value, all);
    list.replaceChildren(
      ...items.map((text, n) => {
        const li = document.createElement('li');
        li.id = `${listId}-${n}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.className = 'cursor-pointer px-3 py-2 text-base';
        li.textContent = text;
        // mousedown, not click: picking must happen before the field loses focus.
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          pick(n);
        });
        return li;
      }),
    );
    if (items.length === 0) return close();
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    highlight(-1);
  };

  const pick = (n: number) => {
    const value = items[n];
    if (value === undefined) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    close();
    opts.onPick?.(value);
  };

  input.addEventListener('input', (e) => {
    // Our own pick dispatches an input event too; don't reopen the list for it.
    if ((e as InputEvent).inputType === undefined && list.hidden) return;
    open();
  });
  input.addEventListener('keydown', (e) => {
    const isOpen = !list.hidden;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) open(input.value.trim() === '');
        else highlight(Math.min(active + 1, items.length - 1));
        break;
      case 'ArrowUp':
        if (isOpen) {
          e.preventDefault();
          highlight(Math.max(active - 1, 0));
        }
        break;
      case 'Enter':
        if (isOpen && active >= 0) {
          e.preventDefault(); // pick, don't submit the form
          pick(active);
        }
        break;
      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  });
  input.addEventListener('blur', () => close());
}
