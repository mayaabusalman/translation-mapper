const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const outputChannel = vscode.window.createOutputChannel('Translation Mapper');

function log(msg) {
    outputChannel.appendLine(`[Translation Mapper] ${msg}`);
}

// function getSettingsConfig() {
//     const config = vscode.workspace.getConfiguration('translationMapper');
//     return {
//         translationFilePaths: config.get('translationFilePaths'),
//         defaultLanguage: config.get('defaultLanguage'),
//         translationFileExtension: config.get('defaultTranslationFileExtension')
//     };
// }

function isValidKeyValueLine(line) {
	return /^[\s-]*[a-zA-Z0-9.&_"'\[\]{}-]+ *:/.test(line)
}

function findTranslationFiles(dir, pattern, found = []) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
	  const fullPath = path.join(dir, entry.name);

	  if (entry.isDirectory()) {
		findTranslationFiles(fullPath, pattern, found);
	  } else if (pattern.test(fullPath)) {
		found.push(fullPath);
	  }
	}

	return found;
}

let targetText;

function findTranslation(key) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
		return;
	}


	const basePath = workspaceFolders[0].uri.fsPath;
	const regex = /[/\\]translations[/\\]en-us\.yaml$/;
	const translationFiles = findTranslationFiles(basePath, regex);

	for (const translationFilePath of translationFiles) {
		log('Found translation file: ' + translationFilePath);

		if (!fs.existsSync(translationFilePath)) {
			return;
		}

		const fileContent = fs.readFileSync(translationFilePath, 'utf8');
		const extension = path.extname(translationFilePath);
  		const translationFileExtension = extension.replace(/^\./, '');
		const translations = translationFileExtension === 'yaml' ? yaml.load(fileContent) : JSON.parse(fileContent);

		const keys = key.split('.');
		const targetLineIndex = findLineForKey(translations, keys);

		if (targetLineIndex !== -1) {
			const fileContentLines = fileContent.split('\n');
			let linesToBeAdded = 0;

			for (let index = 0; index < fileContentLines.length; index++) {
				const line = fileContentLines[index];
				if ((index >= targetLineIndex) && line.includes(keys[keys.length - 1]) && line.includes(targetText)) {
					break;
				}
				if (!isValidKeyValueLine(line)) {
					linesToBeAdded++;
				}
			}

			const translationFile = vscode.Uri.file(translationFilePath);
			return new vscode.Location(translationFile, new vscode.Position(targetLineIndex + linesToBeAdded, 0));
		}
	}
}

const MARKED_TRANSLATION = 'Mark translation found here!!!!';

function findLineForKey(translations, keys) {
	const translationsWithMarkedMatch = findAndMarkTranslationValue(translations, keys);
	if (!translationsWithMarkedMatch) {
		return -1;
	}
	translations[keys[0]] = translationsWithMarkedMatch[keys[0]];
    const newYamlContent = yaml.dump(translations, { lineWidth: -1 });
	return newYamlContent.split('\n').findIndex(line => line.includes(MARKED_TRANSLATION));
}

function findAndMarkTranslationValue(translations, keys) {
	const updatedObject = {};
	const lastKey = keys[keys.length - 1];
    for (const k of keys) {
		if (k === lastKey && translations[k]) {
			targetText = translations[k];
			translations[k] = MARKED_TRANSLATION
		}
        translations = translations[k];
        if (!translations) {
			console.log('translation not found');
			return undefined;
		};
		if (k === keys[0]) {
			updatedObject[k] = translations;
		}
    }
	return updatedObject;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	outputChannel.show();
	log('Extension activated');
	const disposable = vscode.commands.registerCommand('translationMapper.findTranslation', function () {
		vscode.languages.registerDefinitionProvider([
			{ language: 'handlebars', scheme: 'file' },
			{ language: 'typescript', scheme: 'file' },
			{ language: 'javascript', scheme: 'file' }
		], {
			provideDefinition(document, position) {
				const range = document.getWordRangeAtPosition(position, /(["'])(.*?)\1/);
				if (!range) return;

				const text = document.getText(range).replace(/["']/g, '');
				return findTranslation(text);
			}
		});

	});

	context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
