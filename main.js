'use strict';

const { Plugin, ItemView } = require('obsidian');

const VIEW_TYPE = 'timeline-calendar';

// ─── i18n ─────────────────────────────────────────────────────────────────
// Detects Obsidian's language via window.moment.locale() (set by Obsidian).
// Falls back to navigator.language. If locale starts with 'pt' → Portuguese.

const STRINGS = {
  pt: {
    title:        '📅 Timeline',
    allDay:       'All day',
    today:        'Hj',
    week1:        '1sem',
    week2:        '2sem',
    month1:       'Mês',
    month2:       '2 meses',
    addBtn:       '+ Novo',
    modalNew:     'Novo evento',
    modalEdit:    'Editar evento',
    fieldTitle:   'Título',
    fieldDate:    'Data',
    fieldAllDay:  'Dia todo',
    fieldStart:   'Início',
    fieldEnd:     'Fim',
    fieldNotes:   'Notas',
    fieldColor:   'Cor',
    fieldDone:    'Concluído',
    btnDelete:    'Excluir',
    btnCancel:    'Cancelar',
    btnCreate:    'Criar',
    btnSave:      'Salvar',
    placeholder:  'Nome do evento...',
    tipAllDay:    '📅 Dia todo',
    months:       ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    days:         ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
    ribbonTitle:  'Timeline Calendar',
    commandName:  'Abrir Timeline Calendar',
    viewTitle:    'Timeline',
  },
  en: {
    title:        '📅 Timeline',
    allDay:       'All day',
    today:        'Today',
    week1:        '1wk',
    week2:        '2wks',
    month1:       'Month',
    month2:       '2 months',
    addBtn:       '+ New',
    modalNew:     'New event',
    modalEdit:    'Edit event',
    fieldTitle:   'Title',
    fieldDate:    'Date',
    fieldAllDay:  'All day',
    fieldStart:   'Start',
    fieldEnd:     'End',
    fieldNotes:   'Notes',
    fieldColor:   'Color',
    fieldDone:    'Done',
    btnDelete:    'Delete',
    btnCancel:    'Cancel',
    btnCreate:    'Create',
    btnSave:      'Save',
    placeholder:  'Event name...',
    tipAllDay:    '📅 All day',
    months:       ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    days:         ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    ribbonTitle:  'Timeline Calendar',
    commandName:  'Open Timeline Calendar',
    viewTitle:    'Timeline',
  },
};

/**
 * Returns the locale string from Obsidian's bundled moment (most accurate)
 * or falls back to the browser navigator.language.
 * If it starts with 'pt', use Portuguese; otherwise English.
 */
function detectLang() {
  try {
    // Obsidian sets moment's locale to match its UI language.
    const loc = (typeof window !== 'undefined' && window.moment)
      ? window.moment.locale()
      : navigator.language;
    return loc && loc.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  } catch (_) {
    return 'en';
  }
}

// ─── constants ────────────────────────────────────────────────────────────────

const COLORS = ['#4a7fe8','#7c5cbf','#e05c5c','#e07c3a','#3aaa6e','#2bbfc9','#c9722b','#b03ab5','#5a7fa8','#c94f7c'];

const START_H   = 5;
const END_H     = 23;
const SLOT_MINS = 30;
const TOTAL     = ((END_H - START_H) * 60) / SLOT_MINS; // 36 slots (5:00→23:00)
const SH        = 30; // slot height px

const COL = { 1: 220, 7: 110, 14: 78, 30: 52, 60: 28 };

// ─── pure helpers ─────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function addDays(d, n) {
  // JS Date overflow automatically handles month boundaries & leap years
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayKey() {
  const t = new Date(); t.setHours(0, 0, 0, 0); return dateKey(t);
}

function dayOff(n) {
  const t = new Date(); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() + n); return dateKey(t);
}

