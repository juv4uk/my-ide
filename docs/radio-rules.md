# Radio Rules 0.1

**English · [Українська](#українська) · [Deutsch](#deutsch)**

Radio Rules is a tiny Lisp-like language for local QSO automation. It is intentionally not a general-purpose Lisp: programs cannot read files, use the network, launch processes, call Tauri commands, or modify a QSO directly. They receive a fixed QSO snapshot and return suggested tags and notes.

```lisp
; Mark a low-power CW contact on 20 metres.
(rule "QRPp on 20M"
  (when (and (= band "20M")
             (= mode "CW")
             (< tx-power-mw 1000))
    (tag "QRPp")
    (note "Low-power CW contact")))
```

Available fields: `call`, `band`, `mode`, `tx-power-mw`, `rst-sent`, `rst-received`.

Conditions: `and`, `or`, `not`, `=`, `!=`, `<`, `<=`, `>`, `>=`.

Actions: `(tag "text")` and `(note "text")`.

The evaluator reports `syntax`, `validation`, `type`, or `limit` errors with line and column numbers. Source size, token count, nesting depth, rule count, action count, and output length are limited.

## Українська

Radio Rules — маленька Lisp-подібна мова для локальної автоматизації QSO. Це навмисно не повний Lisp: правила не читають файли, не використовують мережу, не запускають процеси, не викликають довільні Tauri-команди й не змінюють QSO напряму. Вони отримують незмінний знімок зв’язку та повертають лише запропоновані теги й нотатки.

Доступні поля: `call`, `band`, `mode`, `tx-power-mw`, `rst-sent`, `rst-received`.

Умови: `and`, `or`, `not`, `=`, `!=`, `<`, `<=`, `>`, `>=`.

Дії: `(tag "текст")` і `(note "текст")`.

Помилка містить тип, рядок і стовпець. Розмір коду, кількість токенів, глибина вкладення, кількість правил, дій та довжина результату обмежені.

## Deutsch

Radio Rules ist eine kleine Lisp-ähnliche Sprache für lokale QSO-Automatisierung. Sie ist absichtlich kein vollständiges Lisp: Regeln können keine Dateien lesen, kein Netzwerk verwenden, keine Prozesse starten, keine beliebigen Tauri-Befehle aufrufen und ein QSO nicht direkt verändern. Sie erhalten einen unveränderlichen QSO-Schnappschuss und liefern nur vorgeschlagene Tags und Notizen zurück.

Verfügbare Felder: `call`, `band`, `mode`, `tx-power-mw`, `rst-sent`, `rst-received`.

Bedingungen: `and`, `or`, `not`, `=`, `!=`, `<`, `<=`, `>`, `>=`.

Aktionen: `(tag "Text")` und `(note "Text")`.

Fehler enthalten Typ, Zeile und Spalte. Quellgröße, Tokenanzahl, Verschachtelungstiefe, Anzahl der Regeln und Aktionen sowie die Ausgabelänge sind begrenzt.
