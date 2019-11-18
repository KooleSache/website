---
layout: page.html
title: Frequently Asked Questions
slug: F.A.Q.
permalink: /faq/
---

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

## How can I add a custom format?

ColorSnapper doesn't have UI for custom formats since we belive this is a very
advanced feature.

That being said, you still can add custom formats to ColorSnapper 2.

Here is an example of how to add NVidia MDL format.

1. Run following command in the Terminal.app:

```
defaults write com.koolesache.ColorSnapper2 customFormats \
'(
{
 colorProfile = srgb;
 displayFormat = "{{decimalRGBA(color,3,space)}}";
 exportFormat = "color({{decimalRGBA(color,3)}})";
 group = opengl;
 name = "NVidia MDL";
}
)'
```

2. Restart ColorSnapper.app.

Custom formats are an array of hash objects so please don't forget to enclose
the array in single quotes.

If you have to change an existing custom format you can read defined formats
with the following command:

```
defaults read com.koolesache.ColorSnapper2 customFormats
```

**Hint:** You can investigate the `ExportFormats.plist` file in the application
package to find all standard formats definitions.
