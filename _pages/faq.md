---
layout: page.html
title: Frequently Asked Questions
slug: F.A.Q.
permalink: /faq/
---

## ColorSnapper v1 is lagging on OS X 10.11 El Capitain

With the release of El Capitan Apple presented the new rendering engine [Metal](https://developer.apple.com/metal/). It brings performance improvements for applications but to take advantage of it, we would need to make significant changes to the codebase of ColorSnapper 1.

With the release of ColorSnapper 2 in beginning of 2015 we stopped development and support for ColorSnapper 1 (released back in 2011 and supported for 5 different OS X versions). At that time El Capitan wasn't even announced. 

This means ColorSnapper 1 will no longer receive updates or bug fixes. You can try ColorSnapper 2 for 14 days for free — it’s faster and better in every way.

## Picking from Adobe Photoshop or Illustrator results in wrong colors

ColorSnapper detects the color profile and automatically converts colors to sRGB to ensure consistent RGB values between your display and your code. To do that, ColorSnapper 2 uses color profile defined in System Preferences. But since Adobe software has a custom color management, ColorSnapper doesn’t know anything about it.

As a work around we suggest that you disable color management for the document you're picking colors from in the Adobe software.

## How can I delete colors from history?

We believe there is no need to delete colors from the history, but if you still want to do so for whatever reason, run this command in the Terminal.app:

```
defaults delete com.koolesache.ColorSnapper2 HistoryColors
```

**Warning!** This will delete all history items and can not be undone.

## How can I hide ColorSnapper from the menu bar?

Run the following command in the Terminal.app and restart ColorSnapper.app:

```
defaults write com.koolesache.ColorSnapper2 showMenubarIcon false
```

**Warning!** This will make ColorSnapper accessible only via keyboard shortcuts.

