---
layout: page.html
title: Frequently Asked Questions
slug: F.A.Q.
permalink: /faq/
---

1. [ColorSnapper v1 is lagging on OS X 10.11 El Capitain](#colorsnapper-v1-is-lagging-on-os-x-1011-el-capitain)
1. [Picking from Adobe Photoshop or Illustrator results in wrong colors](#picking-from-adobe-photoshop-or-illustrator-results-in-wrong-colors)
1. [How can I delete colors from history](#how-can-i-delete-colors-from-history)

## ColorSnapper v1 is lagging on OS X 10.11 El Capitain

**We stopped supporting ColorSnapper 1 with the release of [ColorSnapper 2](/) in the beginning of 2015. You can try ColorSnapper 2 for 14 days for free — it’s faster and better in every way.**

The issue you are seeing is due to the fact that apple brings massive changes to the way the graphics rendering on the Mac works with El Capitan (Metal). It brings huge performance improvements for users. At the same time this required significant changes for the old codebase of ColorSnapper 1, which we released back in 2011 and supported for 5 different OSX versions.

## Picking from Adobe Photoshop or Illustrator results in wrong colors

ColorSnapper detects the monitor color profiles and converts to sRGB automatically to ensure consistent colors between display and your code. To do that, ColorSnapper 2 uses monitor color profile defined in System Preferences but it does not know anything about Adobe software, which has a custom color management.

**Please make sure you disable color management for the document you're picking color from.**

## How can I delete colors from history

We believe there is no need to delete colors from the history. It is a history after all. But if you still want to remove colors from the history for whatever reason, you could run this command in Terminal.app:

```
defaults delete com.koolesache.ColorSnapper2 HistoryColors
```

**Warning! This will delete all history items and it is not undoable.**

