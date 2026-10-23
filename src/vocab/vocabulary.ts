// La liste de vocabulaire est le fichier vocabulaire.tsv (à côté de celui-ci),
// incluse dans l'appli au moment de la construction : elle marche hors ligne.
import raw from './vocabulaire.tsv?raw'
import { parseVocabulary } from './parse'

export const VOCABULARY = parseVocabulary(raw)
