# Goal: piattaforma di giochi serali

## Risultato richiesto

Completare Studio TV come piattaforma italiana per giochi serali: roster coerenti con CPU on/off, difficolta configurabili, giochi esistenti affidabili e giochi da tavolo.

## Completato in questa sessione

- Il setup gestisce CPU, difficolta, rivali obbligatori e formati che richiedono un numero minimo di umani.
- Eredita richiede 7 concorrenti e Reazione a Catena 6: senza CPU sono tutti umani, con CPU i posti mancanti vengono completati.
- Monopoly e registrato nella lobby con tabellone da 40 caselle, proprieta, affitti, carte, GO, prigione, aste, case e hotel, ipoteche, liquidazione, bancarotta e scambi di base.
- Corretto il movimento delle carte Monopoly: salario GO e moltiplicatori della ferrovia/utenza, con mantenimento del tiro per gli affitti.
- Le aste hot-seat passano il dispositivo al giocatore prima di mostrare l'offerta.
- Forza 4 e registrato come gioco da tavolo per due umani oppure un umano contro CPU; rileva allineamenti orizzontali, verticali e diagonali.
- `npm test`: 9 test automatici passano, inclusi i casi principali per Monopoly e Forza 4.
- `npm run build`: build Vite riuscita.

## Da completare

- Smoke test interattivo nel browser: non eseguito perche le richieste HTTP ai socket locali sono state negate dall'ambiente.
- Verifica runtime di partite umane/CPU, layout responsive e flussi Monopoly (debiti, scambi, aste, carte).
- Prova end-to-end degli 11 giochi della lobby; la build e i test delle regole non verificano il gameplay.
- Aggiungere altri giochi da tavolo se desiderato dopo il collaudo runtime.

## Stato

Nessun commit. Per dettagli e limiti consultare `docs/HANDOFF_CODEX.md`.
