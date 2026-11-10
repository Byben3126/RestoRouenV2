import { ratingRequestMessage } from './rating.messages';

const RESTAURANT = { id: 'resto-1', name: 'Le Bistrot' };

describe('ratingRequestMessage', () => {
  it('asks to rate the visit to the restaurant, in every language', () => {
    expect(ratingRequestMessage(RESTAURANT)).toEqual({
      headings: {
        fr: "Comment s'est passée votre visite chez Le Bistrot ?",
        en: 'How was your visit to Le Bistrot?',
        es: '¿Qué tal tu visita a Le Bistrot?',
      },
      contents: {
        fr: 'Donnez-lui une note en un geste.',
        en: 'Rate it in one tap.',
        es: 'Valóralo en un toque.',
      },
      data: { type: 'rating.request', restaurantId: 'resto-1' },
    });
  });
});
