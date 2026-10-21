# Esecutore locale di Assistente Stefano

Stato: implementazione preparata, non attiva. L'attivazione amplia l'accesso dell'agente al PC e richiede un'approvazione specifica del proprietario. Non vengono cambiate chiavi, password o Secrets Supabase.

## Perimetro preparato

- Cartella: `workspace`, creata accanto al programma. Lettura e scrittura soltanto qui; copie delle versioni sostituite in `.history`.
- Controlli reali: parsing JSON e `node --check`, che controlla sintassi senza eseguire i file.
- Browser opzionale: contesto separato senza sessioni personali, sola apertura/lettura/screenshot su `https://minusitaa.github.io`. Nessun click, compilazione di moduli o login.
- Nessuna shell arbitraria, esecuzione Python, installazione automatica, push GitHub, deploy Supabase o trading.
- Servizio solo su `127.0.0.1:8787`, origine ammessa `https://minusitaa.github.io`, abbinamento monouso entro 5 minuti, massimo 5 tentativi, sessione di 60 minuti. Il token rimane in memoria nel browser.
- Il modello sceglie un passo alla volta usando i risultati reali. Limite 12 passi/5 minuti per richiesta. Il pulsante Ferma interrompe prima del passo successivo; un passo in corso può completarsi.
- Log locale solo di strumento, percorso, data ed esito. Non registra codice, contenuti o token. Il filtraggio credenziali è precauzionale e non garantisce di riconoscere ogni segreto: non copiare credenziali nella cartella.

## Avvio da effettuare dopo approvazione

Avvio semplice: doppio clic su `Start-Executor.cmd`. In alternativa, da PowerShell: `./Start-Executor.ps1` se la policy locale permette script. Non cambiare la policy di esecuzione per avviare il programma.
Nel sito aprire Esecutore locale, inserire personalmente il codice stampato dal programma e premere Collega esecutore. Non inviare il codice nella chat. Se il browser chiede accesso alla rete locale, verificare che la richiesta provenga dal sito di Assistente Stefano.

Per il browser opzionale installare il pacchetto ufficiale Playwright e Chromium (`npm install --save-exact playwright`, `npx playwright install chromium`), poi avviare `Start-Executor.ps1 -Browser`. Il browser resta non installato/non abilitato nella configurazione iniziale. Le pagine che richiedono CDN esterne o un login possono non funzionare nel perimetro corrente.

Arresto: Scollega nel sito e Ctrl+C nella console. Non è installato un servizio Windows né un avvio automatico. La pagina e il processo locale devono restare aperti.

## Verifiche

`node --test executor.test.mjs` e, dalla radice del repository, `node verify-executor.cjs`.

Provati realmente con file sintetici: scrittura e rilettura, backup, JSON valido/non valido, blocco traversal/percorsi assoluti/file nascosti, controllo sintassi JavaScript senza esecuzione. Autenticazione/origine/revoca provate sul gestore HTTP in memoria.

Limiti del collaudo: l'ambiente Codex corrente impedisce connessioni al socket locale e creazione di junction Windows. Il test junction è esplicitamente saltato. Trasporto browser↔servizio, browser Playwright e abbinamento sul PC reale NON ancora verificati. Non dichiarare l'esecutore operativo prima di quel collaudo. La cartella dedicata non è una VM: non usarla come sandbox per programmi ostili e non consentire ad altri processi di sostituirla con link mentre l'esecutore è attivo.

Fonti implementative: https://playwright.dev/docs/api/class-browsercontext e https://supabase.com/docs/guides/functions/secrets.
