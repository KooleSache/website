---
layout: page.html
title: Frequently Asked Questions
slug: F.A.Q.
permalink: /faq/
---

## Why ColorSnapper isn't available on the Mac App Store anymore?

Unfortunately, we had to remove the Mac App Store version after Apple decided to block any further updates all of the sudden (we didn't change  how the application works but they claim that we're using their Screen Recording API inappropriately). Please [contact us](mailto@support@koolesache.com) with a copy of your MAS invoice we'll email you a coupon code to upgrade to the latest version. 

## What should I do if I reached maximum amount of activations

If you're planning to intsall ColorSnapper on a new computer, please deactivate it on the previous machine prior. If you can't do this anymore, please [email us](mailto@support@koolesache.com) details of your order (order ID and your email) and we'll deactivate previous installations for you.  

## ColorSnapper v2 showing only colors from the background on macOS 10.15 Catalina

In macOS 10.15 Apple added additional privacy permissions. In order for
ColorSnapper to work properly it needs to be given the "Screen Recording"
permission. You can do this in:

System Preferences → Security & Privacy → Screen Recording

## ColorSnapper v1 is lagging on OS X 10.11 El Capitain

ColorSnapper 1 was released back in 2011 and supported for 5 different OS X
versions. With the release of ColorSnapper 2 in beginning of 2015 (at that time
mac OS "El Capitan" wasn't even announced) we stopped development and support
for the ColorSnapper 1.

The release of the macOS 10.12 "El Capitan" later that year introduced a new
rendering engine — [Metal](https://developer.apple.com/metal/). It brought
performance improvements for some applications but, unfortunately, made
ColorSnapper 1 rendering slow.

In order to fix those issues we would need to make significant changes to the
codebase of ColorSnapper 1. This means ColorSnapper 1 will no longer receive
updates or bug fixes.

You can try ColorSnapper 2 for 14 days for free — it’s faster and better in
every way.

## Picking from Adobe Photoshop or Illustrator results in wrong colors

ColorSnapper detects the color profile and automatically converts colors to sRGB
to ensure consistent RGB values between your display and your code. To do that,
ColorSnapper 2 uses color profile defined in System Preferences. But since Adobe
software has a custom color management, ColorSnapper doesn’t know anything about
it.

As a work around we suggest that you disable color management for the document
you're picking colors from in the Adobe software.

## How can I delete colors from history?

We believe there is no need to delete colors from the history, but if you still
want to do so for whatever reason, run this command in the Terminal.app:

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
