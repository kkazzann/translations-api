import { t } from 'elysia';

export const makeResponseSchema = (settings: {
  tags: string[];
  messages: {
    success_fetch: string;
    success_refresh: string;
    not_found: string;
    error: string;
  };
}) => ({
  tags: settings.tags,
  response: {
    200: t.Object({
      code: t.Literal(200),
      message: t.String(),
      executionTime: t.Numeric(),
      dataOrigin: t.Optional(t.String({ enum: ['cache', 'googleAPI'] })),
      data: t.Optional(t.Union([t.Array(t.Any()), t.Record(t.String(), t.Any())])),
    }),

    404: t.Object({
      code: t.Literal(404),
      message: t.Literal(settings.messages.not_found),
    }),

    500: t.Object({
      code: t.Literal(500),
      message: t.Literal(settings.messages.error),
    }),
  },
});
