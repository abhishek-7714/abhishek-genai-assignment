import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, ERROR_COPY, toApiError } from "@/lib/errors";
import { errMessage, log } from "./log";

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler so every failure becomes a friendly, coded JSON error. */
export function route<C>(name: string, fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof AppError) {
        if (e.code === "supabase_unavailable") log("db.error", { route: name, message: e.internal });
        return NextResponse.json(toApiError(e.code), { status: ERROR_COPY[e.code].status });
      }
      log("api.unhandled", { route: name, message: errMessage(e) });
      return NextResponse.json(toApiError("unknown"), { status: 500 });
    }
  };
}

export async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new AppError("invalid_input", "bad json");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new AppError("invalid_input", parsed.error.issues[0]?.message);
  return parsed.data;
}

/** Throws a typed error for a failed Supabase call. */
export function dbOk<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new AppError("supabase_unavailable", res.error.message);
  return res.data;
}

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
