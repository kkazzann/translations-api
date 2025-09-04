import { Elysia } from "elysia";
import { performance } from "perf_hooks";

type RequestCtx = any;

export abstract class Endpoint<T = any> {
  constructor(
    public path: string,
    public method: "get" | "post" | "put" | "delete" = "get",
  ) {}

  register(app: Elysia) {
    (app as any)[this.method](this.path, this.handler.bind(this));
    return app;
  }

  private async handler(request: RequestCtx) {
    const start = performance.now();
    try {
      const data = await this.loader(request);
      return this.resolveSuccess(request, data, start);
    } catch (err) {
      return this.resolveError(request, err, start);
    }
  }

  protected abstract loader(request: RequestCtx): Promise<T | null | undefined>;

  protected resolveSuccess(
    request: RequestCtx,
    data: T | null | undefined,
    start: number,
  ) {
    const msg = this.successMessage(request, data);
    const status = this.successStatus(request, data);
    return (
      (request as any).success?.(data, msg, status, start) ?? {
        status,
        message: msg,
        data,
        execTime: `${(performance.now() - start).toFixed(2)}ms`,
      }
    );
  }

  protected resolveError(request: RequestCtx, err: any, start: number) {
    const msg = err?.message ?? "Internal error";
    const status = this.errorStatus(request, err);
    return (
      (request as any).fail?.(msg, status, start) ?? {
        status,
        message: "Internal server error",
        error: msg,
        execTime: `${(performance.now() - start).toFixed(2)}ms`,
      }
    );
  }

  protected successMessage(
    _request: RequestCtx,
    _data: T | null | undefined,
  ): string {
    return "Success";
  }
  protected successStatus(
    _request: RequestCtx,
    _data: T | null | undefined,
  ): number {
    return 200;
  }
  protected errorStatus(_request: RequestCtx, _err: any): number {
    return 500;
  }
}
