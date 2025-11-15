# Artikel codefix – NH → LB

Kleine webtool om artikelcode van krant **NH** om te zetten naar **LB** volgens de mappingregels (versie 5).

## Gebruik (lokaal)

1. Download/clone de repo.
2. Open `index.html` in een browser.
3. Plak de NH-code in het bovenste tekstvak.
4. Klik op **"Van Noord-Holland naar Limburg"**.
5. De geconverteerde LB-code verschijnt in het tweede tekstvak.
6. Klik op **"Kopieer naar klembord"** om de output in je klembord te zetten.

## Deploy op Render via GitHub

1. Push deze map naar een GitHub-repository.
2. Ga naar Render en kies **New + Static Site**.
3. Koppel je GitHub-repo.
4. Build command: _leeg laten_ (of `echo "static"`).
5. Publish directory: `/` (root).
6. Deploy.

Render serveert dan je `index.html` als een simpele webapp.
