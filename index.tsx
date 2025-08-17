import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  argbFromHex,
  themeFromSourceColor,
  applyTheme,
  sourceColorFromImage,
  Theme as M3Theme,
  hexFromArgb
} from "@material/material-color-utilities";

// --- THEME ---
interface Theme {
    mode: 'system' | 'light' | 'dark';
    sourceColor: string;
    radius: number;
    density: 'compact' | 'comfortable' | 'cozy';
    fontScale: number;
    reducedMotion: boolean;
    boardBackground: 'none' | 'dots' | 'grid' | 'noise' | 'nebula';
    boardWidth: 'normal' | 'wide';
}

const DEFAULT_THEME: Theme = {
    mode: 'system',
    sourceColor: '#0079BF', // Calm Blue
    radius: 10,
    density: 'comfortable',
    fontScale: 1.00,
    reducedMotion: false,
    boardBackground: 'none',
    boardWidth: 'wide',
};

const useTheme = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        try {
            const savedTheme = localStorage.getItem('mosaic.theme');
            if (savedTheme) {
                const parsed = JSON.parse(savedTheme);
                // Ensure all keys from default theme are present
                return { ...DEFAULT_THEME, ...parsed };
            }
        } catch (e) {
            console.error("Failed to parse theme from localStorage", e);
        }
        return DEFAULT_THEME;
    });

    const [customCss, setCustomCss] = useState<{ [key: string]: string }>(() => {
        try {
            const saved = localStorage.getItem('mosaic.customCss');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to parse custom CSS from localStorage", e);
            return {};
        }
    });

    const m3Theme = useMemo(() => {
        return themeFromSourceColor(argbFromHex(theme.sourceColor));
    }, [theme.sourceColor]);
    
    const updateTheme = useCallback((updates: Partial<Theme>) => {
        setTheme(prev => ({ ...prev, ...updates }));
    }, []);

    const updateCustomCss = useCallback((newCss: { [key: string]: string }) => {
        setCustomCss(newCss);
    }, []);

    const resetTheme = useCallback(() => {
        setTheme(DEFAULT_THEME);
        setCustomCss({});
    }, []);

    const exportTheme = useCallback(() => {
        const jsonString = JSON.stringify(theme, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mosaic-board-theme.mbtheme';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [theme]);

    const importTheme = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result as string);
                const validKeys = Object.keys(DEFAULT_THEME);
                const validatedTheme: Partial<Theme> = {};

                for (const key of validKeys) {
                    if (key in imported) {
                        validatedTheme[key] = imported[key];
                    }
                }
                // Basic validation
                if (validatedTheme.radius) validatedTheme.radius = Math.max(0, Math.min(16, Number(validatedTheme.radius)));
                if (validatedTheme.fontScale) validatedTheme.fontScale = Math.max(0.9, Math.min(1.1, Number(validatedTheme.fontScale)));

                updateTheme(validatedTheme);
            } catch (e) {
                alert('Invalid theme file.');
                console.error("Failed to import theme", e);
            }
        };
        reader.readAsText(file);
    }, [updateTheme]);

    useEffect(() => {
        localStorage.setItem('mosaic.theme', JSON.stringify(theme));

        const docEl = document.documentElement;
        const effectiveMode = theme.mode === 'system'
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : theme.mode;
        
        applyTheme(m3Theme, { target: docEl, dark: effectiveMode === 'dark' });

        docEl.setAttribute('data-theme', effectiveMode);
        docEl.setAttribute('data-density', theme.density);
        docEl.setAttribute('data-board-bg', theme.boardBackground);
        docEl.setAttribute('data-reduced-motion', String(theme.reducedMotion));
        docEl.setAttribute('data-board-width', theme.boardWidth);
        
        docEl.style.setProperty('--radius', `${theme.radius}px`);
        docEl.style.fontSize = `${16.5 * theme.fontScale}px`;
        
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (theme.reducedMotion && !reducedMotionQuery.matches) {
            docEl.setAttribute('data-reduced-motion', 'true');
        } else if (reducedMotionQuery.matches) {
            docEl.setAttribute('data-reduced-motion', 'true');
        } else {
             docEl.setAttribute('data-reduced-motion', 'false');
        }

    }, [theme, m3Theme]);

    useEffect(() => {
        localStorage.setItem('mosaic.customCss', JSON.stringify(customCss));
        const styleId = 'mosaic-custom-styles';
        let styleEl = document.getElementById(styleId);
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        const cssString = Object.entries(customCss)
            .map(([selector, rules]) => {
                if (rules && rules.trim()) return `${selector} { ${rules} }`;
                return '';
            })
            .join('\n');
        styleEl.innerHTML = cssString;
    }, [customCss]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (theme.mode === 'system') {
                applyTheme(m3Theme, { target: document.documentElement, dark: e.matches });
                document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme.mode, m3Theme]);

    return { theme, updateTheme, resetTheme, exportTheme, importTheme, customCss, updateCustomCss };
};


// --- Data Types ---
interface LabelData {
  id: string;
  text: string;
  color: string;
}

interface MemberData {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ChecklistItemData {
  id: string;
  text: string;
  completed: boolean;
  attachments?: AttachmentData[];
}

interface ChecklistData {
  id: string;
  title: string;
  items: ChecklistItemData[];
}

interface AttachmentData {
  id: string;
  url?: string; // Will be data URL for file uploads, optional for storage
  name: string;
  timestamp: number;
  type: 'link' | 'file';
  previewUrl?: string; // For image previews, optional for storage
}

interface CoverData {
    color?: string;
    imageUrl?: string;
    size?: 'normal' | 'full';
}

interface CommentData {
  id: string;
  authorId: string;
  text: string;
  timestamp: number;
  attachments?: AttachmentData[];
}

interface ActivityData {
  id: string;
  text: string;
  timestamp: number;
}

interface CustomFieldDefinition {
    id: string;
    name: string;
    type: 'text' | 'number' | 'dropdown' | 'date' | 'checkbox';
    options?: string[]; // for dropdown
}

interface CardData {
  id: string;
  cardShortId: number;
  text: string; // This is the title
  description: string;
  comments: CommentData[];
  activity: ActivityData[];
  labels: string[]; // array of label IDs
  members: string[]; // array of member IDs
  dueDate: { timestamp: number | null; completed: boolean };
  startDate: number | null;
  location: string;
  checklists: ChecklistData[];
  attachments: AttachmentData[];
  cover: CoverData;
  subscribers: string[]; // array of member IDs watching the card
  customFields: { [key: string]: string | number | boolean | null };
  linkedCards: string[];
}

interface ListData {
  id: string;
  title: string;
  cards: CardData[];
}

interface Filters {
    query: string;
    members: string[];
    labels: string[];
    dueDate: string;
}

interface NotificationData {
    id: string;
    text: string;
    cardId: string;
    listId: string;
    timestamp: number;
    read: boolean;
}

// --- Automation Data Types ---
type AutomationTrigger =
  | { type: 'card-move'; toListId: string }
  | { type: 'label-add'; labelId: string };

type AutomationAction =
  | { type: 'move-to-list'; listId: string }
  | { type: 'set-due-date-complete'; completed: boolean }
  | { type: 'add-checklist'; title: string }
  | { type: 'post-comment'; text: string }
  | { type: 'add-member'; memberId: string }
  | { type: 'add-label'; labelId: string };

interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
}

interface ScheduledCommand {
    id: string;
    name: string;
    schedule: 'daily' | 'weekly';
    action: AutomationAction;
    targetListId: string;
}

interface CustomButtonData {
    id: string;
    name: string;
    action: AutomationAction;
}

interface Automations {
    rules: AutomationRule[];
    scheduled: ScheduledCommand[];
    cardButtons: CustomButtonData[];
    boardButtons: CustomButtonData[];
}


// --- Mock Data & Constants ---
const AVAILABLE_LABELS_DATA: LabelData[] = [
    { id: 'label-1', text: 'Feature', color: '#61BD4F' },
    { id: 'label-2', text: 'Bug', color: '#EB5A46' },
    { id: 'label-3', text: 'Design', color: '#F2D600' },
    { id: 'label-4', text: 'Docs', color: '#0079BF' },
    { id: 'label-5', text: 'Research', color: '#FF9F1A' },
];

const AVAILABLE_MEMBERS_DATA: MemberData[] = [
    { id: 'member-1', name: 'Alice', avatarUrl: `https://i.pravatar.cc/150?u=member-1` },
    { id: 'member-2', name: 'Bob', avatarUrl: `https://i.pravatar.cc/150?u=member-2` },
    { id: 'member-3', name: 'Charlie', avatarUrl: `https://i.pravatar.cc/150?u=member-3` },
];


// --- Helper Functions ---
const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const createTimestamp = () => Date.now();

const createActivity = (text: string): ActivityData => ({
  id: generateId(),
  text,
  timestamp: createTimestamp(),
});

const getDueDateStatus = (dueDate: { timestamp: number | null; completed: boolean }) => {
    if (!dueDate || !dueDate.timestamp) return 'none';
    if (dueDate.completed) return 'complete';
    const now = Date.now();
    const dueTime = dueDate.timestamp;
    const oneDay = 24 * 60 * 60 * 1000;
    if (dueTime < now) return 'overdue';
    if (dueTime < now + oneDay) return 'due-soon';
    return 'none';
};

const fileToAttachment = (file: File): Promise<AttachmentData> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const newAttachment: AttachmentData = {
                id: generateId(),
                url: event.target?.result as string,
                name: file.name,
                timestamp: createTimestamp(),
                type: 'file',
                previewUrl: file.type.startsWith('image/') ? (event.target?.result as string) : undefined
            };
            resolve(newAttachment);
        };
        reader.readAsDataURL(file);
    });
};

/**
 * Sanitizes board data to remove large base64 strings before saving to localStorage.
 */
const getSanitizedBoardDataForStorage = (data: ListData[]): ListData[] => {
    const sanitizeAttachments = (attachments: AttachmentData[] = []): AttachmentData[] => {
        return attachments.map(att => {
            if (att.type === 'file') {
                // Return a new object without the large data fields
                return {
                    id: att.id,
                    name: att.name,
                    timestamp: att.timestamp,
                    type: att.type,
                };
            }
            return att;
        });
    };

    return data.map(list => ({
        ...list,
        cards: list.cards.map(card => {
            const sanitizedCard = {
                ...card,
                attachments: sanitizeAttachments(card.attachments),
                comments: (card.comments || []).map(comment => ({
                    ...comment,
                    attachments: sanitizeAttachments(comment.attachments),
                })),
                checklists: (card.checklists || []).map(checklist => ({
                    ...checklist,
                    items: (checklist.items || []).map(item => ({
                        ...item,
                        attachments: sanitizeAttachments(item.attachments),
                    })),
                })),
            };

            // Also sanitize the cover image if it's a data URL from a file upload
            if (sanitizedCard.cover?.imageUrl?.startsWith('data:image')) {
                sanitizedCard.cover = { ...sanitizedCard.cover, imageUrl: undefined };
            }

            return sanitizedCard;
        }),
    }));
};


// --- Prop Types ---
interface CardProps {
  card: CardData;
  isHidden: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick: () => void;
}

interface ListProps {
  list: ListData;
  listIndex: number;
  visibilityMap: { [cardId: string]: boolean };
  onUpdateListTitle: (listIndex: number, newTitle: string) => void;
  onDeleteList: (listIndex: number) => void;
  onAddCard: (listIndex: number, text: string) => void;
  onCardClick: (listIndex: number, cardIndex: number) => void;
  moveCard: (sourceListIndex: number, sourceCardIndex: number, destListIndex: number, destCardIndex: number) => void;
}


// --- Components ---

/**
 * Icon Component
 */
interface IconProps {
  name: string;
  style?: 'outlined' | 'rounded' | 'sharp';
  size?: number;
  color?: string;
  title?: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, style = 'outlined', size = 24, color, title, className = '' }) => {
  const familyClass = style === 'rounded' ? 'rounded' : style === 'sharp' ? 'sharp' : '';
  const inlineStyles: React.CSSProperties = {
    fontSize: `${size}px`,
    fontVariationSettings: `'opsz' ${size}`,
  };
  if (color) {
    inlineStyles.color = color;
  }

  return (
    <span
      className={`icon ${familyClass} ${className}`}
      style={inlineStyles}
      role={title ? "img" : undefined}
      aria-label={title ? title : undefined}
      aria-hidden={!title}
    >
      {name}
    </span>
  );
};

/**
 * Popover Component
 */