function fmtShort(k, months) {
  // Use T12:00 to avoid DST edge cases
  const d = new Date(k + 'T12:00');
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * Slot labels (language-independent — always numeric):
 *   slot  0 → "5:00-5:30"
 *   slot 35 → "22:30-23:00"
 */
function slotLabel(i) {
  const mS = START_H * 60 + i * SLOT_MINS;
  const mE = mS + SLOT_MINS;
  const fmt = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  return `${fmt(mS)}-${fmt(mE)}`;
}

function timeToSlot(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return Math.floor(((h - START_H) * 60 + m) / SLOT_MINS);
}

function slotToTime(i) {
  const m = START_H * 60 + i * SLOT_MINS;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function slotEndTime(i) { return slotToTime(Math.min(i + 1, TOTAL)); }

// ─── VIEW ─────────────────────────────────────────────────────────────────────

class TimelineView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.state  = { zoom: 14, offset: 0, events: [] };
    this._tip        = null;
    this._navEl      = null;
    this._periodEl   = null;
    this._gutterSlots = null;
    this._scroll     = null;
    this._lang       = 'en'; // resolved in onOpen
  }

  getViewType()    { return VIEW_TYPE; }
  getDisplayText() { return this._t ? this._t.viewTitle : 'Timeline'; }
  getIcon()        { return 'calendar-days'; }

  /** Shorthand: translate key */
  get _t() { return STRINGS[this._lang]; }

  async onOpen() {
    // Resolve language once when the view opens
    this._lang = detectLang();

    await this._loadData();

    const container = this.containerEl.children[1];
    container.empty();
    container.style.padding  = '0';
    container.style.overflow = 'hidden';

    this.root = container.createDiv({ cls: 'timeline-view' });
    this._buildToolbar();
    this._buildBody();
    this._tip = this.root.createDiv({ cls: 'tl-tip' });

    this.render();
  }

  async onClose() { await this._saveData(); }

  // ── persistence ─────────────────────────────────────────────────────────

  async _loadData() {
    const saved = await this.plugin.loadData();
    if (saved && Array.isArray(saved.events) && saved.events.length > 0) {
      this.state.events = saved.events;
    } else {
      this.state.events = this._sampleEvents();
    }
  }

  async _saveData() {
    await this.plugin.saveData({ events: this.state.events });
  }

  _sampleEvents() {
    return [
      { id: 'a', date: dayOff(0),  allDay: false, startTime: '09:00', endTime: '10:00', title: this._lang === 'pt' ? 'Reunião equipe'   : 'Team meeting',      color: '#4a7fe8', notes: 'Stand-up', done: false },
      { id: 'b', date: dayOff(1),  allDay: false, startTime: '14:00', endTime: '15:30', title: this._lang === 'pt' ? 'Apresentação Q2'  : 'Q2 Presentation',   color: '#e05c5c', notes: '',          done: false },
      { id: 'c', date: dayOff(-1), allDay: false, startTime: '08:00', endTime: '08:30', title: this._lang === 'pt' ? 'Academia'         : 'Gym',               color: '#3aaa6e', notes: '',          done: true  },
      { id: 'd', date: dayOff(3),  allDay: true,                                        title: this._lang === 'pt' ? 'Feriado'          : 'Holiday',           color: '#c9722b', notes: '',          done: false },
      { id: 'e', date: dayOff(0),  allDay: false, startTime: '11:00', endTime: '12:00', title: this._lang === 'pt' ? 'Almoço cliente'   : 'Client lunch',      color: '#7c5cbf', notes: '',          done: false },
      { id: 'f', date: dayOff(5),  allDay: false, startTime: '15:00', endTime: '16:00', title: this._lang === 'pt' ? 'Dentista'         : 'Dentist',           color: '#2bbfc9', notes: '',          done: false },
    ];
  }

  // ── toolbar ──────────────────────────────────────────────────────────────

  _buildToolbar() {
    const t  = this._t;
    const tb = this.root.createDiv({ cls: 'timeline-toolbar' });
    tb.createSpan({ cls: 'timeline-toolbar-title', text: t.title });

    const nav = tb.createDiv({ cls: 'timeline-nav' });
    this._navEl = nav;

    const prev = nav.createEl('button', { cls: 'tl-btn', text: '‹' });
    prev.onclick = () => { this.state.offset -= this.state.zoom; this.render(); };

    this._periodEl = nav.createSpan({ cls: 'tl-period' });

    const next = nav.createEl('button', { cls: 'tl-btn', text: '›' });
    next.onclick = () => { this.state.offset += this.state.zoom; this.render(); };

    const zg = tb.createDiv({ cls: 'tl-zoom-group' });
    [[1, t.today],[7, t.week1],[14, t.week2],[30, t.month1],[60, t.month2]].forEach(([z, label]) => {
      const b = zg.createEl('button', {
        cls: 'tl-zbtn' + (z === 14 ? ' active' : ''),
        text: label,
      });
      b.dataset.z = String(z);
      b.onclick = () => {
        zg.querySelectorAll('.tl-zbtn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        this.state.zoom = z;
        if (z === 1) this.state.offset = 0;
        this.render();
      };
    });

    const addBtn = tb.createEl('button', { cls: 'tl-add-btn', text: t.addBtn });
    addBtn.onclick = () => this.openModal(null);
  }

  // ── body ─────────────────────────────────────────────────────────────────

  _buildBody() {
    const body = this.root.createDiv({ cls: 'timeline-body' });

    const gutter = body.createDiv({ cls: 'tl-gutter' });
    gutter.createDiv({ cls: 'tl-gutter-corner' });
    gutter.createDiv({ cls: 'tl-gutter-allday', text: this._t.allDay });

    const gutterMask    = gutter.createDiv({ cls: 'tl-gutter-scroll-mask' });
    this._gutterSlots   = gutterMask.createDiv({ cls: 'tl-gutter-slots' });
    this._gutterSlots.style.height = (TOTAL * SH) + 'px';

    for (let i = 0; i < TOTAL; i++) {
      const s = this._gutterSlots.createDiv({
        cls: 'tl-gutter-slot' + (i % 2 === 0 ? ' on-hour' : ''),
        text: slotLabel(i),
      });
      s.style.height = SH + 'px';
    }

    this._scroll = body.createDiv({ cls: 'tl-scroll' });
    this._scroll.onscroll = () => this._syncGutter();
  }

  // ── render ────────────────────────────────────────────────────────────────

  colW() { return COL[this.state.zoom] || 78; }

  getStart() {
    if (this.state.zoom === 1) {
      const t = new Date(); t.setHours(0, 0, 0, 0); return t;
    }
    const t = new Date(); t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() + this.state.offset);
    return t;
  }

  render() {
    const t = this._t;
    this._updatePeriod();
    this._navEl.style.display = this.state.zoom === 1 ? 'none' : 'flex';

    const scroll   = this._scroll;
    const savedTop = scroll.scrollTop;
    scroll.empty();

    const n = this.state.zoom, cw = this.colW(), start = this.getStart();
    const tk = todayKey(), tw = n * cw;

    // ── Day headers ──
    const dhr = scroll.createDiv({ cls: 'tl-day-header-row' });
    dhr.style.minWidth = tw + 'px';

    for (let i = 0; i < n; i++) {
      const d = addDays(start, i), key = dateKey(d);
      const isTod   = key === tk;
      const isWe    = d.getDay() === 0 || d.getDay() === 6;
      const isFirst = d.getDate() === 1 || i === 0;

      const col = dhr.createDiv({
        cls: 'tl-dh' + (isTod ? ' today' : '') + (isWe ? ' weekend' : ''),
      });
      col.style.width = cw + 'px';

      if (isFirst || this.state.zoom <= 14) {
        col.createSpan({ cls: 'tl-dh-mo', text: t.months[d.getMonth()] });
      }
      col.createSpan({ cls: 'tl-dh-wd', text: t.days[d.getDay()] });

      const num = col.createSpan({ cls: 'tl-dh-num', text: String(d.getDate()) });
      if (isTod) {
        num.style.cssText = 'background:var(--interactive-accent);color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;';
      }
      col.onclick = () => this.openModal(null, key, true);
    }

    // ── All-day row ──
    const adr = scroll.createDiv({ cls: 'tl-allday-row' });
    adr.style.minWidth = tw + 'px';

    for (let i = 0; i < n; i++) {
      const d = addDays(start, i), key = dateKey(d);
      const cell = adr.createDiv({
        cls: 'tl-allday-cell' + (key === tk ? ' today' : ''),
      });
      cell.style.width  = cw + 'px';
      cell.style.height = '32px';
      cell.onclick = () => this.openModal(null, key, true);

      this.state.events
        .filter(ev => ev.allDay && ev.date === key)
        .forEach(ev => {
          const el = cell.createDiv({ cls: 'tl-allday-ev', text: ev.title });
          el.style.background = ev.color;
          el.onclick = e => { e.stopPropagation(); this.openModal(ev); };
        });
    }

    // ── Time grid ──
    const grid = scroll.createDiv({ cls: 'tl-grid' });
    grid.style.minWidth = tw + 'px';

    for (let i = 0; i < n; i++) {
      const d = addDays(start, i), key = dateKey(d);
      const isTod = key === tk, isWe = d.getDay() === 0 || d.getDay() === 6;

      const col = grid.createDiv({
        cls: 'tl-day-col' + (isTod ? ' today' : '') + (isWe ? ' weekend' : ''),
      });
      col.style.width  = cw + 'px';
      col.dataset.date = key;

      for (let s = 0; s < TOTAL; s++) {
        const slot = col.createDiv({
          cls: 'tl-slot' + (s % 2 === 0 ? ' on-hour' : ''),
        });
        slot.style.height = SH + 'px';
        slot.onclick = (si => () => this.openModal(null, key, false, si))(s);
      }

      this.state.events
        .filter(ev => !ev.allDay && ev.date === key)
        .forEach(ev => this._renderEv(col, ev));

      if (isTod) {
        const now  = new Date();
        const mins = (now.getHours() - START_H) * 60 + now.getMinutes();
        if (mins >= 0 && mins < TOTAL * SLOT_MINS) {
          const line = col.createDiv({ cls: 'tl-now-line' });
          line.style.top = ((mins / SLOT_MINS) * SH) + 'px';
        }
      }
    }

    if (savedTop > 0) {
      scroll.scrollTop = savedTop;
    } else {
      requestAnimationFrame(() => {
        scroll.scrollTop = ((7 - START_H) * 60 / SLOT_MINS) * SH; // start at 07:00
        this._syncGutter();
      });
    }
    this._syncGutter();
  }

  _syncGutter() {
    if (this._gutterSlots && this._scroll) {
      this._gutterSlots.style.transform = `translateY(-${this._scroll.scrollTop}px)`;
    }
  }

  // ── Period label ─────────────────────────────────────────────────────────

  _updatePeriod() {
    const t = this._t;
    const s = this.getStart(), e = addDays(s, this.state.zoom - 1);
    if (this.state.zoom === 1) {
      this._periodEl.textContent =
        `${t.days[s.getDay()]}, ${s.getDate()} ${t.months[s.getMonth()]} ${s.getFullYear()}`;
    } else {
      this._periodEl.textContent =
        `${fmtShort(dateKey(s), t.months)} – ${fmtShort(dateKey(e), t.months)} ${e.getFullYear()}`;
    }
  }

  // ── Render event block ───────────────────────────────────────────────────

  _renderEv(col, ev) {
    const ss  = timeToSlot(ev.startTime);
    const es  = timeToSlot(ev.endTime);
    const dur = Math.max(1, es - ss);
    if (ss < 0 || ss >= TOTAL) return;

    const el = col.createDiv({ cls: 'tl-ev' + (ev.done ? ' done' : '') });
    el.style.top        = (ss * SH + 1) + 'px';
    el.style.height     = (dur * SH - 2) + 'px';
    el.style.background = ev.color;

    el.createDiv({ cls: 'tl-ev-title', text: ev.title });
    if (ev.startTime) {
      el.createDiv({
        cls: 'tl-ev-time',
        text: ev.startTime + (ev.endTime ? ' – ' + ev.endTime : ''),
      });
    }
    el.onclick      = () => this.openModal(ev);
    el.onmouseenter = e => this._showTip(e, ev);
    el.onmouseleave = () => this._hideTip();
  }

  // ── Tooltip ──────────────────────────────────────────────────────────────

  _showTip(e, ev) {
    const tip = this._tip;
    if (!tip || !this.root) return;
    tip.style.display = 'block';
    const meta = ev.allDay
      ? this._t.tipAllDay
      : `⏰ ${ev.startTime || ''}${ev.endTime ? ' – ' + ev.endTime : ''}`;
    tip.innerHTML =
      `<div class="tl-tip-title">${ev.title}</div>` +
      `<div class="tl-tip-meta">${meta}${ev.notes ? '\n📝 ' + ev.notes : ''}</div>`;
    const rect = this.root.getBoundingClientRect();
    tip.style.left = Math.min(e.clientX - rect.left + 10, rect.width - 230) + 'px';
    tip.style.top  = Math.max(4, e.clientY - rect.top - 60) + 'px';
  }

  _hideTip() { if (this._tip) this._tip.style.display = 'none'; }

  // ── Modal ────────────────────────────────────────────────────────────────

  openModal(ev, defDate, defAllDay = false, defSlot = null) {
    const t    = this._t;
    const isNew = !ev;
    const ds   = defSlot != null ? slotToTime(defSlot)  : '09:00';
    const de   = defSlot != null ? slotEndTime(defSlot) : '09:30';
    const d    = ev
      ? { ...ev }
      : { id: uid(), title: '', date: defDate || dayOff(0), allDay: defAllDay,
          startTime: ds, endTime: de, color: COLORS[0], notes: '', done: false };

    let selColor = d.color || COLORS[0];

    this.root.querySelector('.tl-overlay')?.remove();

    const ov    = this.root.createDiv({ cls: 'tl-overlay open' });
    ov.onclick  = e => { if (e.target === ov) ov.remove(); };

    const modal = ov.createDiv({ cls: 'tl-modal' });
    modal.onclick = e => e.stopPropagation();

    modal.createEl('h3', { text: isNew ? t.modalNew : t.modalEdit });

    // Title
    const mfTitle = modal.createDiv({ cls: 'tl-mf' });
    mfTitle.createEl('label', { text: t.fieldTitle });
    const inputTitle = mfTitle.createEl('input', { type: 'text', placeholder: t.placeholder });
    inputTitle.value = d.title;

    // Date
    const mfDate = modal.createDiv({ cls: 'tl-mf' });
    mfDate.createEl('label', { text: t.fieldDate });
    const inputDate = mfDate.createEl('input', { type: 'date' });
    inputDate.value = d.date;

    // All-day
    const mfAllDay  = modal.createDiv({ cls: 'tl-mf' });
    const lblAD     = mfAllDay.createEl('label');
    const chkAllDay = lblAD.createEl('input', { type: 'checkbox' });
    chkAllDay.checked = !!d.allDay;
    lblAD.appendText(' ' + t.fieldAllDay);

    // Time row
    const timeRow = modal.createDiv({ cls: 'tl-mrow' });
    if (d.allDay) timeRow.style.display = 'none';

    const mfStart   = timeRow.createDiv({ cls: 'tl-mf' });
    mfStart.createEl('label', { text: t.fieldStart });
    const inputStart = mfStart.createEl('input', { type: 'time' });
    inputStart.value = d.startTime || '';

    const mfEnd   = timeRow.createDiv({ cls: 'tl-mf' });
    mfEnd.createEl('label', { text: t.fieldEnd });
    const inputEnd = mfEnd.createEl('input', { type: 'time' });
    inputEnd.value = d.endTime || '';

    chkAllDay.onchange = function () {
      timeRow.style.display = this.checked ? 'none' : 'flex';
      d.allDay = this.checked;
    };

    // Notes
    const mfNotes   = modal.createDiv({ cls: 'tl-mf' });
    mfNotes.createEl('label', { text: t.fieldNotes });
    const inputNotes = mfNotes.createEl('textarea');
    inputNotes.rows  = 2;
    inputNotes.value = d.notes || '';

    // Color swatches
    const mfColor = modal.createDiv({ cls: 'tl-mf' });
    mfColor.createEl('label', { text: t.fieldColor });
    const crow = mfColor.createDiv({ cls: 'tl-crow' });
    COLORS.forEach(c => {
      const sw = crow.createSpan({ cls: 'tl-sw' + (selColor === c ? ' sel' : '') });
      sw.style.background = c;
      sw.onclick = () => {
        crow.querySelectorAll('.tl-sw').forEach(s => s.classList.remove('sel'));
        sw.classList.add('sel');
        selColor = c;
      };
    });

    // Done (edit only)
    let chkDone = null;
    if (!isNew) {
      const mfDone  = modal.createDiv({ cls: 'tl-mf' });
      const lblDone = mfDone.createEl('label');
      chkDone = lblDone.createEl('input', { type: 'checkbox' });
      chkDone.checked = !!d.done;
      lblDone.appendText(' ' + t.fieldDone);
    }

    // Buttons
    const mact = modal.createDiv({ cls: 'tl-mact' });

    if (!isNew) {
      const delBtn = mact.createEl('button', { cls: 'tl-mbtn danger', text: t.btnDelete });
      delBtn.onclick = () => {
        this.state.events = this.state.events.filter(e => e.id !== d.id);
        ov.remove();
        this._saveData();
        this.render();
      };
    }

    const cancelBtn = mact.createEl('button', { cls: 'tl-mbtn secondary', text: t.btnCancel });
    cancelBtn.onclick = () => ov.remove();

    const saveBtn = mact.createEl('button', {
      cls: 'tl-mbtn primary',
      text: isNew ? t.btnCreate : t.btnSave,
    });
    saveBtn.onclick = () => {
      const title = inputTitle.value.trim();
      if (!title) { inputTitle.style.borderColor = '#c0392b'; return; }

      d.title     = title;
      d.date      = inputDate.value;
      d.allDay    = chkAllDay.checked;
      d.startTime = inputStart.value || '';
      d.endTime   = inputEnd.value   || '';
      d.notes     = inputNotes.value;
      d.color     = selColor;
      if (!isNew && chkDone) d.done = chkDone.checked;

      if (isNew) {
        this.state.events.push(d);
      } else {
        const idx = this.state.events.findIndex(e => e.id === d.id);
        if (idx >= 0) this.state.events[idx] = d;
      }

      ov.remove();
      this._saveData();
      this.render();
    };

    setTimeout(() => inputTitle.focus(), 50);
  }
}

// ─── PLUGIN ───────────────────────────────────────────────────────────────────

class TimelinePlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new TimelineView(leaf, this));

    // Ribbon icon and command labels also adapt to language
    const lang = detectLang();
    const t    = STRINGS[lang];

    this.addRibbonIcon('calendar-days', t.ribbonTitle, () => this.activateView());

    this.addCommand({
      id:       'open-timeline-calendar',
      name:     t.commandName,
      callback: () => this.activateView(),
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async activateView() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE);

    if (leaves.length > 0) {
      workspace.revealLeaf(leaves[0]);
      return;
    }

    const leaf = workspace.getLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    workspace.revealLeaf(leaf);
  }
}

module.exports = TimelinePlugin;
