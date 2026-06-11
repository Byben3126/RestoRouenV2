C'est un listener dans le users-service qui écoute les événements émis par le auth-service. Ça permet la communication asynchrone entre microservices.
Pourquoi le users-service écoute auth-service ?
Parce que certaines actions d'authentification nécessitent des modifications dans les données utilisateur.
Exemples de cas d'usage :

Password reset → Mettre à jour le user
Login failed → Incrémenter le compteur de tentatives échouées
Account locked → Marquer le user comme verrouillé
Email verified → Marquer l'email comme vérifié
Two-factor enabled → Mettre à jour les préférences de sécurité
