# MosaicBoard

_Open-source, themeable boards for calm, clear planning._

> A Trello-style kanban that emphasizes accessibility, low-overwhelm visuals, and gentle defaults. Built to be extended and themed.

---

## ✨ Highlights

- **Boards • Lists • Cards** with smooth drag & drop  
- **Labels & filters** (low-saturation palettes by default)  
- **Checklists, due dates, reminders**  
- **Comments & activity log** per card  
- **Board templates** (Personal Kanban, Sprint Board, Content Pipeline)  
- **Global search** across boards  
- **Keyboard navigation** and quick actions  
- **Appearance → Themes** (Light, Dark, **Nebula**) + font/size/density controls  
- **Import / Export** (JSON, CSV)  
- **Neurodiversity-friendly options** (reduced motion, higher spacing, simplified contrast)  

> Default typeface: **Inter** (open-source). You can switch in Settings → Appearance.

---

## 🧭 Why MosaicBoard?

- **Calm by design.** Minimal color noise, generous spacing, and plain language.  
- **Yours to shape.** Theme it, extend it, automate it.  
- **Open.** Transparent roadmap and contribution model.

---

## 🚀 Quick Start (End Users)

1. **Create a board.** Add lists: _Backlog_, _Doing_, _Done_.  
2. **Add cards.** Keep titles short; use checklists for steps.  
3. **Label & filter.** Try Priority labels (P1/P2/P3) in muted tones.  
4. **Theme it.** Settings → Appearance → choose **Nebula** or adjust font/spacing.  
5. **Search (/**).** Type to find any card across all boards.  
6. **Wrap up.** Move finished cards to _Done_; archive weekly.

Keyboard tips:  
- **N** new card • **/** search • **L** labels • **D** due date • **E** edit description

---

## 🧪 “Build Studio” Tasks (Copy/Paste Instructions)

> Use these as implementation directives. Avoid tech-specific naming; rely on native Build Studio primitives.

### Data Models
- Create **Board** { id, name, description, created_at, archived_at, theme_id }.  
- Create **List** { id, board_id, name, position }.  
- Create **Card** { id, list_id, title, description, position, due_at, completed_at, labels[], assignees[], checklist_items[], attachments[], activity[] }.  
- Create **ChecklistItem** { id, card_id, text, is_done }.  
- Create **Label** { id, board_id, name, color_token }.  
- Create **Theme** { id, name, palette_tokens, font_family, font_scale, density, corner_radius, motion_level }.  
- Create **Activity** { id, card_id, type, message, created_by, created_at }.

### Core Interactions
- Enable drag & drop for Lists and Cards with real-time position updates.  
- Add quick-create (“+”) at end of each List (autofocus title).  
- Implement inline edit for card title on Enter/Escape semantics.

### Search & Filter
- Add header Search input (hotkey **/**).  
- Implement filtering by label, assignee, and due status (Today/This Week/Overdue).

### Checklists & Dates
- On completing all ChecklistItems, mark card progress 100%.  
- Due date pill shows: due “Today”, “Tomorrow”, “Overdue Xd”.

### Comments & Activity
- Add comment box with @mentions (no notifications required for v1).  
- Log key actions to Activity: create/move/complete/comment/label changes.

### Appearance → Themes (Settings Page)
- Add **Appearance** section under **Settings**.  
- Controls: Theme select (Light/Dark/**Nebula**), Font family (Inter/Manrope), Font scale (S/M/L/XL), Density (Cozy/Comfortable/Roomy), Corner radius (Soft/Rounded/Extra), Motion (Full/Reduced).  
- Persist theme at user scope; allow Board-level override.  
- Provide preview panel that live-reflects choices before apply.

### Nebula Theme (Preset)
- Palette tokens: deep space background, soft starfield accents, magenta highlight, teal secondary, low-saturation surfaces, subtle glow for focus rings.  
- Ensure WCAG AA contrast on text and critical UI.

### Templates
- Add **New Board → Choose Template**: Personal Kanban, Sprint Board, Content Pipeline.  
- Each template pre-creates Lists, Labels, and example Cards.

### Import / Export
- **Export** a board as JSON and CSV (cards, lists, labels, checklist items).  
- **Import** JSON (schema-validated); create missing labels and lists.

### Automation (v1 light rules)
- Rule: “When card moved to **Done**, set `completed_at` and archive after 14 days.”  
- Rule: “When due date passes, add **Overdue** label.”

### Accessibility & Calm Mode
- Toggle: **Reduce motion** (disable animations).  
- Toggle: **Simplify visuals** (hide non-essential chrome; increase spacing).  
- Toggle: **Readable contrast** (enforce AA+ tokens).

---

## 🗺️ Roadmap

**Near-term**
- Board sharing (view/comment), per-board permissions  
- Card cover images + color tints  
- Subtasks as first-class (promote checklist items)  
- Saved filters & views  
- Calendar view for due dates

**Exploratory**
- Offline-first sync  
- Automation builder (if/then UI)  
- Public board publishing with read-only share links

> Want something added? Open an issue titled `Feature: <name>` with a short user story.

---
