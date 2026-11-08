import { GooglePlacesService, distanceInMeters } from './google-places.service';

describe('GooglePlacesService', () => {
  const position = { lat: 49.4431, lng: 1.0993 };
  const service = new GooglePlacesService();
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  /** Réponse Google avec un candidat décalé de `offsetLat` degrés de latitude */
  const answer = (body: object) =>
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(body) } as Response);
  const candidate = (offsetLat: number) => ({
    status: 'OK',
    candidates: [
      {
        place_id: 'place-1',
        geometry: { location: { lat: position.lat + offsetLat, lng: position.lng } },
      },
    ],
  });

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'key';
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    delete process.env.GOOGLE_API_KEY;
    fetchMock.mockRestore();
  });

  it('measures distances in meters', () => {
    // 0,0001° de latitude ≈ 11 m
    expect(
      distanceInMeters(position, { lat: position.lat + 0.0001, lng: position.lng }),
    ).toBeCloseTo(11.1, 0);
  });

  it('returns the place id of a place within 50 m', async () => {
    answer(candidate(0.0003));

    await expect(service.findPlaceId('Chez Momo', position)).resolves.toBe('place-1');
    const url = new URL(fetchMock.mock.calls[0][0] as URL);
    expect(url.searchParams.get('input')).toBe('Chez Momo');
    expect(url.searchParams.get('locationbias')).toBe('circle:50@49.4431,1.0993');
  });

  it('ignores a place farther than 50 m', async () => {
    answer(candidate(0.001));

    await expect(service.findPlaceId('Chez Momo', position)).resolves.toBeNull();
  });

  it('returns null without result', async () => {
    answer({ status: 'ZERO_RESULTS', candidates: [] });

    await expect(service.findPlaceId('Chez Momo', position)).resolves.toBeNull();
  });

  it('returns null when Google is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));

    await expect(service.findPlaceId('Chez Momo', position)).resolves.toBeNull();
  });

  it('does not call Google without API key', async () => {
    delete process.env.GOOGLE_API_KEY;

    await expect(service.findPlaceId('Chez Momo', position)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
