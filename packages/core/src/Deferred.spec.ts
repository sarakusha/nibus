import Deferred from './Deferred';

describe('Deferred', () => {
  test('resolve', async () => {
    const deferred = new Deferred<true>();
    setTimeout(() => deferred.resolve(true), 0);
    expect(await deferred.promise).toBe(true);
  });
  test('reject', async () => {
    const deferred = new Deferred();
    setTimeout(() => deferred.reject(new Error('abort')));
    await expect(deferred.promise).rejects.toThrow('abort');
  });
})
