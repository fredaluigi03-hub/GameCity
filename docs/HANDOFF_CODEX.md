# Handoff Codex: Studio TV

Repository: `C:\Users\Luisl\Documents\STEAL APPS\studio-tv` (Vite, Three.js, interfaccia italiana).

## Verificato

- `npm test`: 9 test automatici passati per regole Monopoly e Forza 4.
- `npm run build`: compilazione Vite riuscita. Vite segnala un bundle JavaScript oltre 500 kB.
- Non e stato possibile fare uno smoke test browser in questa sessione: l'ambiente ha negato le richieste HTTP ai socket locali.
- Nessun commit.

## Implementato

- Monopoly e registrato nella lobby e include tabellone classico da 40 caselle, proprieta e affitti, ferrovie, utenze, tasse, carte Chance/Community Chest, GO, prigione, doppi, aste, case e hotel con scorte, ipoteche, liquidazione, bancarotta e scambi hot-seat/CPU.
- Corretto il calcolo delle carte che portano alla ferrovia o all'utenza piu vicina: il tiro originale e usato per l'affitto delle utenze e si applica il moltiplicatore della carta. Le carte di movimento raccolgono il salario GO.
- Le aste hot-seat mostrano l'offerta solo dopo il passaggio del dispositivo al giocatore.
- Forza 4 e registrato come secondo gioco da tavolo, con partite per due umani o contro CPU, mosse valide e rilevamento delle vittorie in tutte le direzioni.
- Il setup usa `players.cpuRequiredBelow`: Eredita richiede 7 concorrenti e Reazione a Catena 6; senza CPU sono tutti umani, con CPU i posti mancanti vengono completati.
- Calcolo Lampo e Caduta Libera prevedono roster piu ampi con CPU; sono giochi a rivalita e in solitaria viene aggiunto un rivale CPU.
- `docs/INFRA.md` documenta `players.cpuRequiredBelow`.
- `tests/monopoly-rules.test.js` verifica tabellone, affitti, costruzione/vendita, ipoteche e movimento delle carte.
- `tests/forza4-rules.test.js` verifica caduta delle pedine, colonne piene, vittorie orizzontali/verticali/diagonali e simulazione di una mossa vincente.

## Limiti ancora aperti

- Non testati in browser i flussi di partita, il layout mobile, le aste, gli scambi, le carte e le interazioni CPU.
- Gli altri nove giochi preesistenti non hanno test end-to-end; una build valida non prova il gameplay.
- Gli scambi Monopoly coprono un asset per parte e denaro, senza il pannello avanzato delle edizioni fisiche.
- Il patrimonio finale e una stima; la partita termina normalmente quando rimane un solo giocatore solvibile.
- Sono presenti due giochi da tavolo, Monopoly e Forza 4; altri possono essere aggiunti dopo il collaudo runtime.

## Prossimi passi

1. Avviare `npm run dev` in un ambiente con accesso al browser e verificare lobby, configurazione CPU e Monopoly con due umani e con CPU.
2. Provare Forza 4 con due umani e contro CPU, inclusi pareggio e vittorie in tutte le direzioni.
3. Provare aste, carte, ipoteche, scambi, bancarotta e layout mobile di Monopoly; correggere i difetti riproducibili.
4. Smoke-testare gli altri giochi ai roster ammessi, con CPU accesa e spenta dove previsto.
5. Aggiornare `docs/STATO_GOAL.md` e questo handoff dopo le verifiche runtime.

## Preferenze utente

- Rispondere in italiano e procedere autonomamente sulle normali modifiche.
- Non creare commit senza richiesta.
