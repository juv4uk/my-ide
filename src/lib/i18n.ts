export type Language = 'en' | 'uk' | 'de';

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
    saveProfile: 'Save profile', profileSaved: 'Station profile saved', english: 'English', ukrainian: 'Українська', german: 'Deutsch',
    contacts: 'contacts', all: 'All', today: 'Today', quickPick: 'Quick select', power: 'TX power (W)',
    fieldNotes: 'Field notes', notesHint: 'Write Markdown and add one ```mermaid block for a station diagram.',
    notePlaceholder: '# Activation notes\n\nConditions, antenna setup, observations…', preview: 'Preview', autosaved: 'Saved automatically',
    diagramError: 'The Mermaid diagram could not be rendered', templates: 'Learning templates',
    templatesHint: 'Insert an example, compare its source with the preview, then adapt it.',
    basicNote: 'Basic note', qsoReport: 'QSO report', contactTable: 'Contact table', antennaTable: 'Antenna table',
    stationDiagram: 'Station diagram', templateAdded: 'Template inserted'
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
    saveProfile: 'Зберегти профіль', profileSaved: 'Профіль станції збережено', english: 'English', ukrainian: 'Українська', german: 'Deutsch',
    contacts: 'контактів', all: 'Усі', today: 'Сьогодні', quickPick: 'Швидкий вибір', power: 'Потужність TX (Вт)',
    fieldNotes: 'Польові нотатки', notesHint: 'Пишіть у Markdown і додайте один блок ```mermaid для схеми станції.',
    notePlaceholder: '# Нотатки активації\n\nУмови, антена, спостереження…', preview: 'Перегляд', autosaved: 'Зберігається автоматично',
    diagramError: 'Не вдалося побудувати Mermaid-схему', templates: 'Навчальні шаблони',
    templatesHint: 'Вставте приклад, порівняйте код із переглядом, а потім змінюйте його під себе.',
    basicNote: 'Проста нотатка', qsoReport: 'Звіт QSO', contactTable: 'Таблиця зв’язків', antennaTable: 'Таблиця антен',
    stationDiagram: 'Схема станції', templateAdded: 'Шаблон вставлено'
  },
  de: {
    appName: 'Signal & Radio Log', newQso: 'Neues QSO', logbook: 'Logbuch', notes: 'Notizen', settings: 'Station',
    call: 'Rufzeichen', callHint: 'Rufzeichen eingeben', band: 'Band', frequency: 'Frequenz (MHz)', mode: 'Betriebsart',
    rstSent: 'RST gesendet', rstRcvd: 'RST empfangen', utcDate: 'Datum (UTC)', utcTime: 'Zeit (UTC)',
    optional: 'Weitere Angaben', name: 'Name des Operators', qth: 'QTH', grid: 'Locator', comment: 'Kommentar',
    saveQso: 'QSO speichern', updateQso: 'QSO aktualisieren', cancel: 'Abbrechen', saved: 'QSO gespeichert',
    requiredCall: 'Bitte zuerst ein Rufzeichen eingeben', recent: 'Letzte Verbindungen',
    search: 'Nach Rufzeichen, QTH, Band oder Betriebsart suchen', noQso: 'Noch keine Verbindungen im Logbuch',
    edit: 'Bearbeiten', remove: 'Löschen', confirmDelete: 'Dieses QSO löschen?', importAdif: 'ADIF importieren',
    exportAdif: 'ADIF exportieren', imported: 'Kontakte importiert', importError: 'Diese ADIF-Datei konnte nicht importiert werden',
    exported: 'ADIF exportiert', stationProfile: 'Stationsprofil', myCall: 'Mein Rufzeichen', operator: 'Operator',
    myGrid: 'Mein Locator', defaultBand: 'Standardband', defaultMode: 'Standardbetriebsart', defaultPower: 'Leistung (W)',
    language: 'Sprache', saveProfile: 'Profil speichern', profileSaved: 'Stationsprofil gespeichert',
    english: 'English', ukrainian: 'Українська', german: 'Deutsch', contacts: 'Kontakte', all: 'Alle', today: 'Heute',
    quickPick: 'Schnellauswahl', power: 'Sendeleistung (W)', fieldNotes: 'Feldnotizen',
    notesHint: 'Markdown schreiben und einen ```mermaid-Block für das Stationsdiagramm hinzufügen.',
    notePlaceholder: '# Aktivierungsnotizen\n\nBedingungen, Antenne, Beobachtungen…', preview: 'Vorschau',
    autosaved: 'Wird automatisch gespeichert', diagramError: 'Das Mermaid-Diagramm konnte nicht dargestellt werden',
    templates: 'Lernvorlagen', templatesHint: 'Beispiel einfügen, Quelltext und Vorschau vergleichen und anschließend anpassen.',
    basicNote: 'Einfache Notiz', qsoReport: 'QSO-Bericht', contactTable: 'Kontakt-Tabelle', antennaTable: 'Antennen-Tabelle',
    stationDiagram: 'Stationsdiagramm', templateAdded: 'Vorlage eingefügt'
  }
} as const;

export type MessageKey = keyof typeof messages.en;
export function translate(language: Language, key: MessageKey): string {
  return messages[language][key];
}
