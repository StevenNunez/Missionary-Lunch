import { supabaseConfigurado } from "@/lib/supabase/client";
import type { Repo } from "@/lib/tipos";
import { repoLocal } from "./local";
import { repoSupabase } from "./supabase";

let repo: Repo | null = null;

/** Supabase si hay variables de entorno; si no, modo demo local. */
export function obtenerRepo(): Repo {
  repo ??= supabaseConfigurado ? repoSupabase() : repoLocal();
  return repo;
}
