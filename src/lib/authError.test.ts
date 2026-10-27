import assert from "node:assert/strict";
import test from "node:test";
import {
  classifySignInError,
  isAccountExistsError,
  isAuthHookTimeout,
  isWeakPasswordError,
} from "./authError.ts";

test("classifySignInError maps documented Supabase Auth codes", () => {
  assert.equal(
    classifySignInError({ code: "invalid_credentials" }),
    "invalidCredentials"
  );
  assert.equal(
    classifySignInError({ code: "email_not_confirmed" }),
    "emailNotConfirmed"
  );
  assert.equal(
    classifySignInError({ code: "over_request_rate_limit" }),
    "rateLimited"
  );
  assert.equal(classifySignInError({ code: "unexpected_failure" }), null);
});

test("sign-up classifiers prefer codes and retain legacy compatibility", () => {
  assert.equal(isAccountExistsError({ code: "user_already_exists" }), true);
  assert.equal(
    isAccountExistsError({ message: "User already registered" }),
    true
  );
  assert.equal(isWeakPasswordError({ code: "weak_password" }), true);
  assert.equal(
    isWeakPasswordError({
      message:
        "Password is known to be weak and easy to guess, please choose a different one.",
    }),
    true
  );
  assert.equal(isAuthHookTimeout({ code: "hook_timeout_after_retry" }), true);
});
