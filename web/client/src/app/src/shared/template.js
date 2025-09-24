// Shared template configuration for both TicketFieldCustomizer and CreateTicketModal
// This ensures both components use the same defaults and schema

export const TEMPLATE_VERSION = 8;

export const DEFAULT_TEMPLATE = {
  version: TEMPLATE_VERSION,
  template: {
    title: true,
    description: true,
    contact: true,
    priority: true,
    status: true,
    category: true,          // keep in both
    assignedUser: true,
    scheduled_date: true,    // enable scheduled_date for booking calendar integration
    photos: false,
    attachments: false
  },
  order: ['title', 'description', 'contact', 'priority', 'status', 'category', 'assignedUser', 'scheduled_date'],
  configurations: { 
    category: ['General', 'Technical', 'Maintenance', 'Support'] 
  }
};

// Fields that can be rendered in the CreateTicketModal
// Note: assignedUser is deliberately excluded from counts but still rendered
export const RENDERABLE_FIELDS = new Set([
  'title',
  'description', 
  'contact',
  'priority',
  'status',
  'category',
  'equipment_id',
  'work_type',
  'service_category',
  'scheduled_date',
  'photos',
  'attachments'
]);

// Storage key for template data
export const STORAGE_KEY = 'ticketTemplate';

// Shared template loader with consistent migration logic
export const loadTemplate = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    console.log('Loading template, raw data:', raw);
    
    if (!raw) {
      console.log('No saved template found, using defaults');
      return DEFAULT_TEMPLATE;
    }

    const parsed = JSON.parse(raw);
    console.log('Parsed template:', parsed);
    
    // Only migrate based on version and schema validity (not field ordering)
    const needsMigration = !parsed.version || 
                         parsed.version < TEMPLATE_VERSION || 
                         !Array.isArray(parsed.order) ||
                         typeof parsed.template !== 'object';
    
    if (needsMigration) {
      console.log(`MIGRATING: from version ${parsed.version || 'unknown'} to ${TEMPLATE_VERSION}`);
      
      const fresh = { ...DEFAULT_TEMPLATE };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    
    console.log('Using existing template version', parsed.version);
    return parsed;
  } catch (error) {
    console.error('Error parsing saved template:', error);
    localStorage.removeItem(STORAGE_KEY);
    const fresh = { ...DEFAULT_TEMPLATE };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
};

// Save template to localStorage
export const saveTemplate = (templateData) => {
  try {
    const dataToSave = {
      ...templateData,
      version: TEMPLATE_VERSION
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('Saved template:', dataToSave);
    return true;
  } catch (error) {
    console.error('Error saving template:', error);
    return false;
  }
};

// Get count of renderable fields
export const getRenderableFieldCount = (template, order) => {
  return order.filter(fieldKey => 
    template[fieldKey] && RENDERABLE_FIELDS.has(fieldKey)
  ).length;
};
