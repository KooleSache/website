---
layout: page
title: Frequently Asked Questions
slug: F.A.Q.
permalink: /faq/
---

## ColorSnapper v1 is lagging on OS X 10.11 El Capitain

**This is a known issue with ColorSnapper v1, which we stopped supporting with the release of ColorSnapper 2 beginning of 2015.**

The issue you are seeing is due to the fact that apple brings massive changes to the way the graphics rendering on the Mac works with El Capitan (Metal). It brings huge performance improvements for users. At the same time this required significant changes, which were too much for the old codebase of ColorSnapper 1, which was released back in 2011 and had support for 5 different OSX versions.

## Picking from Adobe Photoshop or Illustrator results in wrong colors

ColorSnapper detects the monitor color profiles and converts to sRGB automatically to ensure consistent colors between display and your code. To do that, ColorSnapper 2 uses monitor color profile defined in System Preferences but it does not know anything about Adobe software, which has a custom color management.

**Please make sure you disable color management for the document you're picking color from.**

