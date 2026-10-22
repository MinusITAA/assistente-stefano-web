# Laboratorio 2.15

Nuovi strumenti disponibili nel sito dopo il caricamento della versione 2.15, senza sostituire l'esecutore locale 0.1.0.

- `javascript.test`: legge i file .js/.cjs dalla cartella dell'esecutore, verifica SHA256 e li esegue in un Worker dentro un iframe con origine opaca. Massimo 10 file, 200.000 caratteri e 3 secondi. Il risultato contiene test riusciti/falliti, errori, runtime e hash dei sorgenti.
- Runtime JavaScript del browser con sottoinsieme CommonJS. Supporta require relativo ai file forniti, `node:test` (test/it) e `node:assert/strict` (equal, deepEqual, throws, rejects, ok). Non è Node.js completo: niente fs, process, dipendenze npm, moduli ES, Python o rete.
- `preview.open/read/fill/click`: HTML locale autonomo, renderizzato in iframe isolato. Lettura controlli, compilazione e click con verifica del DOM risultante. Non agisce su siti esterni o account autenticati.
- L'iframe non concede same-origin, form, popup, download o navigazione della pagina principale. CSP blocca rete, frame esterni e risorse remote. Il Worker viene terminato allo scadere del tempo. Non usare l'anteprima per codice ostile o contenuti che richiedono accesso a servizi esterni.
- Nessuna nuova chiave, password, permesso del PC o modifica del programma locale. La sessione dell'esecutore rimane in memoria: ricaricare il sito richiede un nuovo abbinamento e quindi riavviare il programma locale monouso.

Pulsante `Prova test e anteprima`: collaudo indipendente dal collegamento locale. Deve mostrare due test riusciti sulla somma, fallimenti sulla versione difettosa, arresto del ciclo infinito, blocco dei moduli Node e della rete, compilazione Nome e click che produce `Ciao Stefano`.

Verifiche automatiche: `node verify-lab.cjs` controlla il caricamento CommonJS, risultati positivi/negativi e assert; il pulsante del sito verifica Worker, CSP, timeout e DOM nel browser reale. Il rapporto JSON è scaricabile. Gli esiti non dimostrano assenza di difetti o sicurezza totale.
# Aggiornamento 2.15.1

Le asserzioni su eccezioni e Promise verificano anche il tipo atteso e riconoscono valori lanciati come `null` o `0`. I confronti profondi di tipi non supportati (ad esempio Map e Set) e i criteri di eccezione non supportati falliscono esplicitamente, evitando risultati positivi ingannevoli. Il collaudo del laboratorio include questi casi e funziona senza provider AI.

