import { Elysia } from "elysia";

const START = Symbol("startTime");

type SuccessResponse<T = any> = {
  status: number;
  message: string;
  execTime: string;
  data: T;
};

type FailResponse = {
  status: number;
  message: string;
  execTime: string;
  error?: string | null;
};

export function withResponse(app: Elysia) {
  return app
    .derive((ctx) => {
      return {
        success: <T = any>(
          data: T,
          message?: string,
          status = 200,
          startTime?: number,
        ): SuccessResponse<T> => {
          const exec = startTime ? performance.now() - startTime : 0;

          const res: SuccessResponse<T> = {
            status,
            message: message ?? "Success",
            data,
            execTime: startTime ? `${exec.toFixed(2)}ms` : "0ms",
          };

          ctx.set.status = status;

          if (!startTime) {
            (ctx as any).onStop?.((detail: any) => {
              res.execTime = `${Math.round(detail?.elapsed ?? 0)}ms`;
            });
          }

          return res;
        },

        fail: (
          message?: string,
          status = 500,
          startTime?: number,
        ): FailResponse => {
          const exec = startTime ? performance.now() - startTime : 0;

          const res: FailResponse = {
            status,
            message: message ?? "An error occurred",
            error: message ?? "Unknown error",
            execTime: startTime ? `${exec.toFixed(2)}ms` : "0ms",
          };

          ctx.set.status = status;

          if (!startTime) {
            (ctx as any).onStop?.((detail: any) => {
              res.execTime = `${Math.round(detail?.elapsed ?? 0)}ms`;
            });
          }

          return res;
        },
      };
    })
    .onError((ctx) => {
      const res: FailResponse = {
        status: 500,
        message: "Internal server error",
        error: (ctx as any).error?.message ?? "Unknown error",
        execTime: "0ms",
      };

      ctx.set.status = 500;
      (ctx as any).onStop?.((detail: any) => {
        res.execTime = `${Math.round(detail?.elapsed ?? 0)}ms`;
      });

      return res;
    });
}
