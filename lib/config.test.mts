import { test } from "node:test";
import assert from "node:assert/strict";
import { imageUrl, IMAGE_BASE } from "./config.ts";

test("imageUrl prefixes a bare API filename with the image base", () => {
  assert.equal(imageUrl("abc.jpg"), `${IMAGE_BASE}/abc.jpg`);
});

test("imageUrl passes absolute URLs through untouched", () => {
  for (const url of ["http://a.test/x.jpg", "https://a.test/x.jpg"]) {
    assert.equal(imageUrl(url), url);
  }
});

test("imageUrl is blank for missing input so <img> gets no src", () => {
  assert.equal(imageUrl(""), "");
  assert.equal(imageUrl(), "");
  assert.equal(imageUrl(null), "");
});

test("IMAGE_BASE has no trailing slash to double up on", () => {
  assert.ok(!IMAGE_BASE.endsWith("/"), IMAGE_BASE);
});
