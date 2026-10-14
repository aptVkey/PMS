/**
 * Cria um utilizador no Supabase Auth e o respetivo registo em `staff`
 * com todas as permissões.
 *
 *   node --env-file=.env.local scripts/create-user.mjs <email> [nome]
 *
 * A password é pedida de forma interativa (não fica no histórico da shell
 * nem em ficheiro nenhum).
 */
import { createClient } from "@supabase/supabase-js";
import { PERMISSION_KEYS } from "../src/lib/staff.ts";
import readline from "node:readline";

const [email, nameArg] = process.argv.slice(2);

if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/create-user.mjs <email> [nome]");
  process.exit(1);
}

const name = nameArg ?? email.split("@")[0];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).");
  process.exit(1);
}

function promptPassword(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(question);
    rl.output.write = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await promptPassword(`Password para ${email}: `);

if (password.length < 6) {
  console.error("A password tem de ter pelo menos 6 caracteres.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error(`Falhou a criação do utilizador: ${error.message}`);
  process.exit(1);
}

const { error: staffError } = await supabase.from("staff").upsert(
  {
    id: data.user.id,
    name,
    email,
    role_label: "Administrador",
    permissions: [...PERMISSION_KEYS],
    active: true,
  },
  { onConflict: "id" },
);

if (staffError) {
  console.error(`Utilizador criado (${data.user.id}) mas falhou o registo em staff: ${staffError.message}`);
  process.exit(1);
}

console.log(`✓ Utilizador ${email} criado (${data.user.id}) com todas as permissões.`);
