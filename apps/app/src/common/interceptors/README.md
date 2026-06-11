PERMET DE CREER DES SORTE DE MIDLEWARE

Exemple avec transform.interceptor.ts :

Les interceptors sont des modificateurs qui transforment les requêtes avant qu'elles arrivent dans ton code, ou les réponses après qu'elles sortent de ton code.

Filter = Gère les erreurs (quand ça se passe mal)
Interceptor = Transforme les données (quand tout va bien)

Sans interceptor

// Requête 1
{ "id": "123", "name": "John" }

// Requête 2
["user1", "user2", "user3"]

// Requête 3
"User created successfully"

Avec interceptor
{
"success": true,
"data": { "id": "123", "name": "John" },
"timestamp": "2026-02-18..."
}

// Requête 2
{
"success": true,
"data": ["user1", "user2", "user3"],
"timestamp": "2026-02-18..."
}

// Requête 3
{
"success": true,
"data": "User created successfully",
"timestamp": "2026-02-18..."
}
