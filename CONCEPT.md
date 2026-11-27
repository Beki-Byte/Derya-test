# Konzept: „Von der Oberfläche in die Tiefe“

Derya Kılıç arbeitet mit dem Unterbewusstsein. Die Seite erzählt das räumlich:
oben ist es hell wie das Bewusstsein, beim Scrollen geht es Schicht für Schicht
„unter die Erde“ – die Startseite wird von Abschnitt zu Abschnitt dunkler, bis man
bei Bewertungen, Fragen und dem Termin im warmen Erdton ankommt. Eine feine
Wurzel-Linie am linken Rand wächst mit dem Scrollen mit (Computer).
Den Einstieg macht das Baum-Video (Samen → Baum → Wurzeln).

## Stimmung
ruhig · warm · tief · vertrauensvoll · erwachsen

## Farben
| Rolle | Farbe |
|---|---|
| Papier (hell, dominant oben) | `#F2ECE3` |
| Erde (dunkel, dominant unten) | `#1E1612` |
| Ton (Akzent, aus dem Logo-Braun) | `#9C6B4E` |
| Bernstein (Lichtpunkte, Sterne, Fokus) | `#C9975B` |
| Moos (kleine Details) | `#6F7A57` |

## Schrift
- **Fraunces** (variabel, mit Kursiv) für Überschriften – riesig, leicht, warm
- **Manrope** (variabel) für Text – ruhig und gut lesbar
Beide lokal in `fonts/`, inkl. türkischer Sonderzeichen.

## Bewegung
Ein Tempo für alles: `power3.out`, 0,9–1,2 s. Überschriften steigen Wort für Wort
aus einer Maske, das Zitat färbt sich beim Lesen Wort für Wort ein, die
Leistungen laufen am Computer als gepinnte horizontale Scroll-Geschichte.
Weiches Scrollen (Lenis), eigener Mauszeiger, magnetische Buttons,
sanfte Seitenübergänge.

## Szenen der Startseite
| Abschnitt | Szene | Antrieb | Budget | Fallback |
|---|---|---|---|---|
| Intro | Baum-Video als Einzelbilder | Scroll | ~10 MB, schrittweise geladen | ausgeblendet bei „Bewegung reduzieren“ |
| Hero | riesiger Name, Lilien, Lichtkugeln | Zeit + Maus | nur CSS/transform | statisch |
| Über mich | Zitat färbt sich Wort für Wort | Scroll | Text-Spans | sofort eingefärbt |
| Leistungen | Karten fahren horizontal durch | Scroll (gepinnt) | transform | Handy/Tablet: normales Raster |
| Ablauf / Preise | Ebenen gleiten, Zahlen | Scroll | transform/opacity | einfache Einblendung |
| FAQ, Bewertungen, Termin | dunkle „Tiefe“, Bernstein-Licht | Scroll | Farbe | gleich, ohne Animation |

## Geräte-Stufen (motion.js)
- **high** (Computer mit Maus): alles
- **mid** (Touch-Geräte): kein eigener Mauszeiger, keine Magnet-Buttons, kein Pinning, natives Scrollen
- **low** („Bewegung reduzieren“): keine Animationen, alles sofort sichtbar

Buchung, Portal, Zahlung und Assistent nutzen dasselbe Design, aber ohne
weiches Scrollen (damit Kalender, Dialoge und Chat sich normal bedienen lassen).
