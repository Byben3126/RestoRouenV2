import { pointsAddedMessage } from './points.messages';

const RESTAURANT = { id: 'resto-1', name: 'Le Bistrot' };

describe('pointsAddedMessage', () => {
  it('gives the points won, the restaurant and the new balance, in every language', () => {
    expect(pointsAddedMessage(50, 150, RESTAURANT)).toEqual({
      headings: {
        fr: '+50 points chez Le Bistrot !',
        en: '+50 points at Le Bistrot!',
        es: '¡+50 puntos en Le Bistrot!',
      },
      contents: {
        fr: 'Votre solde : 150 points.',
        en: 'Your balance: 150 points.',
        es: 'Tu saldo: 150 puntos.',
      },
      data: { type: 'points.added', restaurantId: 'resto-1' },
    });
  });

  it('writes "point" in the singular for a single point', () => {
    expect(pointsAddedMessage(1, 101, RESTAURANT).headings).toEqual({
      fr: '+1 point chez Le Bistrot !',
      en: '+1 point at Le Bistrot!',
      es: '¡+1 punto en Le Bistrot!',
    });
  });
});
