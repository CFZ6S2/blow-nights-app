import { trace, type PerformanceTrace } from 'firebase/performance';
import { perf } from './firebase';

/**
 * Wraps a promise in a Firebase Performance Trace.
 * @param {string} traceName - The name of the trace to record in Firebase Console
 * @param {Promise<T>} promiseFn - A function that returns the promise to measure
 * @returns {Promise<T>} The result of the promise
 */
export async function withTrace<T>(traceName: string, promiseFn: () => Promise<T>): Promise<T> {
  if (!perf) {
    return promiseFn();
  }
  
  const perfTrace = trace(perf, traceName);
  perfTrace.start();
  
  try {
    const result = await promiseFn();
    perfTrace.stop();
    return result;
  } catch (error) {
    // You could also record custom attributes here before stopping
    perfTrace.putAttribute('error', 'true');
    perfTrace.stop();
    throw error;
  }
}

/**
 * Starts a Firebase Performance Trace manually.
 * Remember to call .stop() on the returned trace.
 */
export function startTrace(traceName: string): PerformanceTrace | null {
  if (!perf) return null;
  const perfTrace = trace(perf, traceName);
  perfTrace.start();
  return perfTrace;
}
