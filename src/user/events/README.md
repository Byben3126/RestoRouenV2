Un event est un message qui annonce qu'une action s'est produite dans ton système. C'est du passé : "Un utilisateur A ÉTÉ créé", pas "Crée un utilisateur".

Le service users ne sait RIEN de ce qui se passe après ! Il annonce juste : "Un user a été créé, faites-en ce que vous voulez".

const user = await this.usersRepository.create(dto);

    // 2. Émettre l'événement
    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.createdAt,
      )
    );

TODO: clement relire claude au sujet des events
