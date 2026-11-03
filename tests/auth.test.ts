import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { initialize, readAll } from "../src/database/db.ts";
import { setup, login, account, changeAccount } from "../src/services/auth.ts";
import { records } from "./secure-store-adapter.ts";

const password = "a long unique password";
beforeEach(async () => {
  records.clear();
  await initialize();
});
test("first-device account uses a salted hash and valid/invalid logins behave correctly", async () => {
  await setup("owner", password);
  const configured = await account();
  assert.equal(configured?.username, "owner");
  assert.equal(configured?.iterations, 600000);
  assert.equal(configured?.salt.length, 64);
  assert.equal(configured?.hash.includes(password), false);
  assert.equal(
    [...records.values()].some((v) => v.includes(password)),
    false,
  );
  assert.equal(await login("owner", password), "owner");
  await assert.rejects(login("owner", "incorrect password"), /incorrect/);
  const logs = (await readAll()).audits;
  assert.ok(logs.some((a) => a.action === "Login succeeded"));
  assert.ok(
    logs.some(
      (a) => a.action === "Login failed" && a.account === "(unauthenticated)",
    ),
  );
});
test("provisioning cannot create a second account and rejects weak credentials", async () => {
  await assert.rejects(setup("owner", "short"), /12/);
  await assert.rejects(setup("a", password), /3/);
  await setup("owner", password);
  await assert.rejects(setup("second", password), /already/);
});
test("five failed attempts lock sign-in persistently including a valid password", async () => {
  await setup("owner", password);
  for (let i = 0; i < 5; i++)
    await assert.rejects(login("owner", "wrong password"), /incorrect/);
  await assert.rejects(login("owner", password), /Too many/);
});
test("credential changes verify the current password and replace the sole account", async () => {
  await setup("owner", password);
  await assert.rejects(
    changeAccount("wrong", "updated", "replacement password"),
    /incorrect/,
  );
  await changeAccount(password, "updated", "replacement password");
  await assert.rejects(login("owner", password), /incorrect/);
  assert.equal(await login("updated", "replacement password"), "updated");
  assert.equal(records.size, 1);
});
