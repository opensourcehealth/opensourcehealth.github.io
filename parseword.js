//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCapitalizationMap = new Map()
const gQuoteSet = new Set(['"', "'"])
const gSpaceEqualSet = new Set([' ', '='])

function addToCapitalizationMap(capitalizedWord) {
	gCapitalizationMap.set(capitalizedWord.toLowerCase(), capitalizedWord)
}

function getAttributes(tokens) {
	var attributes = []
	var key = null
	var values = []
	for (var token of tokens) {
		if (token == '=') {
			if (key != null) {
				attributes.push([key, values.slice(0, -1).join(' ')])
			}
			key = values[values.length - 1]
			values = []
		}
		else {
			values.push(token)
		}
	}
	if (key != null) {
		attributes.push([key, values.join(' ')])
	}
	return attributes
}

function getBracketedEntry(bracketString) {
	indexOfBeginBracket = bracketString.indexOf('(')
	indexOfEndBracket = bracketString.lastIndexOf(')')
	if (indexOfBeginBracket == -1 || indexOfEndBracket == -1 || indexOfBeginBracket > indexOfEndBracket) {
		return null
	}
	return [bracketString.slice(0, indexOfBeginBracket).replace(/ /g, ''), bracketString.slice(indexOfBeginBracket + 1, indexOfEndBracket)]
}

function getCapitalizedKey(key) {
	if (gCapitalizationMap.has(key.toLowerCase())) {
		return gCapitalizationMap.get(key.toLowerCase())
	}
	return key
}

function getEndOfLine(text) {
	if (text.indexOf('\r\n') > -1) {
		return '\r\n'
	}
	return '\n'
}

function getJoinWord() {
	if (navigator.appVersion.indexOf("Win") > -1) {
		return '\r\n'
	}
	return '\n'
}

function getLineWithEndspace(endWords, line) {
	for (var endWord of endWords) {
		if (line.endsWith(endWord)) {
			spaceThenEndWord = ' ' + endWord
			if (!line.endsWith(spaceThenEndWord)) {
				return line.slice(0, line.length - endWord.length) + spaceThenEndWord
			}
		}
	}
	return line
}

function getQuoteSeparatedWords(line) {
	var quoteCharacter = null
	var quoteSeparatedWords = []
	var start = 0
	if (line.indexOf('=') != -1) {
		line = getLineWithEndspace(['/>', '>', '[', '{'], line)
	}
	for (var characterIndex = 0; characterIndex < line.length; characterIndex++) {
		var character = line[characterIndex]
		if (quoteCharacter == null) {
			if (gSpaceEqualSet.has(character)) {
				var quoteSeparatedWord = line.slice(start, characterIndex)
				if (quoteSeparatedWord.length > 0) {
					quoteSeparatedWords.push(quoteSeparatedWord)
				}
				if (character == '=') {
					quoteSeparatedWords.push(character)
				}
				start = characterIndex + 1
			}
			else {
				if (gQuoteSet.has(character)) {
					quoteCharacter = character
				}
			}
		}
		else {
			if (character == quoteCharacter) {
				quoteCharacter = null
			}
		}
	}
	quoteSeparatedWords.push(line.slice(start))
	return quoteSeparatedWords
}

function getSplicedString(originalString, spliceIndex, spliceRemoved, spliceReplacement) {
	return originalString.slice(0, spliceIndex) + spliceReplacement + originalString.slice(spliceIndex + spliceRemoved)
}

function lengthCheck(word) {
	return word.length > 0
}

function getStringsByMap(key, map) {
	if (map.has(key)) {
		return map.get(key).split(',').filter(lengthCheck)
	}
	return null
}
