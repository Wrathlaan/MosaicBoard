# MosaicBoard

MosaicBoard is a feature-rich, Trello-like project management application designed for organizing tasks with interactive lists and draggable cards. It offers extensive customization and multiple views to suit various workflows.

**Note:** This application is in active development. Features may be incomplete or change over time.

*A clean, modern interface showing multiple lists like "Website Redesign", "Q2 Features", and "Done". Cards within the lists display titles, colored labels, cover images, and member avatars. The header provides options for different views (Board, Calendar, Table, etc.), filtering, and settings.*

## Building the Application

This project is configured to be packaged as a standalone desktop application using Electron.

### Prerequisites

- [Node.js](https://nodejs.org/) and npm (or your favorite package manager).

### Build Steps

1.  **Install Dependencies**:
    Open your terminal in the project root and run:
    ```bash
    npm install
    ```

2.  **Build the Executable**:
    To build the application for your current platform, run:
    ```bash
    npm run dist
    ```
    This command first builds the React frontend, then packages it with Electron into an executable.

3.  **Find the Output**:
    The installer and portable executable files will be located in the `dist/` directory.

## Development

To run the application in development mode with hot-reloading:

1.  **Start the Renderer**:
    In one terminal, run the Vite development server:
    ```bash
    npm run dev
    ```

2.  **Start Electron**:
    In a second terminal, run the Electron main process:
    ```bash
    npm run dev:electron
    ```
    This will open the application window, loading the content from the Vite server.

## Key Features

### Core Board Functionality
- **Drag & Drop**: Intuitively move cards within and between lists.
- **Lists & Cards**: Create, rename, and delete lists and cards effortlessly.
- **In-place Editing**: Quickly edit list and card titles directly on the board.

### Comprehensive Card Details
- **Rich Content**: Add detailed descriptions, due dates, start dates, and locations.
- **Organization**: Assign members, apply color-coded labels, and watch cards for updates.
- **Task Breakdown**: Create checklists with progress bars to track sub-tasks.
- **Collaboration**: Leave comments, @mention teammates, and view a full activity log.
- **Attachments**: Attach files (with image previews) and links from the web.
- **Customization**: Personalize cards with cover images or solid colors.
- **Advanced Fields**: Add custom fields (text, number, date, dropdowns) to tailor cards to your needs.
- **Linked Cards**: Create relationships between cards to track dependencies.

### Multiple Project Views
- **Board View**: The classic Kanban-style view.
- **Calendar View**: Visualize cards with due dates on a monthly calendar.
- **Timeline View**: Plan projects with a Gantt-like timeline for cards with start and end dates.
- **Table View**: See all cards in a sortable, spreadsheet-style format.
- **Dashboard View**: Get a high-level overview with charts for cards per list, member, and label.
- **Map View**: Pinpoint cards that have a physical location assigned.

### Powerful Customization & Theming
- **Appearance Engine**: Switch between light, dark, and system-native themes.
- **Personalize**: Choose a custom accent color, corner radius, UI density, and font size.
- **Board Backgrounds**: Select from various backgrounds like dots, grids, or an animated nebula.
- **Theme Management**: Export your custom theme to a file and import themes from others.

### Automation & Productivity
- **Filtering**: Instantly filter the board by keyword, members, labels, or due date status.
- **Automation Rules**: Set up triggers (e.g., "when card moves to Done") and actions (e.g., "mark due date complete").
- **Notifications**: Stay informed about mentions, assignments, and updates on watched cards.

## Built With
This application was developed with assistance from Google AI.