# 📅 Timeline Calendar

> A week/month timeline calendar plugin for [Obsidian](https://obsidian.md), with time slots from **05:00 to 23:00**. Supports **Portuguese** and **English** — language is detected automatically.

---

## ✨ Features

- Multiple zoom levels: Day, 1 week, 2 weeks, 1 month, 2 months
- Time grid from 05:00 to 23:00 in 30-minute slots
- All-day events in a dedicated row above the grid
- Live "now" line showing the current time
- Create, edit, and delete events via a modal form
- Color picker with 10 preset colors
- Tags per event, visible in the hover tooltip
- Link events to notes inside your vault
- Auto-detect events written in dated notes
- Read-only note events that open their source note on click
- Automatic language detection (Portuguese / English)
- Works on desktop and mobile

---

## 📦 Installation

### Manual (recommended for now)

1. Download or clone this repository.
2. Copy the three files into your vault's plugins folder:

```
<your-vault>/.obsidian/plugins/timeline-calendar/
├── main.js
├── manifest.json
└── styles.css
```

3. Open Obsidian → **Settings → Community Plugins** → enable **Timeline Calendar**.

### Via Community Plugins *(coming soon)*

The plugin will be submitted to the Obsidian community plugin list.

---

## 🚀 How to open

After enabling the plugin, open the timeline in two ways:

- Click the **calendar icon** (📅) in the left ribbon.
- Run the command **"Open Timeline Calendar"** from the Command Palette (`Ctrl/Cmd + P`).

---

---

# 📖 User Manual

This section covers everything you can do with Timeline Calendar, step by step.

---

## The interface

When you open the plugin, you'll see three main areas:

**Toolbar** — at the top, with navigation arrows, zoom level buttons, and the button to create new events.

**Day headers + All-day row** — a sticky header showing the days in the current view, and a thin strip for all-day events just below.

**Time grid** — the main area, covering 05:00 to 23:00 in 30-minute slots, with one column per day.

### Toolbar reference

| Element | What it does |
|---|---|
| **‹ ›** arrows | Navigate backward/forward in time |
| **Period label** | Shows the current date range being displayed |
| **Hj / Today** | Snaps to today (single-day view, arrows hidden) |
| **1wk / 1sem** | Shows 7 days |
| **2wks / 2sem** | Shows 14 days (default on open) |
| **Month / Mês** | Shows 30 days |
| **2 months / 2 meses** | Shows 60 days |
| **+ New / + Novo** | Opens the form to create a new event |

### Day headers

- **Weekends** (Sat/Sun) are highlighted in red.
- **Today's** date number has a filled circle background in the accent color.
- Clicking any day header opens the event form pre-filled with that date as an all-day event.

### The time grid

- Covers **05:00 to 23:00**, split into **30-minute slots**.
- Darker horizontal lines mark full hours; lighter lines mark half-hours.
- **Today's column** has a subtle accent background tint.
- **Weekend columns** have a light red tint.
- A **red horizontal line** marks the current time in today's column and stays in sync as time passes.
- Clicking any slot opens the event form pre-filled with that date and time slot.

---

## Creating an event

There are three ways to start creating an event:

1. Click **+ New / + Novo** in the toolbar — opens a blank form.
2. Click a **time slot** in the grid — opens the form pre-filled with that date and time.
3. Click a **day header** — opens the form pre-filled with that date as an all-day event.

### Event form fields

| Field | Description |
|---|---|
| **Title** | Event name — required, cannot be left empty |
| **Date** | Day the event belongs to |
| **All day** | Check to mark as all-day (hides the Start and End fields) |
| **Start** | Start time (e.g. `09:00`) |
| **End** | End time (e.g. `10:30`) |
| **Notes** | Free-text notes, shown in the hover tooltip |
| **Linked note** | Path to a note in your vault (e.g. `folder/note.md`) |
| **Tags** | Comma-separated tags, shown in the hover tooltip |
| **Color** | Choose from 10 preset colors via color swatches |

Click **Create / Criar** to save. The calendar updates immediately.

---

## Editing an event

Click on any event block in the calendar. The same form opens, now with two extra elements:

- **Done / Concluído** checkbox — marks the event as completed. Done events appear with reduced opacity and a strikethrough on their title.
- **Delete / Excluir** button (red) — permanently removes the event after clicking.

Click **Save / Salvar** to apply changes.

---

## All-day events

Check the **All day** box in the event form. The Start and End time fields will hide automatically.

All-day events appear in the **all-day strip** at the top of the calendar, above the time grid. They do not occupy any slot in the main grid.

---

## Hover tooltip

Hovering your mouse over any event shows a tooltip with its full details:

```
Team meeting
⏰ 09:00 – 10:00
📝 Stand-up notes
🏷 work, meeting
🔗 projects/q2.md
```

For all-day events, the time line is replaced with `📅 All day`. Fields that are empty are not shown in the tooltip.

---

## Linking a note to an event

In the event form, there is a field called **"Linked note"** (or **"Nota vinculada"** in Portuguese). Type the path of any note inside your vault:

```
diary/meetings.md
```

```
projects/project-x/plan.md
```

As soon as you type something, an **"Open note"** button appears right next to the field. Click it to open the note directly in Obsidian without closing the form. The path is saved with the event and is shown in the hover tooltip:

```
🔗 projects/project-x/plan.md
```

> **Tip:** Use this to connect a calendar event to its meeting notes, planning document, or any relevant file in your vault. You can open the linked note at any time by editing the event and clicking "Open note".

---

## Adding tags to an event

In the event form, there is a **"Tags"** field. Type tags separated by commas:

```
work, meeting, urgent
```

Tags are saved with the event. When you hover over it in the calendar, the tooltip shows:

```
⏰ 09:00 – 10:00
🏷 work, meeting, urgent
```

---

## Auto-detecting events from notes

You can write events directly inside your daily notes or any dated markdown file, and the plugin will automatically detect them and display them in the calendar — no manual entry needed.

### Step 1 — Name the file with a date

Any of these filename formats work:

```
2025-03-27.md
2025-03-27 Daily note.md
Notes 2025-03-27 meeting.md
```

The plugin scans your entire vault and picks up any file whose name contains a date in `YYYY-MM-DD` format.

### Step 2 — Write events inside the note

Each line that starts with a time (`H:MM` or `HH:MM`) followed by a title is parsed as an event:

```
09:00 Study English
14:30 Gym
20:00 Revision
```

It also works with Obsidian list syntax and task checkboxes:

```markdown
- 09:00 Study English
* 14:30 Gym
- [ ] 20:00 Revision
- [x] 08:00 Morning run (already done)
```

### Step 3 — See them in the calendar

Those events are automatically shown in the timeline on their corresponding date. When you **save the note**, the calendar updates instantly — no need to reopen or refresh anything. The plugin listens for file changes, creations, deletions, and renames in real time.

> **Note:** Only times between 05:00 and 23:00 are shown in the grid. Lines with times outside this range are ignored.

---

## Note events are read-only

Events detected from notes look different from events you created manually:

- They have a **dashed left border**.
- Their color is grey by default.
- Hovering shows a tooltip ending with:

```
📄 Event from note (read-only)
```

**Clicking** a note event **opens its source note** directly in Obsidian. There is no edit or delete button for these events. To change them, edit the corresponding line in the markdown file — the calendar will update automatically.

---

## Navigating time

Use the **‹** and **›** arrows in the toolbar to move backward and forward. Each click shifts the view by the number of days currently shown — for example, 7 days at a time in 1-week mode, or 30 days at a time in month mode.

Switch zoom levels at any time by clicking the buttons in the toolbar. The calendar re-renders instantly. In **Today / Hj** mode, the navigation arrows are hidden and the view is always fixed on today.

---

## Data and persistence

- **User-created events** are saved automatically in Obsidian's plugin data (`data.json`) every time you create, edit, or delete an event. They persist between sessions and vault restarts.
- **Note-detected events** are never saved permanently. They are re-parsed from your notes every time the calendar opens, or whenever any file in the vault is modified, created, renamed, or deleted.

---

## Language

The plugin detects your locale automatically via Obsidian / `moment.js`:

- Locale starting with `pt` → **Portuguese** interface.
- Any other locale → **English** interface.

No configuration is needed.

---

---

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/resina37451/timeline-calendar.git

# Copy files to your test vault
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/timeline-calendar/

# Enable the plugin in Obsidian Settings → Community Plugins
```

The plugin is built with vanilla JavaScript using the Obsidian API — no bundler or build step required.

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

## 🙌 Author

Made by [resina37451](https://github.com/resina37451-cell).  
Feedback, issues, and contributions are welcome!
