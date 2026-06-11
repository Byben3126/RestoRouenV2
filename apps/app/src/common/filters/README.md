//http-exception.filter.ts

C'est le service de contrôle qualité qui intercepte toutes les erreurs avant qu'elles n'arrivent au client, les formate proprement, et les log correctement

Une exception filter est un intercepteur global qui attrape TOUTES les exceptions de ton application et les transforme en réponses HTTP formatées et cohérentes.

//rcp-exception.filter.ts
on peux aussi filtrer les exeption rcp