const Popover = ({ trigger, children, onClose }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div className="popover-container">
            {trigger}
            <div className="popover" ref={popoverRef}>
                {children}
            </div>
        </div>
    );
};

const FilterPopover = ({ filters, onFiltersChange, onClose, availableLabels, availableMembers }) => {
    const queryInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        queryInputRef.current?.focus();
    }, []);

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFiltersChange({ ...filters, query: e.target.value });
    };

    const handleMemberToggle = (memberId: string) => {
        const newMembers = filters.members.includes(memberId)
            ? filters.members.filter(id => id !== memberId)
            : [...filters.members, memberId];
        onFiltersChange({ ...filters, members: newMembers });
    };
    
    const handleLabelToggle = (labelId: string) => {
        const newLabels = filters.labels.includes(labelId)
            ? filters.labels.filter(id => id !== labelId)
            : [...filters.labels, labelId];
        onFiltersChange({ ...filters, labels: newLabels });
    };

    const handleDueDateChange = (status: string) => {
        onFiltersChange({ ...filters, dueDate: status });
    };
    
    const clearFilters = () => {
        onFiltersChange({ query: '', members: [], labels: [], dueDate: 'any' });
    };

    return (
        <Popover onClose={onClose} trigger={null}>
            <div className="filter-popover">
                <h4>Filter Cards</h4>
                <div className="filter-section">
                    <h5>Keyword</h5>
                    <input ref={queryInputRef} type="text" className="popover-input" value={filters.query} onChange={handleQueryChange} placeholder="Search titles & descriptions..." />
                </div>
                <div className="filter-section">
                    <h5>Members</h5>
                    <div className="filter-options">
                        <label className="filter-option">
                            <input type="checkbox" checked={filters.members.includes('no-members')} onChange={() => handleMemberToggle('no-members')} />
                            <span>No members</span>
                        </label>
                        {availableMembers.map(member => (
                            <label key={member.id} className="filter-option">
                                <input type="checkbox" checked={filters.members.includes(member.id)} onChange={() => handleMemberToggle(member.id)} />
                                <img src={member.avatarUrl} alt={member.name} className="member-avatar" />
                                <span>{member.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="filter-section">
                    <h5>Labels</h5>
                     <div className="filter-options">
                        <label className="filter-option">
                            <input type="checkbox" checked={filters.labels.includes('no-labels')} onChange={() => handleLabelToggle('no-labels')} />
                            <span>No labels</span>
                        </label>
                        {availableLabels.map(label => (
                             <label key={label.id} className="filter-option">
                                <input type="checkbox" checked={filters.labels.includes(label.id)} onChange={() => handleLabelToggle(label.id)} />
                                <span className="card-label" style={{ backgroundColor: label.color }} />
                                <span>{label.text}</span>
                            </label>
                        ))}
                    </div>
                </div>
                 <div className="filter-section">
                    <h5>Due Date</h5>
                     <div className="filter-options column">
                        {['any', 'none', 'overdue', 'due-soon', 'complete'].map(status => (
                            <label key={status} className="filter-option">
                                <input type="radio" name="due-date" value={status} checked={filters.dueDate === status} onChange={() => handleDueDateChange(status)} />
                                <span>{status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <button className="sidebar-btn delete" onClick={clearFilters}><Icon name="close" size={18}/>Clear All Filters</button>
            </div>
        </Popover>
    );
};


/**
 * Card Component
 */
const Card = ({ card, isHidden, onDragStart, onDragEnd, onClick, availableLabels, availableMembers }: CardProps & { availableLabels: LabelData[], availableMembers: MemberData[] }) => {
  const { cover, text, labels, dueDate, checklists, attachments, members, comments } = card;
  const checklistStats = checklists.reduce((acc, c) => {
      acc.total += c.items.length;
      acc.completed += c.items.filter(i => i.completed).length;
      return acc;
  }, { total: 0, completed: 0 });
  const dueDateStatus = getDueDateStatus(dueDate);
  
  const hasImageCover = !!cover.imageUrl;

  return (
    <div
      className={`card ${isHidden ? 'is-hidden' : ''} ${hasImageCover ? 'has-image-cover' : ''}`}
      draggable="true"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
    >
      {hasImageCover && <img src={cover.imageUrl} className="card-cover-image" alt="" />}
      {!hasImageCover && cover.color && <div className="card-cover-color" style={{ backgroundColor: cover.color }} />}
      
      <div className="card-content-wrapper">
        <div className="card-content-main">
            {labels.length > 0 && (
              <div className="card-labels">
                {labels.map(labelId => {
                    const label = availableLabels.find(l => l.id === labelId);
                    return label ? <span key={label.id} className="card-label" style={{ backgroundColor: label.color }} title={label.text} /> : null;
                })}
              </div>
            )}
            <p className="card-text">{text}</p>
        </div>
        <div className="card-footer">
          <div className="card-badges">
            {dueDate.timestamp && (
              <span className={`card-badge due-date-badge ${dueDateStatus}`}>
                <Icon name="schedule" size={16} />
                {new Date(dueDate.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {checklistStats.total > 0 && (
              <span className={`card-badge checklist-badge ${checklistStats.completed === checklistStats.total ? 'complete' : ''}`}>
                <Icon name="check_box" size={16} /> {checklistStats.completed}/{checklistStats.total}
              </span>
            )}
            {attachments.length > 0 && <span className="card-badge"><Icon name="attachment" size={16} /> {attachments.length}</span>}
            {comments.length > 0 && <span className="card-badge"><Icon name="chat_bubble" size={16} /> {comments.length}</span>}
          </div>
          <div className="card-members">
            {members.map(memberId => {
              const member = availableMembers.find(m => m.id === memberId);
              return member ? <img key={member.id} src={member.avatarUrl} alt={member.name} title={member.name} className="member-avatar" /> : null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};


/**
 * AddItemForm Component
 */
const AddItemForm = ({ placeholder, buttonText, onSubmit, onCancel }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-form">
      <input
        ref={inputRef}
        type="text"
        className="add-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
      />
      <div className="form-controls">
        <button type="submit" className="action-button">{buttonText}</button>
        <button type="button" className="cancel-button" onMouseDown={onCancel} aria-label="Cancel">
          <Icon name="close" size={20} />
        </button>
      </div>
    </form>
  );
};

const Checklist = ({ checklist, onUpdate }) => {
    const [newItemText, setNewItemText] = useState('');
    const [attachingToItemId, setAttachingToItemId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const progress = checklist.items.length > 0 ? (checklist.items.filter(i => i.completed).length / checklist.items.length) * 100 : 0;

    const handleAddItem = () => {
        if (newItemText.trim()) {
            const newItem: ChecklistItemData = { id: generateId(), text: newItemText, completed: false, attachments: [] };
            onUpdate({ ...checklist, items: [...checklist.items, newItem] });
            setNewItemText('');
        }
    };
    
    const handleToggleItem = (itemId: string) => {
        const newItems = checklist.items.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        onUpdate({ ...checklist, items: newItems });
    };

    const handleAttachClick = (itemId: string) => {
        setAttachingToItemId(itemId);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && attachingToItemId) {
            const newAttachment = await fileToAttachment(file);
            const newItems = checklist.items.map(item => {
                if (item.id === attachingToItemId) {
                    return { ...item, attachments: [...(item.attachments || []), newAttachment] };
                }
                return item;
            });
            onUpdate({ ...checklist, items: newItems });
        }
        setAttachingToItemId(null);
        e.target.value = ''; // Reset file input
    };

    return (
        <div className="checklist">
            <h4>{checklist.title}</h4>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="checklist-items">
                {checklist.items.map(item => (
                    <div key={item.id} className="checklist-item-wrapper">
                        <div className="checklist-item">
                            <input type="checkbox" checked={item.completed} onChange={() => handleToggleItem(item.id)} />
                            <span className={item.completed ? 'completed' : ''}>{item.text}</span>
                            <button className="attach-to-item-btn" onClick={() => handleAttachClick(item.id)} aria-label="Attach file"><Icon name="attachment" size={16} /></button>
                        </div>
                        {item.attachments && item.attachments.length > 0 && (
                            <div className="item-attachment-list">
                                {item.attachments.map(att => {
                                    if (att.type === 'file' && !att.url) {
                                        return (
                                            <div key={att.id} className="item-attachment is-unloaded" title="Local file attachments are not saved between sessions.">
                                                <Icon name="draft" size={16} />
                                                <span>{att.name}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                         <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="item-attachment">
                                            {att.previewUrl ? <img src={att.previewUrl} alt={att.name} /> : <Icon name="draft" size={16} />}
                                            <span>{att.name}</span>
                                         </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="add-checklist-item-form">
                <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Add an item"
                />
                <button onClick={handleAddItem} disabled={!newItemText.trim()}>Add</button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} />
            </div>
        </div>
    );
};


const CommentForm = ({ onSubmit, availableMembers }) => {
    const [text, setText] = useState('');
    const [stagedAttachments, setStagedAttachments] = useState<AttachmentData[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '🙏', '🎉', '🚀'];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (text.trim() || stagedAttachments.length > 0) {
            onSubmit(text, stagedAttachments);
            setText('');
            setStagedAttachments([]);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newAttachments = await Promise.all(
                Array.from(e.target.files).map(fileToAttachment)
            );
            setStagedAttachments(prev => [...prev, ...newAttachments]);
        }
    };
    
    const removeStagedAttachment = (id: string) => {
        setStagedAttachments(prev => prev.filter(att => att.id !== id));
    };

    const handleEmojiClick = (emoji) => {
        setText(prev => prev + emoji);
        setShowEmojiPicker(false);
        textareaRef.current?.focus();
    };
    
    return (
        <form onSubmit={handleSubmit} className="comment-form">
            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a comment... use @ to mention"
            />
            {stagedAttachments.length > 0 && (
                <div className="staged-attachments">
                    {stagedAttachments.map(att => (
                        <div key={att.id} className="staged-attachment">
                           <span>{att.name}</span>
                           <button type="button" onClick={() => removeStagedAttachment(att.id)}><Icon name="close" size={16}/></button>
                        </div>
                    ))}
                </div>
            )}
            <div className="comment-controls">
                <button type="submit" disabled={!text.trim() && stagedAttachments.length === 0}>Save</button>
                <div className="popover-wrapper">
                  <button type="button" onClick={() => setShowEmojiPicker(p => !p)}><Icon name="mood" /></button>
                  {showEmojiPicker && (
                    <Popover onClose={() => setShowEmojiPicker(false)} trigger={null}>
                      <div className="emoji-picker">
                        {EMOJIS.map(emoji => <span key={emoji} onClick={() => handleEmojiClick(emoji)}>{emoji}</span>)}
                      </div>
                    </Popover>
                  )}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach file"><Icon name="attachment" /></button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple style={{display: 'none'}}/>
            </div>
        </form>
    );
};


/**
 * CardModal Component
 */
const CardModal = ({ card, listTitle, onClose, onUpdateCard, onAddComment, onDeleteCard, availableLabels, availableMembers, currentUserId, customButtons, executeCustomButton, customFieldDefinitions, boardData }) => {
    const [editText, setEditText] = useState(card.text);
    const [editDescription, setEditDescription] = useState(card.description);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [activePopover, setActivePopover] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const [isLinkPopoverOpen, setLinkPopoverOpen] = useState(false);
    const [linkSearchQuery, setLinkSearchQuery] = useState('');

    const updateCard = (updates: Partial<CardData>) => {
        onUpdateCard(updates);
    };

    const handleToggleLabel = (labelId: string) => {
        const newLabels = card.labels.includes(labelId)
            ? card.labels.filter(id => id !== labelId)
            : [...card.labels, labelId];
        updateCard({ labels: newLabels });
    };

    const handleToggleMember = (memberId: string) => {
        const previousMembers = card.members;
        const newMembers = previousMembers.includes(memberId)
            ? previousMembers.filter(id => id !== memberId)
            : [...previousMembers, memberId];
        updateCard({ members: newMembers });
    };

    const handleSetDueDate = (dateStr: string) => {
        const timestamp = dateStr ? new Date(dateStr).getTime() : null;
        updateCard({ dueDate: { ...card.dueDate, timestamp } });
    };
    
    const handleToggleDueComplete = () => {
        updateCard({ dueDate: { ...card.dueDate, completed: !card.dueDate.completed } });
    };
    
    const handleSetStartDate = (dateStr: string) => {
        const timestamp = dateStr ? new Date(dateStr).getTime() : null;
        updateCard({ startDate: timestamp });
    };

    const handleSetLocation = (location: string) => {
        updateCard({ location });
        setActivePopover(null);
    };
    
    const handleDescriptionSave = () => {
        if (card.description !== editDescription) {
            onUpdateCard({ description: editDescription });
        }
        setIsEditingDescription(false);
    }

    const handleAddChecklist = (title: string) => {
        const newChecklist: ChecklistData = { id: generateId(), title, items: [] };
        updateCard({ checklists: [...card.checklists, newChecklist] });
        setActivePopover(null);
    };

    const handleUpdateChecklist = (checklistIndex: number, updatedChecklist: ChecklistData) => {
        const newChecklists = [...card.checklists];
        newChecklists[checklistIndex] = updatedChecklist;
        updateCard({ checklists: newChecklists });
    };
    
    const handleAddAttachmentLink = (url: string) => {
        if (url.trim()) {
            try {
                const hostname = new URL(url).hostname;
                const newAttachment: AttachmentData = {
                    id: generateId(), url, name: `Link: ${hostname}`, timestamp: createTimestamp(), type: 'link'
                };
                updateCard({ attachments: [...card.attachments, newAttachment] });
                setActivePopover(null);
            } catch (e) { alert("Invalid URL provided."); }
        }
    };
    
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const newAttachment = await fileToAttachment(file);
      updateCard({ attachments: [...card.attachments, newAttachment] });
      setActivePopover(null);
    };

    const handleSetCover = (cover: CoverData) => {
        updateCard({ cover });
    }

    const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageUrl = event.target?.result as string;
            if (imageUrl) {
                handleSetCover({ ...card.cover, imageUrl, color: undefined });
            }
        };
        reader.readAsDataURL(file);
    };
    
    const handleToggleSubscription = () => {
      const isSubscribed = card.subscribers.includes(currentUserId);
      const newSubscribers = isSubscribed 
        ? card.subscribers.filter(id => id !== currentUserId)
        : [...card.subscribers, currentUserId];
      updateCard({ subscribers: newSubscribers });
    }
    
    const isSubscribed = card.subscribers.includes(currentUserId);
    
    const sortedActivity = [
        ...card.activity.map(a => ({ ...a, type: 'activity' })),
        ...card.comments.map(c => ({ ...c, type: 'comment' })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    const handleCustomFieldChange = (fieldId: string, value: any) => {
        const newCustomFields = {
            ...card.customFields,
            [fieldId]: value,
        };
        onUpdateCard({ customFields: newCustomFields });
    };

    const allCards = useMemo(() => boardData.flatMap(list => list.cards), [boardData]);
    
    const linkedCardData = useMemo(() => {
        return card.linkedCards.map(cardId => allCards.find(c => c.id === cardId)).filter(Boolean);
    }, [card.linkedCards, allCards]);

    const filteredCardsForLinking = useMemo(() => {
        if (!linkSearchQuery) return [];
        const query = linkSearchQuery.toLowerCase();
        return allCards.filter(c =>
            c.id !== card.id &&
            !card.linkedCards.includes(c.id) &&
            (c.text.toLowerCase().includes(query) || String(c.cardShortId).includes(query))
        );
    }, [linkSearchQuery, allCards, card.id, card.linkedCards]);

    const handleAddLink = (linkedCardId: string) => {
        const newLinkedCards = [...card.linkedCards, linkedCardId];
        onUpdateCard({ linkedCards: newLinkedCards });
        setLinkPopoverOpen(false);
        setLinkSearchQuery('');
    };

    const handleRemoveLink = (linkedCardId: string) => {
        const newLinkedCards = card.linkedCards.filter(id => id !== linkedCardId);
        onUpdateCard({ linkedCards: newLinkedCards });
    };
    
    const renderCommentText = (text: string) => {
      const parts = text.split(/(@\w+)/g);
      return parts.map((part, index) => {
          if (part.startsWith('@')) {
              const memberName = part.substring(1);
              if (availableMembers.some(m => m.name === memberName)) {
                  return <strong key={index} className="comment-mention">{part}</strong>;
              }
          }
          return part;
      });
    };
    
    const AttachmentGroup = ({ attachments }) => (
      <div className="attachment-list comment-attachments">
        {(attachments || []).map(att => {
            if (att.type === 'file' && !att.url) {
                return (
                    <div key={att.id} className="attachment-item is-unloaded" title="Local file attachments are not saved between sessions to conserve storage.">
                        <Icon name="draft" />
                        <span>{att.name}</span>
                    </div>
                );
            }
            return (
                <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="attachment-item">
                  {att.previewUrl && <img src={att.previewUrl} className="attachment-preview" alt="Attachment preview"/>}
                  {!att.previewUrl && <Icon name={att.type === 'link' ? 'link' : 'draft'} />}
                  <span>{att.name}</span>
                </a>
            );
        })}
      </div>
    );
    
    const renderCustomFieldInput = (field: CustomFieldDefinition) => {
        const value = card.customFields[field.id];
        switch (field.type) {
            case 'text':
                return <input type="text" value={value || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} />;
            case 'number':
                return <input type="number" value={value || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)} />;
            case 'date':
                const dateValue = value ? new Date(value as number).toISOString().split('T')[0] : '';
                return <input type="date" value={dateValue} onChange={e => handleCustomFieldChange(field.id, new Date(e.target.value).getTime())} />;
            case 'checkbox':
                return <input type="checkbox" checked={!!value} onChange={e => handleCustomFieldChange(field.id, e.target.checked)} />;
            case 'dropdown':
                return (
                    <select value={value || ''} onChange={e => handleCustomFieldChange(field.id, e.target.value)}>
                        <option value="">-- Select --</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            default: return null;
        }
    };

    return (
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><Icon name="close"/></button>
                <div className="modal-header">
                    <input 
                        className="modal-title" 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => card.text !== editText && onUpdateCard({ text: editText })}
                    />
                    <p className="modal-subtitle">in list <strong>{listTitle}</strong> <span className="card-short-id">#{card.cardShortId}</span></p>
                </div>
                <div className="modal-body">
                    <div className="modal-main-col">
                        <div className="modal-details">
                            {card.members.length > 0 && <div className="modal-detail-item">
                                <h4>Members</h4>
                                <div className="member-list">
                                    {card.members.map(id => availableMembers.find(m => m.id === id)).filter(Boolean).map(m => (
                                        <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="member-avatar" />
                                    ))}
                                </div>
                            </div>}
                            {card.labels.length > 0 && <div className="modal-detail-item">
                                <h4>Labels</h4>
                                <div className="label-list">
                                    {card.labels.map(id => availableLabels.find(l => l.id === id)).filter(Boolean).map(l => (
                                        <span key={l.id} className="modal-label" style={{ backgroundColor: l.color }}>{l.text}</span>
                                    ))}
                                </div>
                            </div>}
                             {(card.startDate || card.dueDate.timestamp) && <div className="modal-detail-item">
                                <h4>Dates</h4>
                                <div className="date-display">
                                    {card.startDate && <div><span>Start</span><p>{new Date(card.startDate).toLocaleString()}</p></div>}
                                    {card.dueDate.timestamp && <div>
                                        <span>Due</span>
                                        <p>
                                            <input type="checkbox" checked={card.dueDate.completed} onChange={handleToggleDueComplete}/>
                                            {new Date(card.dueDate.timestamp).toLocaleString()}
                                        </p>
                                    </div>}
                                </div>
                             </div>}
                             {card.location && <div className="modal-detail-item">
                                <h4>Location</h4>
                                <p>{card.location}</p>
                            </div>}
                        </div>
                         {customFieldDefinitions.length > 0 && <div className="modal-section">
                            <h3>Custom Fields</h3>
                            <div className="custom-fields-list">
                                {customFieldDefinitions.map(field => (
                                    <div key={field.id} className={`custom-field-item type-${field.type}`}>
                                        <label>{field.name}</label>
                                        {renderCustomFieldInput(field)}
                                    </div>
                                ))}
                            </div>
                         </div>}
                        <div className="modal-section">
                            <h3>Description</h3>
                            <textarea
                                value={editDescription}
                                onFocus={() => setIsEditingDescription(true)}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Add a more detailed description..."
                            />
                            {isEditingDescription && (
                                <div className="description-controls">
                                    <button className="action-button" onClick={handleDescriptionSave}>Save</button>
                                    <button className="sidebar-btn" onClick={() => fileInputRef.current?.click()}>Attach File</button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display: 'none'}}/>
                                </div>
                            )}
                        </div>
                        {card.attachments.length > 0 && <div className="modal-section">
                          <h3>Attachments</h3>
                          <AttachmentGroup attachments={card.attachments} />
                        </div>}
                        {card.linkedCards.length > 0 && <div className="modal-section">
                            <h3>Linked Cards</h3>
                            <div className="linked-cards-list">
                                {linkedCardData.map(linkedCard => (
                                    <div key={linkedCard.id} className="linked-card-item">
                                        <span>#{linkedCard.cardShortId} {linkedCard.text}</span>
                                        <button onClick={() => handleRemoveLink(linkedCard.id)}><Icon name="close" size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>}
                        {card.checklists.map((checklist, index) => (
                           <div key={checklist.id} className="modal-section">
                             <Checklist checklist={checklist} onUpdate={(updated) => handleUpdateChecklist(index, updated)} />
                           </div>
                        ))}
                         <div className="modal-section">
                            <h3>Activity</h3>
                            <CommentForm onSubmit={onAddComment} availableMembers={availableMembers} />
                            <div className="activity-list">
                                {sortedActivity.map(item => {
                                    const author = item.type === 'comment' ? availableMembers.find(m => m.id === item.authorId) : null;
                                    return (
                                        <div key={item.id} className="activity-item">
                                            {item.type === 'comment' ? (
                                                <>
                                                    <strong>{author?.name || 'User'}</strong>
                                                    {item.text && <div className="activity-text">{renderCommentText(item.text)}</div>}
                                                    {item.attachments && item.attachments.length > 0 && <AttachmentGroup attachments={item.attachments} />}
                                                </>
                                            ) : (
                                                <p>{item.text}</p>
                                            )}
                                            <div className="activity-meta">
                                                {new Date(item.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="modal-sidebar">
                        <h3>Add to card</h3>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'members' ? null : 'members')}><Icon name="group" size={20}/><span>Members</span></button>
                            {activePopover === 'members' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Members</h4>
                                    {availableMembers.map(member => (
                                        <div key={member.id} className="popover-item" onClick={() => handleToggleMember(member.id)}>
                                            <img src={member.avatarUrl} alt={member.name} className="member-avatar" />
                                            <span>{member.name}</span>
                                            {card.members.includes(member.id) && <Icon name="check" />}
                                        </div>
                                    ))}
                                </Popover>
                            )}
                        </div>
                         <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'labels' ? null : 'labels')}><Icon name="label" size={20}/><span>Labels</span></button>
                            {activePopover === 'labels' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Labels</h4>
                                    {availableLabels.map(label => (
                                        <div key={label.id} className="popover-item label-popover-item" onClick={() => handleToggleLabel(label.id)}>
                                            <span className="modal-label" style={{ backgroundColor: label.color }}>{label.text}</span>
                                            {card.labels.includes(label.id) && <Icon name="check" />}
                                        </div>
                                    ))}
                                </Popover>
                            )}
                        </div>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'checklist' ? null : 'checklist')}><Icon name="playlist_add_check" size={20}/><span>Checklist</span></button>
                            {activePopover === 'checklist' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Add Checklist</h4>
                                    <AddItemForm placeholder="Checklist title..." buttonText="Add" onSubmit={handleAddChecklist} onCancel={() => setActivePopover(null)} />
                                </Popover>
                            )}
                        </div>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'dates' ? null : 'dates')}><Icon name="calendar_month" size={20}/><span>Dates</span></button>
                            {activePopover === 'dates' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Change Dates</h4>
                                    <label>Start Date</label>
                                    <input 
                                        type="date"
                                        className="popover-input"
                                        onChange={(e) => handleSetStartDate(e.target.value)}
                                        value={card.startDate ? new Date(card.startDate).toISOString().split('T')[0] : ''}
                                    />
                                    <label>Due Date</label>
                                    <input 
                                        type="date"
                                        className="popover-input"
                                        onChange={(e) => handleSetDueDate(e.target.value)}
                                        value={card.dueDate.timestamp ? new Date(card.dueDate.timestamp).toISOString().split('T')[0] : ''}
                                    />
                                </Popover>
                            )}
                        </div>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'attachment' ? null : 'attachment')}><Icon name="attachment" size={20}/><span>Attachment</span></button>
                            {activePopover === 'attachment' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Attach</h4>
                                    <AddItemForm placeholder="Paste any link here..." buttonText="Attach Link" onSubmit={handleAddAttachmentLink} onCancel={() => setActivePopover(null)} />
                                    <hr/>
                                    <button className="action-button full-width" onClick={() => fileInputRef.current?.click()}>Upload a file</button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{display: 'none'}}/>
                                </Popover>
                            )}
                        </div>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setLinkPopoverOpen(p => !p)}><Icon name="link" size={20}/><span>Link Card</span></button>
                            {isLinkPopoverOpen && (
                                <Popover onClose={() => setLinkPopoverOpen(false)} trigger={null}>
                                    <h4>Link Card</h4>
                                    <input
                                        type="text"
                                        className="popover-input"
                                        placeholder="Search cards by title or #ID..."
                                        value={linkSearchQuery}
                                        onChange={(e) => setLinkSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                    <div className="link-search-results">
                                        {filteredCardsForLinking.map(c => (
                                            <div key={c.id} className="popover-item" onClick={() => handleAddLink(c.id)}>
                                                <span>#{c.cardShortId} - {c.text}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Popover>
                            )}
                        </div>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'location' ? null : 'location')}><Icon name="location_on" size={20}/><span>Location</span></button>
                            {activePopover === 'location' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Set Location</h4>
                                    <AddItemForm placeholder="e.g. 123 Main St" buttonText="Set" onSubmit={handleSetLocation} onCancel={() => setActivePopover(null)} />
                                </Popover>
                            )}
                        </div>
                        <div className="popover-wrapper">
                            <button className="sidebar-btn" onClick={() => setActivePopover(activePopover === 'cover' ? null : 'cover')}><Icon name="image" size={20}/><span>Cover</span></button>
                            {activePopover === 'cover' && (
                                <Popover onClose={() => setActivePopover(null)} trigger={null}>
                                    <h4>Cover</h4>
                                     {card.cover.imageUrl && (
                                        <>
                                            <p>Size</p>
                                            <div className="segmented-control cover-size-control">
                                                <label>
                                                    <input type="radio" name="cover-size" checked={!card.cover.size || card.cover.size === 'normal'} onChange={() => updateCard({ cover: { ...card.cover, size: 'normal' }})} />
                                                    <span>Normal</span>
                                                </label>
                                                <label>
                                                    <input type="radio" name="cover-size" checked={card.cover.size === 'full'} onChange={() => updateCard({ cover: { ...card.cover, size: 'full' }})} />
                                                    <span>Full</span>
                                                </label>
                                            </div>
                                            <hr/>
                                        </>
                                    )}
                                    <p>Colors</p>
                                    <div className="color-palette">
                                      {['#61BD4F', '#F2D600', '#FF9F1A', '#EB5A46', '#0079BF'].map(color => (
                                        <div key={color} className="color-swatch" style={{backgroundColor: color}} onClick={() => handleSetCover({ ...card.cover, color, imageUrl: undefined })} />
                                      ))}
                                      <div className="color-swatch" style={{background: 'transparent', border: '1px solid #ccc'}} onClick={() => handleSetCover({})} title="Remove cover" />
                                    </div>
                                    <hr/>
                                    <button className="action-button full-width" onClick={() => coverFileInputRef.current?.click()}>Upload a cover image</button>
                                    <input type="file" ref={coverFileInputRef} onChange={handleCoverImageUpload} style={{display: 'none'}} accept="image/*"/>
                                    <hr/>
                                    <AddItemForm placeholder="Paste image URL..." buttonText="Set" onSubmit={(url) => handleSetCover({ ...card.cover, imageUrl: url, color: undefined })} onCancel={() => {}} />
                                </Popover>
                            )}
                        </div>
                        <h3>Actions</h3>
                        <button className="sidebar-btn" onClick={handleToggleSubscription}>
                            <Icon name={isSubscribed ? 'visibility_off' : 'visibility'} size={20} />
                            <span>{isSubscribed ? 'Unwatch' : 'Watch'}</span>
                        </button>
                        {customButtons.map(button => (
                            <button key={button.id} className="sidebar-btn automation-btn" onClick={() => executeCustomButton(button, card.id)}>
                                {button.name}
                            </button>
                        ))}
                        <button className="sidebar-btn delete" onClick={onDeleteCard}><Icon name="delete" size={20}/><span>Delete Card</span></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * List Component
 */
const List = ({ list, listIndex, visibilityMap, onUpdateListTitle, onDeleteList, onAddCard, onCardClick, moveCard, availableLabels, availableMembers }: ListProps & { availableLabels: LabelData[], availableMembers: MemberData[] }) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [draggedOver, setDraggedOver] = useState(false);
  const [isDraggingFromThisList, setIsDraggingFromThisList] = useState(false);
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateListTitle(listIndex, e.target.value);
  };
  
  const handleAddCardSubmit = (text: string) => {
      onAddCard(listIndex, text);
      setIsAddingCard(false);
  };
  
  const handleDragStart = (e: React.DragEvent, cardIndex: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ sourceListIndex: listIndex, sourceCardIndex: cardIndex }));
    e.dataTransfer.effectAllowed = 'move';
    setIsDraggingFromThisList(true);
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('dragging');
    }, 0);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
     (e.target as HTMLElement).classList.remove('dragging');
     setIsDraggingFromThisList(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDraggedOver(true);
  };
  
  const handleDragLeave = () => {
      setDraggedOver(false);
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDraggedOver(false);
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { sourceListIndex, sourceCardIndex } = data;
      
      const container = e.currentTarget.querySelector('.cards-container');
      const visibleCardElements = Array.from(container.querySelectorAll('.card:not(.is-hidden):not(.dragging)')) as HTMLElement[];
      
      let closestIndexInFiltered = visibleCardElements.length;
      for (let i = 0; i < visibleCardElements.length; i++) {
          const child = visibleCardElements[i];
          const box = child.getBoundingClientRect();
          if (e.clientY < box.top + box.height / 2) {
              closestIndexInFiltered = i;
              break;
          }
      }

      let targetCardIndex;
      if (closestIndexInFiltered === visibleCardElements.length) {
          targetCardIndex = list.cards.length;
      } else {
          const visibleCards = list.cards.filter(c => visibilityMap[c.id]);
          const actualCard = visibleCards[closestIndexInFiltered];
          targetCardIndex = list.cards.findIndex(c => c.id === actualCard.id);
      }
      
      if (sourceListIndex === listIndex && sourceCardIndex < targetCardIndex) {
        targetCardIndex--;
      }
      
      moveCard(sourceListIndex, sourceCardIndex, listIndex, targetCardIndex);
  };

  return (
    <div 
      className={`list-container ${draggedOver ? 'drag-over' : ''} ${isDraggingFromThisList ? 'is-dragging-from' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="list-header">
        <input 
            className="list-title"
            value={list.title}
            onChange={handleTitleChange}
            aria-label="List title"
        />
        <button className="delete-list-btn" onClick={() => onDeleteList(listIndex)} aria-label="Delete list">
          <Icon name="delete" size={18} />
        </button>
      </div>
      <div className="cards-container">
        {list.cards.map((card, cardIndex) => (
          <Card
            key={card.id}
            card={card}
            isHidden={!visibilityMap[card.id]}
            onDragStart={(e) => handleDragStart(e, cardIndex)}
            onDragEnd={handleDragEnd}
            onClick={() => onCardClick(listIndex, cardIndex)}
            availableLabels={availableLabels}
            availableMembers={availableMembers}
          />
        ))}
      </div>
      {isAddingCard ? (
        <AddItemForm
          placeholder="Enter a title for this card..."
          buttonText="Add Card"
          onSubmit={handleAddCardSubmit}
          onCancel={() => setIsAddingCard(false)}
        />
      ) : (
        <button className="add-card-btn" onClick={() => setIsAddingCard(true)}>
          <Icon name="add" size={20} /> Add a card
        </button>
      )}
    </div>
  );
};

// --- View Components ---

const CalendarView = ({ boardData, onCardClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const changeMonth = (offset) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());
    const endDate = new Date(monthEnd);
    endDate.setDate(endDate.getDate() + (6 - monthEnd.getDay()));

    const days = [];
    let day = new Date(startDate);
    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }

    const allCards = boardData.flatMap((list, listIndex) => list.cards.map((card, cardIndex) => ({ ...card, listIndex, cardIndex })));
    
    return (
        <div className="calendar-view">
            <div className="calendar-header">
                <button onClick={() => changeMonth(-1)} aria-label="Previous month"><Icon name="arrow_back_ios" /></button>
                <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} aria-label="Next month"><Icon name="arrow_forward_ios" /></button>
            </div>
            <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="calendar-weekday">{d}</div>)}
                {days.map(d => {
                    const cardsForDay = allCards.filter(c => c.dueDate.timestamp && new Date(c.dueDate.timestamp).toDateString() === d.toDateString());
                    return (
                        <div key={d.toString()} className={`calendar-day ${d.getMonth() !== currentDate.getMonth() ? 'other-month' : ''}`}>
                            <span>{d.getDate()}</span>
                            <div className="calendar-events">
                                {cardsForDay.map(card => (
                                    <div key={card.id} className="calendar-event" onClick={() => onCardClick(card.listIndex, card.cardIndex)}>
                                        {card.text}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TimelineView = ({ boardData, onCardClick }) => {
    // This is a simplified timeline. A full implementation would be more complex.
    const allCards = boardData.flatMap(list => list.cards.filter(c => c.startDate && c.dueDate.timestamp));
    if (allCards.length === 0) return <div className="view-container">No cards with start and end dates to display.</div>;

    const minDate = new Date(Math.min(...allCards.map(c => c.startDate)));
    const maxDate = new Date(Math.max(...allCards.map(c => c.dueDate.timestamp)));
    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);
    
    const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24);

    const dateMarkers = [];
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        dateMarkers.push(new Date(d));
    }

    return (
        <div className="timeline-view">
            <div className="timeline-header">
                {dateMarkers.map(d => (
                    <div key={d.toString()} className="timeline-date-marker">
                        {d.getDate()}<br/>
                        {d.toLocaleString('default', { weekday: 'short' }).charAt(0)}
                    </div>
                ))}
            </div>
            <div className="timeline-body">
                {boardData.map((list, listIndex) => (
                    <div key={list.id} className="timeline-row">
                        <div className="timeline-list-title">{list.title}</div>
                        <div className="timeline-cards">
                            {list.cards.filter(c => c.startDate && c.dueDate.timestamp).map((card, cardIndex) => {
                                const start = new Date(card.startDate);
                                const end = new Date(card.dueDate.timestamp);
                                const left = ((start.getTime() - minDate.getTime()) / (1000 * 3600 * 24) / totalDays) * 100;
                                const width = ((end.getTime() - start.getTime()) / (1000 * 3600 * 24) / totalDays) * 100;
                                return (
                                    <div 
                                        key={card.id} 
                                        className="timeline-card-bar" 
                                        style={{ left: `${left}%`, width: `${width}%` }}
                                        onClick={() => onCardClick(listIndex, list.cards.findIndex(c=>c.id === card.id))}
                                    >
                                        {card.text}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const TableView = ({ boardData, onCardClick, availableLabels, availableMembers }) => {
    const allCards = boardData.flatMap((list, listIndex) => list.cards.map((card, cardIndex) => ({ ...card, listTitle: list.title, listIndex, cardIndex })));
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({key: 'text', direction: 'asc'});

    const sortedCards = React.useMemo(() => {
        let sortableCards = [...allCards];
        if (sortConfig.key) {
            sortableCards.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableCards;
    }, [allCards, sortConfig]);
    
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    }

    const getSortIndicator = (key: string) => {
        if (sortConfig.key !== key) return null;
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    return (
        <div className="table-view">
            <table>
                <thead>
                    <tr>
                        <th onClick={() => requestSort('text')}>Card Title{getSortIndicator('text')}</th>
                        <th onClick={() => requestSort('listTitle')}>List{getSortIndicator('listTitle')}</th>
                        <th onClick={() => requestSort('dueDate')}>Due Date{getSortIndicator('dueDate')}</th>
                        <th>Members</th>
                        <th>Labels</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedCards.map(card => (
                        <tr key={card.id} onClick={() => onCardClick(card.listIndex, card.cardIndex)}>
                            <td>{card.text}</td>
                            <td>{card.listTitle}</td>
                            <td>{card.dueDate.timestamp ? new Date(card.dueDate.timestamp).toLocaleDateString() : 'N/A'}</td>
                            <td>{card.members.map(id => availableMembers.find(m => m.id === id)?.name).join(', ')}</td>
                            <td>
                                <div className="label-list">
                                    {card.labels.map(id => availableLabels.find(l => l.id === id)).map(l => l && <span key={l.id} className="modal-label" style={{backgroundColor: l.color}}>{l.text}</span>)}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const DashboardView = ({ boardData, availableLabels, availableMembers }) => {
    const allCards = boardData.flatMap(l => l.cards);

    const cardsByList = boardData.map(l => ({ name: l.title, count: l.cards.length }));

    const cardsByMember = availableMembers.map(member => ({
        name: member.name,
        count: allCards.filter(c => c.members.includes(member.id)).length
    })).filter(m => m.count > 0);
    
    const cardsByLabel = availableLabels.map(label => ({
        ...label,
        count: allCards.filter(c => c.labels.includes(label.id)).length
    })).filter(l => l.count > 0);

    const Chart = ({title, data, colorProp = null}) => {
        const maxCount = Math.max(...data.map(d => d.count), 0);
        return (
            <div className="chart-container">
                <h3>{title}</h3>
                {data.map(item => (
                    <div key={item.id || item.name} className="chart-item">
                        <div className="chart-label">{item.text || item.name}</div>
                        <div className="chart-bar-wrapper">
                            <div 
                                className="chart-bar" 
                                style={{
                                    width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                                    backgroundColor: item[colorProp] || 'var(--md-sys-color-primary)'
                                }}
                            />
                        </div>
                        <div className="chart-value">{item.count}</div>
                    </div>
                ))}
            </div>
        );
    }
    
    return (
        <div className="dashboard-view">
            <Chart title="Cards per List" data={cardsByList} />
            <Chart title="Cards per Member" data={cardsByMember} />
            <Chart title="Cards per Label" data={cardsByLabel} colorProp="color" />
        </div>
    );
};

const MapView = ({ boardData, onCardClick }) => {
    const cardsWithLocation = boardData.flatMap((list, listIndex) => 
        list.cards.map((card, cardIndex) => ({ ...card, listTitle: list.title, listIndex, cardIndex }))
    ).filter(c => c.location);

    if (cardsWithLocation.length === 0) {
        return <div className="view-container">No cards with a location assigned.</div>;
    }

    return (
        <div className="map-view">
            <h3>Cards with Locations</h3>
            <ul>
                {cardsWithLocation.map(card => (
                    <li key={card.id} onClick={() => onCardClick(card.listIndex, card.cardIndex)}>
                        <strong>{card.text}</strong> ({card.listTitle})
                        <p>{card.location}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const NotificationsPopover = ({ notifications, onNotificationClick, onMarkAllRead, onClose }) => {
    return (
        <Popover onClose={onClose} trigger={null}>
            <div className="notifications-popover">
                <div className="notifications-header">
                    <h4>Notifications</h4>
                    <button onClick={onMarkAllRead}>Mark all as read</button>
                </div>
                <div className="notifications-list">
                    {notifications.length === 0 ? (
                        <p className="no-notifications">No new notifications</p>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`} onClick={() => onNotificationClick(n)}>
                                <p>{n.text}</p>
                                <span className="notification-time">{new Date(n.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Popover>
    );
};

const ShareModal = ({ members, onInvite, onClose }) => {
    const [email, setEmail] = useState('');

    const handleInvite = (e) => {
        e.preventDefault();
        if (email.trim()) {
            onInvite(email);
            setEmail('');
        }
    };
    
    return (
      <div className="modal-overlay" onMouseDown={onClose}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><Icon name="close"/></button>
          <div className="modal-header">
            <h3 className="modal-title no-edit">Share Board</h3>
          </div>
          <div className="share-modal-body">
            <form onSubmit={handleInvite} className="share-invite-form">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
                <button type="submit">Invite</button>
            </form>
            <div className="shareable-link">
                <input type="text" readOnly value="https://example.com/board/share-link" />
                <button>Copy Link</button>
            </div>
            <div className="share-members-list">
                <h4>Board Members</h4>
                {members.map(member => (
                    <div key={member.id} className="share-member-item">
                        <img src={member.avatarUrl} alt={member.name} className="member-avatar" />
                        <span>{member.name}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    )
}

const AutomationModal = ({ isOpen, onClose, automations, onUpdate, boardData, availableLabels, availableMembers }) => {
    if (!isOpen) return null;
    const [activeTab, setActiveTab] = useState('rules');

    // Simplified UI for brevity. A full implementation would have forms for creating/editing.
    const getActionDescription = (action: AutomationAction) => {
        switch (action.type) {
            case 'move-to-list': return `move card to list "${boardData.find(l => l.id === action.listId)?.title}"`;
            case 'set-due-date-complete': return `mark due date as ${action.completed ? 'complete' : 'incomplete'}`;
            case 'add-checklist': return `add checklist titled "${action.title}"`;
            case 'post-comment': return `post comment "${action.text}"`;
            case 'add-member': return `add member "${availableMembers.find(m => m.id === action.memberId)?.name}"`;
            case 'add-label': return `add label "${availableLabels.find(l => l.id === action.labelId)?.text}"`;
            default: return 'unknown action';
        }
    };
    
    const getTriggerDescription = (trigger: AutomationTrigger) => {
         switch (trigger.type) {
            case 'card-move': return `When a card is moved to "${boardData.find(l => l.id === trigger.toListId)?.title}"`;
            case 'label-add': return `When label "${availableLabels.find(l => l.id === trigger.labelId)?.text}" is added`;
            default: return 'unknown trigger';
        }
    };

    return (
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal automation-modal" onMouseDown={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><Icon name="close"/></button>
                <div className="modal-header">
                    <h3 className="modal-title no-edit">Automation</h3>
                </div>
                <div className="automation-tabs">
                    <button onClick={() => setActiveTab('rules')} className={activeTab === 'rules' ? 'active' : ''}>Rules</button>
                    <button onClick={() => setActiveTab('scheduled')} className={activeTab === 'scheduled' ? 'active' : ''}>Scheduled</button>
                    <button onClick={() => setActiveTab('card-buttons')} className={activeTab === 'card-buttons' ? 'active' : ''}>Card Buttons</button>
                    <button onClick={() => setActiveTab('board-buttons')} className={activeTab === 'board-buttons' ? 'active' : ''}>Board Buttons</button>
                </div>
                <div className="automation-content">
                    {activeTab === 'rules' && (
                        <div>
                            <h4>Enabled Rules</h4>
                            <ul className="automation-list">
                                {automations.rules.map(rule => (
                                    <li key={rule.id}>
                                        <strong>{rule.name}:</strong> {getTriggerDescription(rule.trigger)}, then {getActionDescription(rule.action)}.
                                    </li>
                                ))}
                            </ul>
                            <button className="action-button">Add Rule</button>
                        </div>
                    )}
                    {activeTab === 'scheduled' && (
                        <div>
                            <h4>Scheduled Commands</h4>
                             <ul className="automation-list">
                                {automations.scheduled.map(cmd => (
                                    <li key={cmd.id}>
                                        <strong>{cmd.name}:</strong> Every {cmd.schedule}, on all cards in "{boardData.find(l=>l.id===cmd.targetListId)?.title}", {getActionDescription(cmd.action)}.
                                    </li>
                                ))}
                            </ul>
                            <button className="action-button">Add Scheduled Command</button>
                        </div>
                    )}
                     {activeTab === 'card-buttons' && (
                        <div>
                            <h4>Card Buttons</h4>
                             <ul className="automation-list">
                                {automations.cardButtons.map(btn => (
                                    <li key={btn.id}>
                                        Button "{btn.name}" will {getActionDescription(btn.action)}.
                                    </li>
                                ))}
                            </ul>
                            <button className="action-button">Add Card Button</button>
                        </div>
                    )}
                    {activeTab === 'board-buttons' && (
                        <div>
                            <h4>Board Buttons</h4>
                            <ul className="automation-list">
                                {automations.boardButtons.map(btn => (
                                    <li key={btn.id}>
                                        Button "{btn.name}" will perform its action.
                                    </li>
                                ))}
                            </ul>
                            <button className="action-button">Add Board Button</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const CustomFieldsModal = ({ isOpen, onClose, definitions, onUpdate }) => {
    if (!isOpen) return null;
    const [newFieldName, setNewFieldName] = useState('');
    const [newFieldType, setNewFieldType] = useState<CustomFieldDefinition['type']>('text');

    const handleAddField = (e) => {
        e.preventDefault();
        if (newFieldName.trim()) {
            const newField: CustomFieldDefinition = {
                id: generateId(),
                name: newFieldName.trim(),
                type: newFieldType,
                ...(newFieldType === 'dropdown' && { options: ['Option 1', 'Option 2'] })
            };
            onUpdate([...definitions, newField]);
            setNewFieldName('');
        }
    };
    
    const handleDeleteField = (id: string) => {
        onUpdate(definitions.filter(d => d.id !== id));
    };

    return (
         <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal automation-modal" onMouseDown={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><Icon name="close"/></button>
                <div className="modal-header">
                    <h3 className="modal-title no-edit">Custom Fields</h3>
                </div>
                <div className="automation-content">
                    <h4>Board Fields</h4>
                    <ul className="automation-list">
                        {definitions.map(def => (
                            <li key={def.id} className="custom-field-def-item">
                                <span><strong>{def.name}</strong> ({def.type})</span>
                                <button onClick={() => handleDeleteField(def.id)}>Delete</button>
                            </li>
                        ))}
                    </ul>
                    <form onSubmit={handleAddField} className="custom-field-form">
                        <h4>Add New Field</h4>
                        <input
                            type="text"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            placeholder="Field Name (e.g., Story Points)"
                        />
                        <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value as any)}>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="dropdown">Dropdown</option>
                        </select>
                        <button type="submit" className="action-button">Add Field</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const PalettePreview = ({ sourceColor }: { sourceColor: string }) => {
    const colors = useMemo(() => {
        if (!sourceColor || !/^#([0-9A-F]{3}){1,2}$/i.test(sourceColor)) {
            // Return a default/fallback palette for invalid color strings
            return ['#cccccc', '#bbbbbb', '#aaaaaa', '#999999'];
        }
        try {
            const theme = themeFromSourceColor(argbFromHex(sourceColor));
            // Using tones for light theme as a consistent preview
            return [
                hexFromArgb(theme.palettes.primary.tone(40)),
                hexFromArgb(theme.palettes.secondary.tone(40)),
                hexFromArgb(theme.palettes.tertiary.tone(40)),
                hexFromArgb(theme.palettes.neutral.tone(94)),
            ];
        } catch (e) {
            console.error("Error generating palette preview:", e);
            return ['#cccccc', '#bbbbbb', '#aaaaaa', '#999999'];
        }
    }, [sourceColor]);

    return (
        <div className="palette-preview">
            {colors.map((color, index) => (
                <div key={`${color}-${index}`} className="palette-preview-swatch" style={{ backgroundColor: color }} />
            ))}
        </div>
    );
};

const AppearanceSettings = ({ theme, updateTheme, resetTheme, exportTheme, importTheme, onOpenElementCustomizer }) => {
    const importInputRef = useRef<HTMLInputElement>(null);
    const BOARD_BACKGROUNDS: Theme['boardBackground'][] = ['none', 'dots', 'grid', 'noise', 'nebula'];
    const PRESET_THEMES = [
        { name: 'Default', sourceColor: '#6750A4' }, // M3 Default
        { name: 'Calm Blue', sourceColor: '#0079BF' },
        { name: 'Forest', sourceColor: '#4CAF50' },
        { name: 'Sunrise', sourceColor: '#FF9800' },
        { name: 'Ruby', sourceColor: '#E91E63' },
        { name: 'Orchid', sourceColor: '#9d55c7' },
    ];
    
    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            importTheme(file);
        }
    };
    
    return (
        <div className="appearance-settings">
            <div className="appearance-controls">
                <div className="setting-item">
                    <h5>Mode</h5>
                    <div className="segmented-control">
                        {(['light', 'dark', 'system'] as const).map(mode => (
                            <label key={mode}>
                                <input type="radio" name="theme-mode" value={mode} checked={theme.mode === mode} onChange={() => updateTheme({ mode })} />
                                <span>{mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="setting-item">
                    <h5>Color Palette</h5>
                    <div className="preset-palettes">
                        {PRESET_THEMES.map(preset => (
                            <button
                                key={preset.name}
                                className={`preset-palette-btn ${theme.sourceColor.toLowerCase() === preset.sourceColor.toLowerCase() ? 'active' : ''}`}
                                onClick={() => updateTheme({ sourceColor: preset.sourceColor })}
                                aria-label={`Set palette to ${preset.name}`}
                            >
                                <PalettePreview sourceColor={preset.sourceColor} />
                                <span>{preset.name}</span>
                            </button>
                        ))}
                    </div>
                    <div className="accent-picker">
                        <input
                            type="color"
                            value={theme.sourceColor}
                            onChange={e => updateTheme({ sourceColor: e.target.value })}
                            className="accent-swatch custom"
                            aria-label="Custom source color"
                        />
                        <div className="custom-color-details">
                            <span>Custom Source</span>
                            <PalettePreview sourceColor={theme.sourceColor} />
                        </div>
                    </div>
                </div>
                
                <div className="setting-item">
                    <h5>Corner Radius</h5>
                    <div className="slider-control">
                        <input type="range" min="0" max="16" value={theme.radius} onChange={e => updateTheme({ radius: parseInt(e.target.value, 10) })} />
                        <span>{theme.radius}px</span>
                    </div>
                </div>
                
                <div className="setting-item">
                    <h5>Font Size</h5>
                    <div className="slider-control">
                        <input type="range" min="0.9" max="1.1" step="0.01" value={theme.fontScale} onChange={e => updateTheme({ fontScale: parseFloat(e.target.value) })} />
                        <span>{Math.round(theme.fontScale * 100)}%</span>
                    </div>
                </div>
                
                <div className="setting-item">
                    <h5>Density</h5>
                    <div className="segmented-control">
                        {(['compact', 'comfortable', 'cozy'] as const).map(density => (
                            <label key={density}>
                                <input type="radio" name="theme-density" value={density} checked={theme.density === density} onChange={() => updateTheme({ density })} />
                                <span>{density.charAt(0).toUpperCase() + density.slice(1)}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="setting-item">
                    <h5>Board Width</h5>
                    <div className="segmented-control">
                        {(['normal', 'wide'] as const).map(width => (
                            <label key={width}>
                                <input type="radio" name="theme-width" value={width} checked={theme.boardWidth === width} onChange={() => updateTheme({ boardWidth: width })} />
                                <span>{width.charAt(0).toUpperCase() + width.slice(1)}</span>
                            </label>
                        ))}
                    </div>
                </div>
                
                <div className="setting-item">
                    <h5>Board Background</h5>
                    <div className="background-picker">
                        {BOARD_BACKGROUNDS.map(bg => (
                            <button
                                key={bg}
                                className={`background-tile bg-tile-${bg} ${theme.boardBackground === bg ? 'active' : ''}`}
                                onClick={() => updateTheme({ boardBackground: bg })}
                                aria-label={`Set board background to ${bg}`}
                            >
                                <span>{bg.charAt(0).toUpperCase() + bg.slice(1)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="setting-item">
                     <label className="toggle-control">
                        <input type="checkbox" checked={theme.reducedMotion} onChange={e => updateTheme({ reducedMotion: e.target.checked })} />
                        <span>Reduce Motion</span>
                    </label>
                </div>
                
                <div className="setting-item">
                    <h5>Theme Actions</h5>
                    <div className="theme-actions">
                        <button className="sidebar-btn full-width" onClick={onOpenElementCustomizer}><Icon name="code" size={20}/> Customize Elements</button>
                        <button className="sidebar-btn" onClick={exportTheme}>Export</button>
                        <button className="sidebar-btn" onClick={handleImportClick}>Import</button>
                        <input type="file" ref={importInputRef} onChange={handleFileImport} accept=".mbtheme" style={{ display: 'none' }} />
                        <button className="sidebar-btn delete full-width" onClick={resetTheme}>Reset to Defaults</button>
                    </div>
                </div>
                
            </div>
            <div className="appearance-preview">
                <h5>Live Preview</h5>
                <div className="theme-preview-board">
                    <div className="theme-preview-list">
                        <div className="theme-preview-list-title">In Progress</div>
                        <div className="theme-preview-card">
                            <div className="theme-preview-card-labels">
                                <span style={{backgroundColor: '#61BD4F'}}></span>
                                <span style={{backgroundColor: '#F2D600'}}></span>
                            </div>
                            <p>Design the new settings modal</p>
                        </div>
                        <div className="theme-preview-card">
                            <p>Implement theme persistence</p>
                        </div>
                        <button className="theme-preview-button"><Icon name="add" size={20}/> Add a card</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, onClearData, theme, updateTheme, resetTheme, exportTheme, importTheme, onOpenElementCustomizer }) => {
    if (!isOpen) return null;
    const [activeTab, setActiveTab] = useState('appearance');

    const licenses = [
        { name: 'React & React DOM', license: 'MIT License', url: 'https://github.com/facebook/react/blob/main/LICENSE' },
        { name: 'Geist Sans & Mono Fonts', license: 'SIL Open Font License 1.1', url: 'https://github.com/vercel/geist-font/blob/main/LICENSE' },
        { name: 'Material Color Utilities', license: 'Apache License 2.0', url: 'https://github.com/material-foundation/material-color-utilities/blob/main/LICENSE' },
    ];

    const handleClearData = () => {
        if (window.confirm('Are you sure you want to delete all board data? This action cannot be undone.')) {
            onClearData();
        }
    };

    return (
        <div className="modal-overlay" onMouseDown={onClose}>
            <div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose} aria-label="Close modal"><Icon name="close"/></button>
                <div className="modal-header">
                    <h3 className="modal-title no-edit">Settings</h3>
                </div>
                <div className="settings-body">
                    <div className="settings-sidebar">
                         <button onClick={() => setActiveTab('appearance')} className={activeTab === 'appearance' ? 'active' : ''}><Icon name="palette" size={20} /> Appearance</button>
                         <button onClick={() => setActiveTab('general')} className={activeTab === 'general' ? 'active' : ''}><Icon name="tune" size={20} /> General</button>
                         <button onClick={() => setActiveTab('licenses')} className={activeTab === 'licenses' ? 'active' : ''}><Icon name="description" size={20} /> Licenses</button>
                    </div>
                    <div className="settings-content">
                        {activeTab === 'licenses' && (
                            <div>
                                <h4>Third-Party Licenses</h4>
                                <p>MosaicBoard is built using fantastic open-source software. We are grateful to the developers of these projects.</p>
                                <ul className="license-list">
                                    {licenses.map(lib => (
                                        <li key={lib.name} className="license-item">
                                            <strong>{lib.name}</strong>
                                            <span> - </span>
                                            <a href={lib.url} target="_blank" rel="noopener noreferrer">{lib.license}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {activeTab === 'general' && (
                            <div>
                                <h4>General Settings</h4>
                                <div className="setting-item">
                                    <h5>Board Data</h5>
                                    <p>This will permanently delete all lists, cards, and settings from your browser's local storage.</p>
                                    <button className="sidebar-btn delete" onClick={handleClearData}>Clear All Board Data</button>
                                </div>
                            </div>
                        )}
                         {activeTab === 'appearance' && (
                            <AppearanceSettings 
                                theme={theme}
                                updateTheme={updateTheme}
                                resetTheme={resetTheme}
                                exportTheme={exportTheme}
                                importTheme={importTheme}
                                onOpenElementCustomizer={onOpenElementCustomizer}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CUSTOMIZABLE_ELEMENTS = [
    { name: 'Main Header', selector: 'header' },
    { name: 'Board', selector: '.board' },
    { name: 'List', selector: '.list-container' },
    { name: 'List Header', selector: '.list-header .list-title' },
    { name: 'Card', selector: '.card' },
    { name: 'Primary Button', selector: '.action-button' },
    { name: 'Secondary Button', selector: '.sidebar-btn' },
    { name: 'Modal Window', selector: '.modal' },
    { name: 'Modal Title', selector: '.modal-title' },
];

const ElementCustomizerModal = ({ isOpen, onClose, originalCss, onSave }) => {
    if (!isOpen) return null;

    const [activeSelector, setActiveSelector] = useState(CUSTOMIZABLE_ELEMENTS[0].selector);
    const [localCss, setLocalCss] = useState(originalCss);

    useEffect(() => {
        if (isOpen) {
            setLocalCss(originalCss);
        }
    }, [isOpen, originalCss]);

    const handleCssChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newCss = {
            ...localCss,
            [activeSelector]: e.target.value,
        };
        setLocalCss(newCss);
        onSave(newCss); // Apply changes live for preview
    };

    const handleSave = () => {
        onSave(localCss);
        onClose();
    };
    
    const handleClose = () => {
        onSave(originalCss); // Revert changes on cancel
        onClose();
    };

    const handleResetElementCss = () => {
        const { [activeSelector]: _, ...rest } = localCss;
        setLocalCss(rest);
        onSave(rest);
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 1010 }} onMouseDown={handleClose}>
            <div className="modal element-customizer-modal" onMouseDown={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={handleClose} aria-label="Close modal"><Icon name="close"/></button>
                <div className="modal-header">
                    <h3 className="modal-title no-edit">Customize Elements</h3>
                </div>
                <div className="element-customizer-body">
                    <div className="element-customizer-sidebar">
                        {CUSTOMIZABLE_ELEMENTS.map(el => (
                            <button 
                                key={el.selector} 
                                onClick={() => setActiveSelector(el.selector)} 
                                className={activeSelector === el.selector ? 'active' : ''}
                            >
                                {el.name}
                            </button>
                        ))}
                    </div>
                    <div className="element-customizer-content">
                        <p className="modal-subtitle" style={{marginBottom: '8px'}}>Custom CSS for <code>{activeSelector}</code>. Changes are applied live.</p>
                        <textarea
                            value={localCss[activeSelector] || ''}
                            onChange={handleCssChange}
                            spellCheck="false"
                            aria-label={`Custom CSS for ${activeSelector}`}
                        />
                         <div style={{ marginTop: '8px' }}>
                            <button className="sidebar-btn delete" style={{ width: 'auto', margin: 0 }} onClick={handleResetElementCss}>
                                Reset for this element
                            </button>
                        </div>
                    </div>
                </div>
                <div className="element-customizer-footer">
                    <button className="sidebar-btn" onClick={handleClose} style={{margin: 0}}>Cancel</button>
                    <button className="action-button" onClick={handleSave}>Save and Close</button>
                </div>
            </div>
        </div>
    );
};


/**
 * Main App Component
 */
const App = () => {
  const themeManager = useTheme();

  const [availableLabels] = useState<LabelData[]>(AVAILABLE_LABELS_DATA);
  const [availableMembers, setAvailableMembers] = useState<MemberData[]>(AVAILABLE_MEMBERS_DATA);
  
  const [boardData, setBoardData] = useState<ListData[]>(() => {
    try {
        const savedData = localStorage.getItem('mosaic-board-data');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            let counter = 0;
            return parsed.map(list => ({
                ...list,
                cards: list.cards.map(card => {
                    counter++;
                    return {
                        ...card,
                        cardShortId: card.cardShortId || counter,
                        labels: card.labels || [],
                        members: card.members || [],
                        dueDate: card.dueDate || { timestamp: null, completed: false },
                        startDate: card.startDate || null,
                        location: card.location || '',
                        checklists: (card.checklists || []).map(cl => ({
                            ...cl,
                            items: (cl.items || []).map(item => ({...item, attachments: item.attachments || []}))
                        })),
                        attachments: card.attachments || [],
                        cover: card.cover || { size: 'normal' },
                        subscribers: card.subscribers || [],
                        comments: (card.comments || []).map(c => ({...c, attachments: c.attachments || []})),
                        customFields: card.customFields || {},
                        linkedCards: card.linkedCards || [],
                    }
                })
            }));
        }
        
        const cardId1 = generateId();
        const cardId2 = generateId();
        const cardId3 = generateId();
        const cardId4 = generateId();
        const MOCKUP_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e0e0e0'/%3E%3Ctext x='50' y='55' font-size='12' text-anchor='middle' fill='%23999'%3EMockup%3C/text%3E%3C/svg%3E";

         const initialData = [
            {
                id: 'list-1', title: 'Website Redesign', cards: [
                    {
                        id: cardId1, cardShortId: 1, text: 'Design new marketing website',
                        description: 'Includes wireframes, mockups, and prototypes for the new homepage and feature pages. Focus on a clean, modern aesthetic with clear calls to action.',
                        comments: [{id: generateId(), authorId: 'member-2', text: 'Great start, @Charlie! What do you think of the color palette?', timestamp: createTimestamp(), attachments: []}],
                        activity: [createActivity('created this card.')],
                        labels: ['label-3', 'label-5'], // Design, Research
                        members: ['member-1'], // Alice
                        dueDate: { timestamp: Date.now() + 5 * 24 * 60 * 60 * 1000, completed: false },
                        startDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
                        location: "Design Studio",
                        checklists: [{
                            id: generateId(), title: 'Design Phases', items: [
                                {id: generateId(), text: 'Research competitors', completed: true, attachments: []},
                                {id: generateId(), text: 'Create wireframes', completed: true, attachments: []},
                                {id: generateId(), text: 'Develop mockups', completed: false, attachments: [{ id: generateId(), url: MOCKUP_SVG, name: 'mockup-preview.svg', type: 'file', timestamp: createTimestamp(), previewUrl: MOCKUP_SVG }]},
                                {id: generateId(), text: 'Finalize color palette', completed: false, attachments: []}
                            ]
                        }],
                        attachments: [{id: generateId(), url: 'https://www.figma.com', name: 'Link: figma.com', timestamp: createTimestamp(), type: 'link'}],
                        cover: { imageUrl: `https://picsum.photos/seed/${cardId1}/600/400` },
                        subscribers: ['member-1'],
                        customFields: { 'field-2': 'High'},
                        linkedCards: []
                    }
                ]
            },
            {
                id: 'list-2', title: 'Q2 Features', cards: [
                    {
                        id: cardId2, cardShortId: 2, text: 'Develop custom fields feature',
                        description: 'Allow users to add custom fields like "Story Points" (number) or "Priority" (dropdown) to cards.',
                        comments: [],
                        activity: [createActivity('created this card.'), createActivity('linked card #3 to this card.')],
                        labels: ['label-1', 'label-4'], // Feature, Docs
                        members: ['member-1', 'member-2'], // Alice, Bob
                        dueDate: { timestamp: Date.now() + 14 * 24 * 60 * 60 * 1000, completed: false },
                        startDate: Date.now(),
                        location: "",
                        checklists: [
                            { id: generateId(), title: 'Development Tasks', items: [
                                { id: generateId(), text: 'API endpoints', completed: true, attachments: [] },
                                { id: generateId(), text: 'Database schema update', completed: true, attachments: [] },
                                { id: generateId(), text: 'Frontend UI implementation', completed: false, attachments: [] }
                            ]}
                        ],
                        attachments: [],
                        cover: { color: '#61BD4F' }, // Green
                        subscribers: ['member-3'], // Charlie is watching
                        customFields: { 'field-1': 8 },
                        linkedCards: [cardId3],
                    },
                    {
                        id: cardId3, cardShortId: 3, text: 'Write documentation for Custom Fields',
                        description: 'Document the new custom fields feature for the public knowledge base.',
                        comments: [],
                        activity: [createActivity('created this card.')],
                        labels: ['label-4'], // Docs
                        members: ['member-3'], // Charlie
                        dueDate: { timestamp: Date.now() + 18 * 24 * 60 * 60 * 1000, completed: false },
                        startDate: null,
                        location: "",
                        checklists: [],
                        attachments: [],
                        cover: { },
                        subscribers: [],
                        customFields: {},
                        linkedCards: [],
                    }
                ]
            },
            {
                id: 'list-3', title: 'Done', cards: [
                     {
                        id: cardId4, cardShortId: 4, text: 'Refactor authentication module',
                        description: 'Improve security and performance of the user login and session management.',
                        comments: [],
                        activity: [createActivity('completed this card.')],
                        labels: ['label-2'], // Bug
                        members: ['member-2'], // Bob
                        dueDate: { timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, completed: true },
                        startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
                        location: "",
                        checklists: [],
                        attachments: [],
                        cover: { },
                        subscribers: [],
                        customFields: {},
                        linkedCards: [],
                    }
                ]
            },
        ];
        return initialData;
    } catch (error) {
        console.error("Failed to parse board data from localStorage", error);
        return [];
    }
  });
  const [isAddingList, setIsAddingList] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ listIndex: number; cardIndex: number } | null>(null);
  const [filters, setFilters] = useState<Filters>({ query: '', members: [], labels: [], dueDate: 'any' });
  const [isFilterPopoverOpen, setFilterPopoverOpen] = useState(false);
  
  type View = 'Board' | 'Calendar' | 'Timeline' | 'Table' | 'Dashboard' | 'Map';
  const [view, setView] = useState<View>('Board');

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [isAutomationModalOpen, setAutomationModalOpen] = useState(false);
  const [isCustomFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [isElementCustomizerOpen, setElementCustomizerOpen] = useState(false);

  const [automations, setAutomations] = useState<Automations>({
      rules: [
          {id: 'rule-1', name: "Complete card on move to Done", trigger: { type: 'card-move', toListId: 'list-3'}, action: { type: 'set-due-date-complete', completed: true }},
          {id: 'rule-2', name: "Add Design label to bugs", trigger: { type: 'label-add', labelId: 'label-2'}, action: { type: 'add-label', labelId: 'label-3'}}
      ],
      scheduled: [
          {id: 'sched-1', name: "Archive Done cards", schedule: 'weekly', targetListId: 'list-3', action: { type: 'post-comment', text: 'This card is scheduled for archival.' }}
      ],
      cardButtons: [
          {id: 'btn-1', name: "Request Review", action: { type: 'add-member', memberId: 'member-2' }}
      ],
      boardButtons: []
  });
  
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>(() => {
    const saved = localStorage.getItem('mosaic-custom-fields');
    if (saved) return JSON.parse(saved);
    return [
        { id: 'field-1', name: 'Story Points', type: 'number' },
        { id: 'field-2', name: 'Priority', type: 'dropdown', options: ['High', 'Medium', 'Low'] },
    ];
  });
  
  const [cardCounter, setCardCounter] = useState(() => {
    const savedData = localStorage.getItem('mosaic-board-data');
    if (savedData) {
      try {
        const allCards = JSON.parse(savedData).flatMap(l => l.cards);
        return allCards.length > 0 ? Math.max(0, ...allCards.map(c => c.cardShortId || 0)) : 0;
      } catch { return 0; }
    }
    return 4;
  });

  
  const CURRENT_USER_ID = availableMembers.length > 0 ? availableMembers[0].id : '';
  
  const addNotification = useCallback((text, card, list) => {
    const newNotification: NotificationData = {
        id: generateId(), text, cardId: card.id, listId: list.id,
        timestamp: createTimestamp(), read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);
  
  useEffect(() => {
    try {
        const sanitizedData = getSanitizedBoardDataForStorage(boardData);
        localStorage.setItem('mosaic-board-data', JSON.stringify(sanitizedData));
    } catch(error) {
        console.error("Failed to save board data to localStorage", error);
        alert("Could not save board data. Your browser's storage might be full.");
    }
  }, [boardData]);
  
  useEffect(() => {
    localStorage.setItem('mosaic-custom-fields', JSON.stringify(customFieldDefinitions));
  }, [customFieldDefinitions]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

        if (e.key === 'Escape') {
            if (isElementCustomizerOpen) setElementCustomizerOpen(false);
            else if (selectedCard) handleCloseModal();
            else if (isFilterPopoverOpen) setFilterPopoverOpen(false);
            else if (isNotificationsOpen) setNotificationsOpen(false);
            else if (isShareModalOpen) setShareModalOpen(false);
            else if (isAutomationModalOpen) setAutomationModalOpen(false);
            else if (isCustomFieldsModalOpen) setCustomFieldsModalOpen(false);
            else if (isSettingsModalOpen) setSettingsModalOpen(false);
            else if (isTyping) (activeElement as HTMLElement).blur();
        }
        
        if (isTyping) return;

        if (e.key === 'q') {
            e.preventDefault();
            setFilterPopoverOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedCard, isFilterPopoverOpen, isNotificationsOpen, isShareModalOpen, isAutomationModalOpen, isCustomFieldsModalOpen, isSettingsModalOpen, isElementCustomizerOpen]);

useEffect(() => {
    const interval = setInterval(() => {
        // console.log("Checking for scheduled automation commands...");
    }, 60 * 1000);
    return () => clearInterval(interval);
}, [automations.scheduled, boardData]);

  const handleAddList = (title: string) => {
    const newList: ListData = { id: generateId(), title, cards: [] };
    setBoardData([...boardData, newList]);
    setIsAddingList(false);
  };

  const handleDeleteList = (listIndex: number) => {
    setBoardData(boardData.filter((_, index) => index !== listIndex));
  };
  
  const handleUpdateListTitle = (listIndex: number, newTitle: string) => {
    const newBoardData = [...boardData];
    newBoardData[listIndex].title = newTitle;
    setBoardData(newBoardData);
  };

  const handleAddCard = (listIndex: number, text: string) => {
    const newCount = cardCounter + 1;
    const newCard: CardData = { 
      id: generateId(), text, description: '', comments: [],
      activity: [createActivity('created this card.')], labels: [], members: [],
      dueDate: { timestamp: null, completed: false }, startDate: null, location: '',
      checklists: [], attachments: [], cover: {}, subscribers: [],
      cardShortId: newCount, customFields: {}, linkedCards: [],
    };
    const newBoardData = [...boardData];
    newBoardData[listIndex].cards.push(newCard);
    setBoardData(newBoardData);
    setCardCounter(newCount);
  };
  
  const handleUpdateCard = (listIndex: number, cardIndex: number, updates: Partial<CardData>, isAutomated: boolean = false) => {
      const newBoardData = [...boardData];
      const oldCard = newBoardData[listIndex].cards[cardIndex];
      const list = newBoardData[listIndex];

      const updatedCard = { ...oldCard, ...updates };
      
      if (!isAutomated) {
        if (updates.members) {
            updates.members.forEach(memberId => {
              if (!oldCard.members.includes(memberId) && memberId === CURRENT_USER_ID) {
                addNotification(`You were added to "${updatedCard.text}"`, updatedCard, list);
              }
            });
        }
        
        const watchedUpdateText = getWatchedUpdateText(oldCard, updatedCard);
        if (watchedUpdateText) {
            updatedCard.subscribers.forEach(id => {
                if (id === CURRENT_USER_ID) {
                    addNotification(`${watchedUpdateText} on "${updatedCard.text}"`, updatedCard, list)
                }
            })
        }
      }
      
      newBoardData[listIndex].cards[cardIndex] = updatedCard;
      setBoardData(newBoardData);

      if (!isAutomated) {
          if (updates.labels) {
              const addedLabels = updates.labels.filter(l => !oldCard.labels.includes(l));
              addedLabels.forEach(labelId => runAutomations({type: 'label-add', labelId}, updatedCard, list));
          }
      }
  };
  
  const getWatchedUpdateText = (oldCard, newCard) => {
      if (oldCard.description !== newCard.description) return "Description was updated";
      if (oldCard.dueDate.timestamp !== newCard.dueDate.timestamp) return "Due date was changed";
      if (oldCard.dueDate.completed !== newCard.dueDate.completed) return newCard.dueDate.completed ? "Due date was marked complete" : "Due date was marked incomplete";
      return null;
  }
  
  const handleAddComment = (listIndex: number, cardIndex: number, commentText: string, attachments: AttachmentData[]) => {
      const newBoardData = [...boardData];
      const card = newBoardData[listIndex].cards[cardIndex];
      const list = newBoardData[listIndex];
      const newComment: CommentData = { 
        id: generateId(), authorId: CURRENT_USER_ID, text: commentText, timestamp: createTimestamp(), attachments 
      };
      card.comments.unshift(newComment);
      
      const currentUser = availableMembers.find(m => m.id === CURRENT_USER_ID);
      const activityText = attachments.length > 0 
        ? `${currentUser?.name || 'User'} added a comment and attached ${attachments.length} file(s).`
        : `${currentUser?.name || 'User'} added a comment.`
      card.activity.unshift(createActivity(activityText));
      
      const mentions: string[] = commentText.match(/@(\w+)/g) || [];
      mentions.forEach(mentionStr => {
          const memberName = mentionStr.substring(1);
          const member = availableMembers.find(m => m.name === memberName);
          if (member && member.id === CURRENT_USER_ID) {
              addNotification(`You were mentioned in a comment on "${card.text}"`, card, list);
          }
      });
      
      card.subscribers.forEach(id => {
          if (id === CURRENT_USER_ID && id !== CURRENT_USER_ID) {
              addNotification(`A new comment was added to "${card.text}"`, card, list);
          }
      })
      
      setBoardData(newBoardData);
  };
  
  const handleDeleteCard = (listIndex: number, cardIndex: number) => {
      const newBoardData = [...boardData];
      newBoardData[listIndex].cards.splice(cardIndex, 1);
      setBoardData(newBoardData);
      handleCloseModal();
  };

  const handleCardClick = (listIndex: number, cardIndex: number) => {
      setSelectedCard({ listIndex, cardIndex });
  };
  
  const handleCloseModal = () => {
      setSelectedCard(null);
  };

  const moveCard = (sourceListIndex: number, sourceCardIndex: number, destListIndex: number, destCardIndex: number, isAutomated: boolean = false) => {
    if (sourceListIndex === destListIndex && sourceCardIndex === destCardIndex) return;
    const newBoardData = [...boardData];
    const sourceList = newBoardData[sourceListIndex];
    const destList = newBoardData[destListIndex];
    const [draggedCard] = sourceList.cards.splice(sourceCardIndex, 1);
    
    if (!isAutomated) {
        if (sourceListIndex !== destListIndex) {
            draggedCard.activity.unshift(createActivity(`moved this card from ${sourceList.title} to ${destList.title}`));
            draggedCard.subscribers.forEach(id => {
                if (id === CURRENT_USER_ID) {
                    addNotification(`"${draggedCard.text}" was moved to ${destList.title}`, draggedCard, destList);
                }
            });
        }
    }
    
    destList.cards.splice(destCardIndex, 0, draggedCard);
    setBoardData(newBoardData);
    
    if(selectedCard) {
        if(selectedCard.listIndex === sourceListIndex && selectedCard.cardIndex === sourceCardIndex) {
            setSelectedCard({listIndex: destListIndex, cardIndex: destCardIndex});
        }
    }
    
    if (!isAutomated) {
        runAutomations({ type: 'card-move', toListId: destList.id }, draggedCard, destList);
    }
  };

  const executeAutomationAction = (action: AutomationAction, cardId: string) => {
    let listIndex = -1;
    let cardIndex = -1;
    let card: CardData | null = null;

    for (let i = 0; i < boardData.length; i++) {
        const cIndex = boardData[i].cards.findIndex(c => c.id === cardId);
        if (cIndex !== -1) {
            listIndex = i; cardIndex = cIndex; card = boardData[i].cards[cIndex];
            break;
        }
    }
    if (!card) return;

    switch (action.type) {
        case 'move-to-list':
            const destListIndex = boardData.findIndex(l => l.id === action.listId);
            if (destListIndex !== -1 && listIndex !== destListIndex) {
                moveCard(listIndex, cardIndex, destListIndex, 0, true);
            }
            break;
        case 'set-due-date-complete':
            handleUpdateCard(listIndex, cardIndex, { dueDate: { ...card.dueDate, completed: action.completed } }, true);
            break;
        case 'add-label':
            if (!card.labels.includes(action.labelId)) {
                handleUpdateCard(listIndex, cardIndex, { labels: [...card.labels, action.labelId] }, true);
            }
            break;
        case 'add-member':
             if (!card.members.includes(action.memberId)) {
                handleUpdateCard(listIndex, cardIndex, { members: [...card.members, action.memberId] }, true);
            }
            break;
        case 'add-checklist':
            const newChecklist: ChecklistData = { id: generateId(), title: action.title, items: [] };
            handleUpdateCard(listIndex, cardIndex, { checklists: [...card.checklists, newChecklist] }, true);
            break;
        case 'post-comment':
            const newComment: CommentData = { id: generateId(), authorId: 'automation-bot', text: action.text, timestamp: createTimestamp(), attachments: [] };
            handleUpdateCard(listIndex, cardIndex, { comments: [newComment, ...card.comments] }, true);
            break;
    }
  };
  
  const runAutomations = (trigger: AutomationTrigger, card: CardData, list: ListData) => {
      automations.rules.forEach(rule => {
          let triggerMet = false;
          if (rule.trigger.type === 'card-move' && trigger.type === 'card-move') {
              if (rule.trigger.toListId === trigger.toListId) {
                  triggerMet = true;
              }
          } else if (rule.trigger.type === 'label-add' && trigger.type === 'label-add') {
              if (rule.trigger.labelId === trigger.labelId) {
                  triggerMet = true;
              }
          }

          if (triggerMet) {
              console.log(`Automation rule triggered: ${rule.name}`);
              executeAutomationAction(rule.action, card.id);
          }
      });
  };
  
  const handleNotificationClick = (notification: NotificationData) => {
      const listIndex = boardData.findIndex(l => l.id === notification.listId);
      if (listIndex === -1) return;
      const cardIndex = boardData[listIndex].cards.findIndex(c => c.id === notification.cardId);
      if (cardIndex === -1) return;
      
      handleCardClick(listIndex, cardIndex);
      setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, read: true} : n));
      setNotificationsOpen(false);
  };

  const markAllNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({...n, read: true})));
  };
  
  const handleInviteUser = (email: string) => {
      const name = email.split('@')[0];
      const newMember: MemberData = {
          id: generateId(),
          name: name.charAt(0).toUpperCase() + name.slice(1),
          avatarUrl: `https://i.pravatar.cc/150?u=${generateId()}`
      };
      setAvailableMembers(prev => [...prev, newMember]);
      alert(`${newMember.name} has been invited to the board!`);
  }

  const handleClearData = () => {
    localStorage.removeItem('mosaic-board-data');
    localStorage.removeItem('mosaic-custom-fields');
    localStorage.removeItem('mosaic.theme');
    localStorage.removeItem('mosaic.customCss');
    window.location.reload();
  };
  
  const visibilityMap = useMemo(() => {
    const map: { [cardId: string]: boolean } = {};
    const isFiltersActive = filters.query.length > 0 || filters.members.length > 0 || filters.labels.length > 0 || filters.dueDate !== 'any';
    
    if (!isFiltersActive) {
        boardData.forEach(list => list.cards.forEach(card => map[card.id] = true));
        return map;
    }

    boardData.forEach(list => {
        list.cards.forEach(card => {
            let isVisible = true;
            const query = filters.query.toLowerCase();
            if (query && !card.text.toLowerCase().includes(query) && !card.description.toLowerCase().includes(query)) {
                isVisible = false;
            }

            if (isVisible && filters.members.length > 0) {
                if (filters.members.includes('no-members')) {
                    if (card.members.length > 0) isVisible = false;
                } else if (!card.members.some(mId => filters.members.includes(mId))) {
                    isVisible = false;
                }
            }

            if (isVisible && filters.labels.length > 0) {
                 if (filters.labels.includes('no-labels')) {
                    if (card.labels.length > 0) isVisible = false;
                } else if (!card.labels.some(lId => filters.labels.includes(lId))) {
                    isVisible = false;
                }
            }
            
            if (isVisible && filters.dueDate !== 'any') {
                const status = getDueDateStatus(card.dueDate);
                if (filters.dueDate !== status) {
                    isVisible = false;
                }
            }
            
            map[card.id] = isVisible;
        });
    });
    return map;
  }, [boardData, filters]);
  
  const currentCard = selectedCard ? boardData[selectedCard.listIndex].cards[selectedCard.cardIndex] : null;
  const isFiltersActive = filters.query.length > 0 || filters.members.length > 0 || filters.labels.length > 0 || filters.dueDate !== 'any';
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const renderView = () => {
    switch (view) {
        case 'Calendar': return <CalendarView boardData={boardData} onCardClick={handleCardClick} />;
        case 'Timeline': return <TimelineView boardData={boardData} onCardClick={handleCardClick} />;
        case 'Table': return <TableView boardData={boardData} onCardClick={handleCardClick} availableLabels={availableLabels} availableMembers={availableMembers}/>;
        case 'Dashboard': return <DashboardView boardData={boardData} availableLabels={availableLabels} availableMembers={availableMembers}/>;
        case 'Map': return <MapView boardData={boardData} onCardClick={handleCardClick} />;
        case 'Board': default:
            return (
                <div className="board">
                    {boardData.map((list, index) => (
                      <List
                        key={list.id} list={list} listIndex={index} visibilityMap={visibilityMap}
                        onUpdateListTitle={handleUpdateListTitle} onDeleteList={handleDeleteList}
                        onAddCard={handleAddCard} onCardClick={handleCardClick} moveCard={moveCard}
                        availableLabels={availableLabels} availableMembers={availableMembers}
                      />
                    ))}
                    <div className="list-container">
                      {isAddingList ? (
                        <AddItemForm
                          placeholder="Enter list title..." buttonText="Add List"
                          onSubmit={handleAddList} onCancel={() => setIsAddingList(false)}
                        />
                      ) : (
                        <button className="add-list-btn" onClick={() => setIsAddingList(true)}>
                          <Icon name="add" size={20} /> Add another list
                        </button>
                      )}
                    </div>
                </div>
            );
    }
  };

  return (
    <>
      <header>
        <h1>MosaicBoard</h1>
        <div className="header-center">
            <div className="view-switcher">
                {(['Board', 'Calendar', 'Timeline', 'Table', 'Dashboard', 'Map'] as View[]).map(v => (
                    <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v}</button>
                ))}
            </div>
        </div>
        <div className="header-right">
            <button className="header-btn" onClick={() => setCustomFieldsModalOpen(true)}><Icon name="data_object" size={20}/><span>Fields</span></button>
            <div className="popover-wrapper">
                <button className="filter-button" onClick={() => setFilterPopoverOpen(o => !o)}>
                    <Icon name="filter_list" size={20}/>
                    <span>Filter</span>
                    {isFiltersActive && <span className="filter-active-indicator" />}
                </button>
                {isFilterPopoverOpen && (
                    <FilterPopover 
                        filters={filters}
                        onFiltersChange={setFilters}
                        onClose={() => setFilterPopoverOpen(false)}
                        availableLabels={availableLabels}
                        availableMembers={availableMembers}
                    />
                )}
            </div>
            <button className="header-btn icon-only" onClick={() => setAutomationModalOpen(true)} aria-label="Automation"><Icon name="smart_toy" /></button>
            <div className="popover-wrapper">
                <button className="header-btn icon-only" onClick={() => setNotificationsOpen(o => !o)} aria-label="Notifications">
                    <Icon name="notifications" />
                    {unreadNotificationsCount > 0 && <span className="notification-badge">{unreadNotificationsCount}</span>}
                </button>
                {isNotificationsOpen && (
                    <NotificationsPopover
                        notifications={notifications}
                        onNotificationClick={handleNotificationClick}
                        onMarkAllRead={markAllNotificationsRead}
                        onClose={() => setNotificationsOpen(false)}
                    />
                )}
            </div>
             <button className="header-btn share-btn" onClick={() => setShareModalOpen(true)}><Icon name="person_add" size={20}/><span>Share</span></button>
             <button className="header-btn icon-only" onClick={() => setSettingsModalOpen(true)} aria-label="Settings"><Icon name="settings"/></button>
        </div>
      </header>
      <main className={`main-container view-${view.toLowerCase()}`}>
        {renderView()}
      </main>
      {selectedCard && currentCard && (
        <CardModal 
            card={currentCard}
            listTitle={boardData[selectedCard.listIndex].title}
            onClose={handleCloseModal}
            onUpdateCard={(updates) => handleUpdateCard(selectedCard.listIndex, selectedCard.cardIndex, updates)}
            onAddComment={(commentText, attachments) => handleAddComment(selectedCard.listIndex, selectedCard.cardIndex, commentText, attachments)}
            onDeleteCard={() => handleDeleteCard(selectedCard.listIndex, selectedCard.cardIndex)}
            availableLabels={availableLabels}
            availableMembers={availableMembers}
            currentUserId={CURRENT_USER_ID}
            customButtons={automations.cardButtons}
            executeCustomButton={(button, cardId) => executeAutomationAction(button.action, cardId)}
            customFieldDefinitions={customFieldDefinitions}
            boardData={boardData}
        />
      )}
      {isShareModalOpen && (
          <ShareModal members={availableMembers} onInvite={handleInviteUser} onClose={() => setShareModalOpen(false)} />
      )}
      <AutomationModal
        isOpen={isAutomationModalOpen}
        onClose={() => setAutomationModalOpen(false)}
        automations={automations}
        onUpdate={setAutomations}
        boardData={boardData}
        availableLabels={availableLabels}
        availableMembers={availableMembers}
      />
      <CustomFieldsModal
        isOpen={isCustomFieldsModalOpen}
        onClose={() => setCustomFieldsModalOpen(false)}
        definitions={customFieldDefinitions}
        onUpdate={setCustomFieldDefinitions}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onClearData={handleClearData}
        onOpenElementCustomizer={() => setElementCustomizerOpen(true)}
        {...themeManager}
      />
       <ElementCustomizerModal
        isOpen={isElementCustomizerOpen}
        onClose={() => setElementCustomizerOpen(false)}
        originalCss={themeManager.customCss}
        onSave={themeManager.updateCustomCss}
      />
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);