import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { argbFromHex, themeFromSourceColor, applyTheme } from '@material/material-color-utilities';

// Types
interface Theme {
  mode: 'system' | 'light' | 'dark';
  accent: string;
  radius: number;
  density: 'compact' | 'comfortable' | 'cozy';
  fontScale: number;
  reducedMotion: boolean;
  boardBackground: 'none' | 'dots' | 'grid' | 'noise' | 'nebula';
}

interface Card {
  id: string;
  text: string;
  labels?: string[];
  members?: string[];
  description?: string;
  comments?: Comment[];
  dueDate?: { timestamp: number; completed: boolean };
  startDate?: { timestamp: number };
  location?: string;
  checklists?: Checklist[];
  attachments?: Attachment[];
  cover?: {
    type: 'color' | 'image';
    value: string;
    size: 'normal' | 'full';
  };
  customFields?: { [key: string]: any };
  linkedCards?: string[];
  watching?: boolean;
}

interface List {
  id: string;
  title: string;
  cards: Card[];
}

interface Comment {
  id: string;
  authorId: string;
  text: string;
  timestamp: number;
  attachments?: Attachment[];
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  attachments?: Attachment[];
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'file' | 'link';
  size?: number;
  uploadedAt: number;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  initials: string;
}

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';
  options?: string[];
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: 'card_moved' | 'due_date_approaching' | 'member_assigned' | 'label_added';
    conditions: any;
  };
  actions: {
    type: 'mark_due_complete' | 'add_label' | 'assign_member' | 'move_card' | 'send_notification';
    params: any;
  }[];
  enabled: boolean;
}

// Default theme
const defaultTheme: Theme = {
  mode: 'system',
  accent: '#0079BF',
  radius: 10,
  density: 'comfortable',
  fontScale: 1.0,
  reducedMotion: false,
  boardBackground: 'none'
};

// Theme management functions
const loadTheme = (): Theme => {
  try {
    const stored = localStorage.getItem('mosaic.theme');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure boardBackground is a valid enum value
      if (parsed.boardBackground && !['none', 'dots', 'grid', 'noise', 'nebula'].includes(parsed.boardBackground)) {
        parsed.boardBackground = 'none';
      }
      return { ...defaultTheme, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage:', error);
  }
  return defaultTheme;
};

const saveTheme = (theme: Theme): void => {
  try {
    // Create a clean theme object with only the essential data
    const cleanTheme: Theme = {
      mode: theme.mode,
      accent: theme.accent,
      radius: theme.radius,
      density: theme.density,
      fontScale: theme.fontScale,
      reducedMotion: theme.reducedMotion,
      boardBackground: theme.boardBackground // Only store the enum value, not CSS
    };
    localStorage.setItem('mosaic.theme', JSON.stringify(cleanTheme));
  } catch (error) {
    console.error('Failed to save theme to localStorage:', error);
    // Try to clear some space and retry
    try {
      localStorage.removeItem('mosaic.theme');
      localStorage.setItem('mosaic.theme', JSON.stringify(cleanTheme));
    } catch (retryError) {
      console.error('Failed to save theme even after clearing:', retryError);
    }
  }
};

const applyThemeToDOM = (theme: Theme): void => {
  const root = document.documentElement;
  
  // Apply theme mode
  if (theme.mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme.mode);
  }
  
  // Apply other theme properties
  root.setAttribute('data-density', theme.density);
  root.setAttribute('data-reduced-motion', theme.reducedMotion.toString());
  root.setAttribute('data-board-bg', theme.boardBackground);
  
  // Apply CSS custom properties
  root.style.setProperty('--radius', `${theme.radius}px`);
  root.style.fontSize = `${16.5 * theme.fontScale}px`;
  
  // Apply Material Design color scheme
  try {
    const sourceColor = argbFromHex(theme.accent);
    const materialTheme = themeFromSourceColor(sourceColor);
    const isDark = root.getAttribute('data-theme') === 'dark';
    const scheme = isDark ? materialTheme.schemes.dark : materialTheme.schemes.light;
    
    applyTheme(materialTheme, { target: root, dark: isDark });
    root.style.setProperty('--color-primary', theme.accent);
  } catch (error) {
    console.warn('Failed to apply Material Design colors:', error);
    root.style.setProperty('--color-primary', theme.accent);
  }
};

