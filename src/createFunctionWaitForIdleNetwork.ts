import Debug from 'debug';
import EventEmitter from 'events';

const debug = Debug('pdf-generator:createFunctionWaitForIdleNetwork');

export function createFunctionWaitForIdleNetwork(page) {
  class Emitter extends EventEmitter {}

  const pendingRequestIds = new Set();
  const emitter = new Emitter();

  function pushRequest(request) {
    pendingRequestIds.add(request._requestId);
    emitter.emit('active');
  }

  function popRequest(request) {
    pendingRequestIds.delete(request._requestId);
    if (pendingRequestIds.size === 0) {
      emitter.emit('idle');
    }
  }

  function emitFailed(request) {
    pendingRequestIds.delete(request._requestId);
    emitter.emit('fail');
  }

  page.on('request', pushRequest);
  page.on('requestfinished', popRequest);
  page.on('requestfailed', emitFailed);

  /**
   * Return a promise that will resolve when the network is idle.
   *
   * @param idleTimeout
   *   The minimum amount of time that the network must be idle before the promise will resolve.
   *
   * @param failTimeout
   *   The maximum amount of time to wait for the network to become idle before rejecting.
   */
  async function waitForIdleNetwork(idleTimeout = 1000, failTimeout = 30 * 1000) {
    debug('idleTimeout ', idleTimeout);
    debug('failTimeout ', failTimeout);
    let failTimer: NodeJS.Timeout;
    let idleTimer: NodeJS.Timeout;

    return new Promise<void>((resolve, reject) => {
      debug('waiting for idle network...');
      function fail() {
        reject(
          new Error(
            `After ${failTimeout}ms, there are still ${pendingRequestIds.size} pending network requests.`,
          ),
        );
      }

      function succeed() {
        clearTimeout(failTimer);
        resolve();
      }

      function failed() {
        clearTimeout(idleTimer);
        reject(
          new Error(
            `A network request has failed, there are still ${pendingRequestIds.size} pending network requests.`,
          ),
        );
      }

      // Start failure time immediately.
      failTimer = setTimeout(fail, failTimeout);

      const puppeteerWaitForTimeout =
        (process.env.PUPPETEER_WAITFOR_TIMEOUT &&
          parseInt(process.env.PUPPETEER_WAITFOR_TIMEOUT, 10)) ||
        1000;
      // Handle edge case where neither active nor idle is emitted during the lifetime of this promise.
      setTimeout(() => {
        if (pendingRequestIds.size === 0) {
          debug('after initialization, there are still no network requests');
          idleTimer = setTimeout(succeed, idleTimeout);
        }
      }, puppeteerWaitForTimeout);

      // Play a game of whack-a-mole with the idle and active events.
      emitter.on('idle', () => {
        idleTimer = setTimeout(succeed, idleTimeout);
      });
      emitter.on('active', () => {
        clearTimeout(idleTimer);
      });
      emitter.on('failed', failed);
    });
  }

  return waitForIdleNetwork;
}
