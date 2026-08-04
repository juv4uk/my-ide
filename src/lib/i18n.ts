export type Language = 'en' | 'uk';

const messages = {
  en: {
    appName: 'Signal & Radio Log', newQso: 'New QSO', logbook: 'Logbook', notes: 'Notes', settings: 'Station',
    call: 'Callsign', callHint: 'Enter callsign', band: 'Band', frequency: 'Frequency (MHz)', mode: 'Mode',
    rstSent: 'RST sent', rstRcvd: 'RST received', utcDate: 'Date (UTC)', utcTime: 'Time (UTC)',
    optional: 'More details', name: 'Operator name', qth: 'QTH', grid: 'Grid square', comment: 'Comment',
    saveQso: 'Save QSO', updateQso: 'Update QSO', cancel: 'Cancel', saved: 'QSO saved', requiredCall: 'Enter a callsign first',
    recent: 'Recent contacts', search: 'Search callsign, QTH, band or mode', noQso: 'No contacts yet', edit: 'Edit',
    remove: 'Delete', confirmDelete: 'Delete this QSO?', importAdif: 'Import ADIF', exportAdif: 'Export ADIF',
    imported: 'contacts imported', importError: 'Could not import this ADIF file', exported: 'ADIF exported',
    stationProfile: 'Station profile', myCall: 'My callsign', operator: 'Operator', myGrid: 'My grid square',
    defaultBand: 'Default band', defaultMode: 'Default mode', defaultPower: 'Power (W)', language: 'Language',
    saveProfile: 'Save profile', profileSaved: 'Station profile saved', english: 'English', ukrainian: 'Українська',
    contacts: 'contacts', all: 'All', today: 'Today', quickPick: 'Quick select', power: 'TX power (W)',
    fieldNotes: 'Field notes', notesHint: 'Write Markdown and add one ```mermaid block for a station diagram.',
    notePlaceholder: '# Activation notes\n\nConditions, antenna setup, observations…', preview: 'Preview', autosaved: 'Saved automatically',
    diagramError: 'The Mermaid diagram could not be rendered'
  },
  uk: {
    appName: 'Signal & Radio Log', newQso: 'Нове QSO', logbook: 'Журнал', notes: 'Нотатки', settings: 'Станція',
    call: 'Позивний', callHint: 'Введіть позивний', band: 'Діапазон', frequency: 'Частота (МГц)', mode: 'Режим',
    rstSent: 'RST передано', rstRcvd: 'RST отримано', utcDate: 'Дата (UTC)', utcTime: 'Час (UTC)',
    optional: 'Більше деталей', name: "Ім’я оператора", qth: 'QTH', grid: 'Локатор', comment: 'Коментар',
    saveQso: 'Зберегти QSO', updateQso: 'Оновити QSO', cancel: 'Скасувати', saved: 'QSO збережено',
    requiredCall: 'Спочатку введіть позивний', recent: 'Останні зв’язки', search: 'Пошук за позивним, QTH, діапазоном або режимом',
    noQso: 'У журналі ще немає зв’язків', edit: 'Змінити', remove: 'Видалити', confirmDelete: 'Видалити це QSO?',
    importAdif: 'Імпорт ADIF', exportAdif: 'Експорт ADIF', imported: 'контактів імпортовано',
    importError: 'Не вдалося імпортувати цей ADIF-файл', exported: 'ADIF експортовано',
    stationProfile: 'Профіль станції', myCall: 'Мій позивний', operator: 'Оператор', myGrid: 'Мій локатор',
    defaultBand: 'Типовий діапазон', defaultMode: 'Типовий режим', defaultPower: 'Потужність (Вт)', language: 'Мова',
    saveProfile: 'Зберегти профіль', profileSaved: 'Профіль станції збережено', english: 'English', ukrainian: 'Українська',
    contacts: 'контактів', all: 'Усі', today: 'Сьогодні', quickPick: 'Швидкий вибір', power: 'Потужність TX (Вт)',
    fieldNotes: 'Польові нотатки', notesHint: 'Пишіть у Markdown і додайте один блок ```mermaid для схеми станції.',
    notePlaceholder: '# Нотатки активації\n\nУмови, антена, спостереження…', preview: 'Перегляд', autosaved: 'Зберігається автоматично',
    diagramError: 'Не вдалося побудувати Mermaid-схему'
  }
} as const;

export type MessageKey = keyof typeof messages.en;
export function translate(language: Language, key: MessageKey): string {
  return messages[language][key];
}
