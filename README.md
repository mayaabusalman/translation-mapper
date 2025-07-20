# Translation Mapper

Ever been reading through a template and you find a translation key that maps to some text, and then you have to search for that key in the app to find out what the text is?

In my experience, I felt that this gets a bit annoying when you're dealing with many translations, or if you have multiple translation files, and there are many similar translations under different nested keys.

I think this just piles up into minutes that you could've spent focusing on the actual logic flow instead of looking for text mappings.

If this rings a bell, install this extension and just CMD+click on a translation and find your way from a TS/JS/Handlebars file to the mapped translation text!

---

## Demo

![Translation Mapper](https://raw.githubusercontent.com/mayaabusalman/translation-mapper/main/images/translation-mapper.gif)

---

## ⚙️ Extension Settings

Some settings you can configure to make things run smoothly:

- `translationMapper.translationFilePaths`: Array that specifies the relative file path(s) where your translation file(s) are located.
  Defaults to `en-us.yaml`.

- `translationMapper.defaultLanguage`: Language code for the translation file(s). Defaults to `en-us`.

- `translationMapper.defaultTranslationFileExtension`: Extension of translation file(s). Defaults to `yaml`

---

## 🐞 Known Issues

None yet — but let me know if you face any.

---

## 📋 Release Notes

### 1.0.0
- Initial release of Translation Mapper.

---

## ✨ Enjoy!
