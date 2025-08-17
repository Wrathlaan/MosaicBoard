**Goal**: Manage the high-level structure of a project board.

**Primary Actions**:
- Create, rename, and delete lists.
- Add new cards to any list.
- Reorder cards within a list via drag-and-drop.
- Move cards between lists via drag-and-drop.

**Key Entities**:
- `List`: A vertical column that contains cards.
- `Card`: A basic task item, represented as a draggable unit on the board.

**Constraints**:
- All state changes must be persisted.
- Card movement must be atomic.
