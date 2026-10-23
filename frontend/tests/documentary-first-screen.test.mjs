import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../src/"+name,import.meta.url),"utf8");
const css=read("documentary.css");
const story=read("DocumentaryStory.tsx");

test("opening fits above chapter numbers below the existing sticky header",()=>{
  assert.match(css,/\.documentary-opening\s*\{\s*height:min\(760px,calc\(100svh - var\(--wl-topbar-height,76px\) - 64px\)\);/s);
  assert.match(css,/\.documentary-opening\s*\{[^}]*min-height:0;/s);
  assert.match(css,/\.documentary-minimap\{[^}]*min-height:60px;/s);
});

test("mobile opening remains content-sized rather than clipped",()=>{
  assert.match(css,/@media\(max-width:740px\)/);
  assert.match(css,/\.documentary-opening\s*\{\s*height:auto;\s*min-height:calc\(100svh - var\(--wl-topbar-height,72px\) - 58px\)/s);
});

test("original image, chapter navigation, chapters and quiz stay intact",()=>{
  assert.match(story,/className="documentary-opening"/);
  assert.match(story,/className="documentary-minimap"/);
  assert.match(story,/chapters\.map\(/);
  assert.match(story,/className="documentary-explore"/);
  assert.match(css,/\.documentary-opening-credit\{/);
  assert.match(css,/\.documentary-chapter\{/);
  assert.match(css,/\.documentary-final\{/);
});