// Sample data
const sampleLabels: Label[] = [
  { id: 'label-1', name: 'Feature', color: '#61BD4F' },
  { id: 'label-2', name: 'Bug', color: '#EB5A46' },
  { id: 'label-3', name: 'Design', color: '#C377E0' },
  { id: 'label-4', name: 'High Priority', color: '#F2D600' },
  { id: 'label-5', name: 'Research', color: '#FF9F1A' },
  { id: 'label-6', name: 'Documentation', color: '#0079BF' }
];

const sampleMembers: Member[] = [
  { id: 'member-1', name: 'Alex Chen', avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop', initials: 'AC' },
  { id: 'member-2', name: 'Sarah Johnson', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop', initials: 'SJ' },
  { id: 'member-3', name: 'Mike Rodriguez', avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop', initials: 'MR' },
  { id: 'member-4', name: 'Emily Davis', avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop', initials: 'ED' }
];

const sampleCustomFields: CustomField[] = [
  { id: 'field-1', name: 'Priority', type: 'dropdown', options: ['Low', 'Medium', 'High', 'Critical'] },
  { id: 'field-2', name: 'Story Points', type: 'number' },
  { id: 'field-3', name: 'Epic', type: 'text' },
  { id: 'field-4', name: 'Ready for Review', type: 'checkbox' }
];

const initialLists: List[] = [
  {
    id: 'list-1',
    title: 'Website Redesign',
    cards: [
      {
        id: 'card-1',
        text: 'Research competitor websites',
        labels: ['label-5'],
        members: ['member-1'],
        description: 'Analyze top 5 competitor websites to understand current design trends and user experience patterns.',
        dueDate: { timestamp: Date.now() + 7 * 24 * 60 * 60 * 1000, completed: false },
        checklists: [
          {
            id: 'checklist-1',
            title: 'Research Tasks',
            items: [
              { id: 'item-1', text: 'Identify top 5 competitors', completed: true },
              { id: 'item-2', text: 'Screenshot key pages', completed: false },
              { id: 'item-3', text: 'Document design patterns', completed: false }
            ]
          }
        ],
        customFields: { 'field-1': 'High', 'field-2': 5 }
      },
      {
        id: 'card-2',
        text: 'Create wireframes for homepage',
        labels: ['label-3'],
        members: ['member-2'],
        cover: {
          type: 'image',
          value: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop',
          size: 'normal'
        },
        customFields: { 'field-1': 'Medium', 'field-2': 8 }
      },
      {
        id: 'card-3',
        text: 'Design system documentation',
        labels: ['label-6', 'label-3'],
        members: ['member-1', 'member-2'],
        cover: {
          type: 'color',
          value: '#C377E0',
          size: 'normal'
        },
        customFields: { 'field-1': 'Low', 'field-2': 3 }
      }
    ]
  },
  {
    id: 'list-2',
    title: 'Q2 Features',
    cards: [
      {
        id: 'card-4',
        text: 'Implement dark mode toggle',
        labels: ['label-1'],
        members: ['member-3'],
        description: 'Add a toggle switch in the header to allow users to switch between light and dark themes.',
        startDate: { timestamp: Date.now() },
        dueDate: { timestamp: Date.now() + 14 * 24 * 60 * 60 * 1000, completed: false },
        customFields: { 'field-1': 'High', 'field-2': 13 }
      },
      {
        id: 'card-5',
        text: 'Add user profile settings',
        labels: ['label-1'],
        members: ['member-4'],
        cover: {
          type: 'image',
          value: 'https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop',
          size: 'full'
        },
        customFields: { 'field-1': 'Medium', 'field-2': 8 }
      }
    ]
  },
  {
    id: 'list-3',
    title: 'Done',
    cards: [
      {
        id: 'card-6',
        text: 'Set up project repository',
        labels: ['label-1'],
        members: ['member-1'],
        dueDate: { timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, completed: true },
        customFields: { 'field-1': 'High', 'field-2': 2, 'field-4': true }
      }
    ]
  }
];

// Main App Component
const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [lists, setLists] = useState<List[]>(initialLists);
  const [currentView, setCurrentView] = useState<'board' | 'calendar' | 'timeline' | 'table' | 'dashboard' | 'map'>('board');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showElementCustomizer, setShowElementCustomizer] = useState(false);
  const [filterState, setFilterState] = useState({
    keyword: '',
    members: [] as string[],
    labels: [] as string[],
    dueDateFilter: 'all' as 'all' | 'overdue' | 'due-soon' | 'no-due-date'
  });
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyThemeToDOM(theme);
    saveTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme.mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyThemeToDOM(theme);
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme.mode]);

  return (
    <div id="root">
      <header>
        <h1>MosaicBoard</h1>
        <div className="header-center">
          <div className="view-switcher">
            <button 
              className={currentView === 'board' ? 'active' : ''}
              onClick={() => setCurrentView('board')}
            >
              Board
            </button>
            <button 
              className={currentView === 'calendar' ? 'active' : ''}
              onClick={() => setCurrentView('calendar')}
            >
              Calendar
            </button>
          </div>
        </div>
        <div className="header-right">
          <button className="header-btn" onClick={() => setShowSettings(true)}>
            <span className="icon">settings</span>
            Settings
          </button>
        </div>
      </header>
      
      <main className={`main-container view-${currentView}`}>
        {currentView === 'board' && (
          <div className="board">
            {lists.map(list => (
              <div key={list.id} className="list-container">
                <div className="list-header">
                  <input 
                    className="list-title"
                    value={list.title}
                    readOnly
                  />
                </div>
                <div className="cards-container">
                  {list.cards.map(card => (
                    <div key={card.id} className="card" onClick={() => setSelectedCard(card)}>
                      {card.cover && (
                        <>
                          {card.cover.type === 'image' && (
                            <img 
                              src={card.cover.value} 
                              alt="" 
                              className="card-cover-image"
                            />
                          )}
                          {card.cover.type === 'color' && (
                            <div 
                              className="card-cover-color"
                              style={{ backgroundColor: card.cover.value }}
                            />
                          )}
                        </>
                      )}
                      <div className={card.cover ? 'card-content-wrapper' : ''}>
                        {card.labels && card.labels.length > 0 && (
                          <div className="card-labels">
                            {card.labels.map(labelId => {
                              const label = sampleLabels.find(l => l.id === labelId);
                              return label ? (
                                <div 
                                  key={labelId}
                                  className="card-label"
                                  style={{ backgroundColor: label.color }}
                                />
                              ) : null;
                            })}
                          </div>
                        )}
                        <p className="card-text">{card.text}</p>
                        <div className="card-footer">
                          <div className="card-badges">
                            {card.dueDate && (
                              <span className={`card-badge due-date-badge ${card.dueDate.completed ? 'complete' : ''}`}>
                                <span className="icon">schedule</span>
                                {new Date(card.dueDate.timestamp).toLocaleDateString()}
                              </span>
                            )}
                            {card.checklists && card.checklists.length > 0 && (
                              <span className="card-badge checklist-badge">
                                <span className="icon">checklist</span>
                                {card.checklists.reduce((total, cl) => total + cl.items.filter(i => i.completed).length, 0)}/
                                {card.checklists.reduce((total, cl) => total + cl.items.length, 0)}
                              </span>
                            )}
                          </div>
                          {card.members && card.members.length > 0 && (
                            <div className="card-members">
                              {card.members.map(memberId => {
                                const member = sampleMembers.find(m => m.id === memberId);
                                return member ? (
                                  <img 
                                    key={memberId}
                                    src={member.avatar}
                                    alt={member.name}
                                    className="member-avatar"
                                    title={member.name}
                                  />
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {currentView !== 'board' && (
          <div className="view-container">
            <p>View: {currentView}</p>
            <p>This view is not yet implemented in this minimal version.</p>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowSettings(false)}>
              <span className="icon">close</span>
            </button>
            <div className="modal-header">
              <h2 className="modal-title no-edit">Settings</h2>
            </div>
            <div className="settings-body">
              <div className="settings-sidebar">
                <button className="active">
                  <span className="icon">palette</span>
                  Appearance
                </button>
              </div>
              <div className="settings-content">
                <h4>Appearance</h4>
                <div className="appearance-settings">
                  <div className="appearance-controls">
                    <div className="setting-item">
                      <h5>Theme Mode</h5>
                      <div className="segmented-control">
                        <label>
                          <input 
                            type="radio" 
                            name="mode" 
                            value="system"
                            checked={theme.mode === 'system'}
                            onChange={(e) => setTheme(prev => ({ ...prev, mode: e.target.value as Theme['mode'] }))}
                          />
                          <span>System</span>
                        </label>
                        <label>
                          <input 
                            type="radio" 
                            name="mode" 
                            value="light"
                            checked={theme.mode === 'light'}
                            onChange={(e) => setTheme(prev => ({ ...prev, mode: e.target.value as Theme['mode'] }))}
                          />
                          <span>Light</span>
                        </label>
                        <label>
                          <input 
                            type="radio" 
                            name="mode" 
                            value="dark"
                            checked={theme.mode === 'dark'}
                            onChange={(e) => setTheme(prev => ({ ...prev, mode: e.target.value as Theme['mode'] }))}
                          />
                          <span>Dark</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="setting-item">
                      <h5>Accent Color</h5>
                      <div className="accent-picker">
                        <input
                          type="color"
                          value={theme.accent}
                          onChange={(e) => setTheme(prev => ({ ...prev, accent: e.target.value }))}
                          className="accent-swatch custom"
                        />
                        <div className="custom-color-details">
                          <span>Custom Color</span>
                          <span>{theme.accent}</span>
                        </div>
                      </div>
                    </div>

                    <div className="setting-item">
                      <h5>Board Background</h5>
                      <div className="background-picker">
                        {(['none', 'dots', 'grid', 'noise', 'nebula'] as const).map(bg => (
                          <div
                            key={bg}
                            className={`background-tile ${bg === 'none' ? '' : `bg-tile-${bg}`} ${theme.boardBackground === bg ? 'active' : ''}`}
                            onClick={() => setTheme(prev => ({ ...prev, boardBackground: bg }))}
                          >
                            <span>{bg === 'none' ? 'None' : bg.charAt(0).toUpperCase() + bg.slice(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Card Modal */}
      {selectedCard && (
        <div className="modal-overlay" onClick={() => setSelectedCard(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedCard(null)}>
              <span className="icon">close</span>
            </button>
            <div className="modal-header">
              <h2 className="modal-title">{selectedCard.text}</h2>
              <p className="modal-subtitle">
                in list <strong>Website Redesign</strong>
                <span className="card-short-id">#{selectedCard.id.split('-')[1]}</span>
              </p>
            </div>
            <div className="modal-body">
              <div className="modal-main-col">
                {selectedCard.description && (
                  <div className="modal-section">
                    <h3>Description</h3>
                    <p>{selectedCard.description}</p>
                  </div>
                )}
              </div>
              <div className="modal-sidebar">
                <h3>Actions</h3>
                <button className="sidebar-btn">
                  <span className="icon">person_add</span>
                  Members
                </button>
                <button className="sidebar-btn">
                  <span className="icon">label</span>
                  Labels
                </button>
                <button className="sidebar-btn">
                  <span className="icon">schedule</span>
                  Dates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Initialize the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}