# Ricerca e memoria web - 2.18

Scrivere `Impara dal web: argomento` oppure usare `Ricerca e memoria web`.
La ricerca raccoglie fino a quattro estratti con URL e data tramite Jina, gia configurato. Con un progetto selezionato conserva un documento JSON nella libreria di quel progetto; senza progetto restituisce soltanto il risultato. Ripetere lo stesso argomento riutilizza la ricerca per sette giorni. Le vecchie registrazioni restano conservate.

L'esecutore collegato dispone anche di `web.research {query}`: puo scegliere di cercare documentazione durante un incarico. Il pianificatore recupera fino a due ricerche recenti pertinenti dal progetto. Una procedura trovata online resta `not_tested` finche non esistono prove reali: questi record non modificano i pesi del modello, non installano programmi e non diventano istruzioni di sistema. Un estratto di ricerca non prova che sia stata letta tutta la pagina, ne che la fonte sia ufficiale o corretta.

La richiesta di ricerca viene trasmessa a Jina. Non inserirvi credenziali o dati riservati. Non vengono registrati nuovi Secrets, create tabelle, eliminate configurazioni o ampliate le autorizzazioni dell'esecutore Windows.

Il controllo attuale del PC resta limitato alle capacita dichiarate dall'esecutore collegato: file nella cartella dedicata, verifiche di sintassi/JSON, test e anteprime offline nel browser, lettura/screenshot dei siti consentiti se il browser opzionale e attivo. Non e controllo completo di Windows, delle sessioni personali o delle applicazioni native.

Verifiche ripetibili: `node verify-web-learning.cjs`, `node verify-executor.cjs`, `node verify-graphics.cjs`. Verificare separatamente sul sito ricerca, salvataggio, riutilizzo dopo ricaricamento e comportamento in errore.
