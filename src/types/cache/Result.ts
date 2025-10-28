export interface Result<T> {
  code?: number;
  message?: string;
  data?: T;
  error?: string;
  details?: string;
  dataOrigin?: 'cache' | 'googleAPI';
  executionTime?: number;
}
