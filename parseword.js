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
		return undefined
	}
	return [bracketString.slice(0, indexOfBeginBracket).replace(/ /g, ''), bracketString.slice(indexOfBeginBracket + 1, indexOfEndBracket)]
}

function getBracketSeparatedWords(line) {
	var bracketLevel = 0
	var quoteCharacter = null
	var separatedWords = []
	var start = 0
	line = line.trim()
	if (line.length < 2) {
		return []
	}
	var characterZero = line[0]
	if (gQuoteSet.has(characterZero) && characterZero == line[line.length - 1]) {
		line = line.slice(1, -1)
	}
	for (var characterIndex = 0; characterIndex < line.length; characterIndex++) {
		var character = line[characterIndex]
		if (quoteCharacter == null) {
			if (gQuoteSet.has(character)) {
				quoteCharacter = character
			}
			else {
				if (character == '(') {
					bracketLevel += 1
				}
				else {
					if (character == ')') {
						bracketLevel -= 1
						if (bracketLevel == 0) {
							var indexPlus = characterIndex + 1
							var separatedWord = line.slice(start, indexPlus).trim()
							if (separatedWord.length > 0) {
								separatedWords.push(separatedWord)
							}
							start = indexPlus
						}
					}
				}
			}
		}
		else {
			if (character == quoteCharacter) {
				quoteCharacter = null
			}
		}
	}
	var separatedWord = line.slice(start).trim()
	if (separatedWord.length > 0) {
		separatedWords.push(separatedWord)
	}
	return separatedWords
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

function getIndexOfBracketed(text, searchCharacter, searchBracketDepth) {
	var bracketDepth = 0
	searchBracketDepth = getValueDefault(searchBracketDepth, 0)
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		var character = text[characterIndex]
		bracketDepth += 1 * (character == '(' || character == '[') - 1 * (character == ')' || character == ']')
		if (bracketDepth == searchBracketDepth && character == searchCharacter) {
			return characterIndex
		}
	}

	return -1
}

function getSplitsAroundBracketed(text, searchCharacter) {
	var bracketDepth = 0
	var characterIndex = 0
	var splits = []
	var splitStart = 0
	for (; characterIndex < text.length; characterIndex++) {
		var character = text[characterIndex]
		bracketDepth += 1 * (character == '(' || character == '[') - 1 * (character == ')' || character == ']')
		if (bracketDepth == 0 && character == searchCharacter) {
			splits.push(text.slice(splitStart, characterIndex))
			splitStart = characterIndex + 1
		}
	}

	splits.push(text.slice(splitStart, characterIndex))
	return splits
}

function getJoinWord() {
	if (navigator.appVersion.indexOf("Win") > -1) {
		return '\r\n'
	}
	return '\n'
}

function getLineByKeySearchReplace(line, key, valueSearch, valueReplace) {
	var lastWord = undefined
	var value = undefined
	var word = ''
	for (var characterIndex = 0; characterIndex < line.length; characterIndex++) {
		var character = line[characterIndex]
		if (value != undefined) {
			value += character
		}
		if (value != undefined) {
			if (value.endsWith(valueSearch)) {
				return line.slice(0, characterIndex + 1 - valueSearch.length) + valueReplace + line.slice(characterIndex + 1)
			}
		}
		if (character == ' ') {
			word = ''
		}
		else {
			if (character == '=') {
				if (lastWord == key) {
					value = ''
				}
				else {
					value = undefined
				}
				word = ''
			}
			else {
				word += character
				lastWord = word
			}
		}
	}

	return line
}

function getSplicedString(originalString, spliceIndex, spliceRemoved, spliceReplacement) {
	return originalString.slice(0, spliceIndex) + spliceReplacement + originalString.slice(spliceIndex + spliceRemoved)
}

function getValueStringIfDifferent(value, other) {
	if (value == other) {
		return undefined
	}

	return value.toString()
}

function getUnquotedText(text) {
	if (text.length < 2) {
		return text
	}
	if (gQuoteSet.has(text[0])) {
		var textLengthMinus = text.length - 1
		if (text[0] == text[textLengthMinus]) {
			return text.slice(1, textLengthMinus)
		}
	}
	return text
}

function lengthCheck(word) {
	return word.length > 0
}
