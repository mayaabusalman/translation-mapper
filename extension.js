const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const outputChannel = vscode.window.createOutputChannel('Translation Mapper');

function log(msg) {
    outputChannel.appendLine(`[Translation Mapper] ${msg}`);
}

function getSettingsConfig() {
    const config = vscode.workspace.getConfiguration('translationMapper');
    return {
        translationFilePaths: config.get('translationFilePaths'),
        defaultLanguage: config.get('defaultLanguage'),
        translationFileExtension: config.get('defaultTranslationFileExtension')
    };
}

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
    const {
        translationFilePaths = [],
        defaultLanguage = 'en-us',
        translationFileExtension = 'yaml'
    } = getSettingsConfig();
    let translationFiles = [];

    if (translationFilePaths.length > 0) {
        translationFiles = translationFilePaths.map(relPath => path.join(basePath, relPath));
    } else {
        const fallbackRegex = new RegExp(
            `[\\/\\\\]translations[\\/\\\\]${defaultLanguage}\\.${translationFileExtension}$`
        );
        translationFiles = findTranslationFiles(basePath, fallbackRegex);
    }

	for (const translationFilePath of translationFiles) {
		log('Search translation file: ' + translationFilePath);

		if (!fs.existsSync(translationFilePath)) {
            log(`⚠️ File not found: ${translationFilePath}`);
			continue;
		}

        try {
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
        } catch (e) {
            log('Error file reading translation file: ' + e.message);
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
            log('Translation not found');
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
    try {
        outputChannel.show();
        log('🔁 Starting extension activation');

        const providerDisposable = vscode.languages.registerDefinitionProvider(
            [
                { language: 'handlebars', scheme: 'file' },
                { language: 'typescript', scheme: 'file' },
                { language: 'javascript', scheme: 'file' }
            ],
            {
                provideDefinition(document, position) {
                    const range = document.getWordRangeAtPosition(position, /(["'])(.*?)\1/);
                    if (!range) return;

                    const text = document.getText(range).replace(/["']/g, '');
                    return findTranslation(text);
                }
            }
        );

        const commandDisposable = vscode.commands.registerCommand(
            'translationMapper.findTranslation',
            () => {
                vscode.window.showInformationMessage('Translation Mapper: Command invoked');
            }
        );

        context.subscriptions.push(providerDisposable, commandDisposable);

        log('✅ Extension activated successfully');
    } catch (e) {
        log(`❌ Activation crashed: ${e.message}`);
        vscode.window.showErrorMessage(`Translation Mapper activation failed: ${e.message}`);
    }
    return {
        deactivate
    };
}


function deactivate() {}

module.exports = {
	activate,
	deactivate
}
