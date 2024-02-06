//License = GNU Affero General Public License http://www.gnu.org/licenses/agpl.html

var gCapitalizationMap = new Map()
const gQuoteSet = new Set(['"', "'"])
const gSpaceEqualSet = new Set([' ', '='])

function addToCapitalizationMap(capitalizedWord) {
	gCapitalizationMap.set(capitalizedWord.toLowerCase(), capitalizedWord)
}

function getAttributes(tokens) {
	var attributes = []
	var key = undefined
	var values = []
	for (var token of tokens) {
		if (token == '=') {
			if (key != undefined) {
				attributes.push([key, values.slice(0, -1).join(' ')])
			}
			key = values[values.length - 1]
			values = []
		}
		else {
			values.push(token)
		}
	}
	if (key != undefined) {
		attributes.push([key, values.join(' ')])
	}
	return attributes
}

function getBracketedEntry(bracketString) {
	var indexOfBeginBracket = bracketString.indexOf('(')
	var indexOfEndBracket = bracketString.lastIndexOf(')')
	if (indexOfBeginBracket == -1 || indexOfEndBracket == -1 || indexOfBeginBracket > indexOfEndBracket) {
		return undefined
	}

	return [bracketString.slice(0, indexOfBeginBracket).replaceAll(' ', ''), bracketString.slice(indexOfBeginBracket + 1, indexOfEndBracket)]
}

function getBracketSeparatedWords(line) {
	var bracketLevel = 0
	var quoteCharacter = undefined
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
		if (quoteCharacter == undefined) {
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
				quoteCharacter = undefined
			}
		}
	}

	var separatedWord = line.slice(start).trim()
	if (separatedWord.length > 0) {
		separatedWords.push(separatedWord)
	}

	return separatedWords
}

function getCamelCase(text) {
	var textStrings = text.split(' ').filter(lengthCheck)
	if (textStrings.length == 0) {
		return text
	}

	var camelCase = textStrings[0].toLowerCase()
	for (var textStringIndex = 1; textStringIndex < textStrings.length; textStringIndex++) {
		var textString = textStrings[textStringIndex]
		camelCase += textString[0].toUpperCase() + textString.slice(1).toLowerCase()
	}

	return camelCase
}

function getCapitalizedKey(key) {
	if (gCapitalizationMap.has(key.toLowerCase())) {
		return gCapitalizationMap.get(key.toLowerCase())
	}
	return key
}

function getCharacterCount(text, searchCharacter) {
	var characterCount = 0
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		characterCount += 1 * (text[characterIndex] == searchCharacter)
	}

	return characterCount
}

function getCharacterIndexMap(line, searchCharacter) {
	var characterIndexMap = new Map()
	for (var characterIndex = 0; characterIndex < line.length; characterIndex++) {
		if (line[characterIndex] == searchCharacter) {
			characterIndexMap.set(characterIndex, characterIndexMap.size)
		}
	}

	return characterIndexMap
}

function getCharacterVariance(text, searchCharacter) {
	var characterStringCount = 0
	var characterStringLength = 0
	var totalLength = 0
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		if (characterStringLength == 0) {
			if (text[characterIndex] == searchCharacter) {
				characterStringCount += 1.0
				characterStringLength = 1
			}
		}
		else {
			if (text[characterIndex] == searchCharacter) {
				characterStringLength += 1
			}
			else {
				totalLength += characterStringLength
				characterStringLength = 0
			}
		}
	}

	totalLength += characterStringLength
	var mean = totalLength / characterStringCount
	var sumOfSquares = 0
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		if (characterStringLength == 0) {
			if (text[characterIndex] == searchCharacter) {
				characterStringLength = 1
			}
		}
		else {
			if (text[characterIndex] == searchCharacter) {
				characterStringLength += 1
			}
			else {
				var difference = characterStringLength - mean
				sumOfSquares += difference * difference
				characterStringLength = 0
			}
		}
	}

	if (characterStringLength > 0) {
		var difference = characterStringLength - mean
		sumOfSquares += difference * difference
	}

	return sumOfSquares / characterStringCount
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

function getIsUpperCase(text) {
	for (var character of text) {
		if (!gUpperCaseSet.has(character)) {
			return false
		}
	}
	
	return true
}

function getJoinWord() {
	if (navigator.appVersion.indexOf("Win") > -1) {
		return '\r\n'
	}
	return '\n'
}

function getLineByKeyMapReplace(line, key, map, valueReplace) {
	if (map.has(key)) {
		return getLineByKeySearchReplace(line, key, map.get(key), valueReplace)
	}

	return line + ' ' + key + '=' + valueReplace
}

function getLineByKeySearchReplace(line, key, valueSearch, valueReplace) {
	var keyIndex = 0
	var lastIndex = 0
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
				if (valueReplace == undefined) {
					return line.slice(0, keyIndex) + line.slice(characterIndex + 1)
				}
				return line.slice(0, characterIndex + 1 - valueSearch.length) + valueReplace + line.slice(characterIndex + 1)
			}
		}
		if (character == ' ') {
			word = ''
		}
		else {
			if (character == '=') {
				if (lastWord == key) {
					keyIndex = lastIndex
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
				lastIndex = characterIndex - lastWord.length
			}
		}
	}

	return line
}

function getSplicedString(originalString, spliceIndex, spliceRemoved, spliceReplacement) {
	return originalString.slice(0, spliceIndex) + spliceReplacement + originalString.slice(spliceIndex + spliceRemoved)
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

function getValueStringIfDifferent(value, other) {
	if (value == other) {
		return undefined
	}

	return value.toString()
}

function getUnbracketedText(text) {
	if (text.indexOf('<') == -1) {
		return text
	}

	var bracketLevel = 0
	var characters = []
	var quoteCharacters = []
	for (var characterIndex = 0; characterIndex < text.length; characterIndex++) {
		var character = text[characterIndex]
		if (gQuoteSet.has(character)) {
			if (quoteCharacters.length == 0) {
				quoteCharacters.push(character)
			}
			else {
				if (quoteCharacters[quoteCharacters.length - 1] == character) {
					quoteCharacters.pop()
				}
				else {
					quoteCharacters.push(character)
				}
			}
		}
		if (quoteCharacters.length == 0) {
			bracketLevel += 1 * (character == '<')
		}
		if (character == '>') {
			if (quoteCharacters.length == 0) {
				bracketLevel--
			}
		}
		else {
			if (bracketLevel == 0) {
				characters.push(character)
			}
		}
	}

	return characters.join('').replaceAll('&#8203;', '')
}

function getUnquotedText(text) {
	if (text.length < 2) {
		return text
	}

	if (gQuoteSet.has(text[0])) {
		if (text[0] == text[text.length - 1]) {
			return text.slice(1, -1)
		}
	}

	return text
}

function getWithoutRepeatedCharacter(text, searchCharacter) {
	for (var whileCount = 0; whileCount < gLengthLimitRoot; whileCount++) {
		var doubleCharacter = searchCharacter + searchCharacter
		if (text.indexOf(doubleCharacter) == -1) {
			return text
		}
		text = text.replaceAll(doubleCharacter, searchCharacter)
	}

	return text
}

function lengthCheck(word) {
	return word.length > 0
}

function removeExtraSpaces(text) {
	var remove = false
	var characters = text.split('')
	for (var characterIndex = 0; characterIndex < characters.length; characterIndex++) {
		if (remove) {
			if (characters[characterIndex] == ' ') {
				characters[characterIndex] = undefined
			}
			else {
				remove = false
			}
		}
		else {
			if (characters[characterIndex] == ' ') {
				remove = true
			}
		}
	}

	removeUndefineds(characters)
	for (var characterIndex = 0; characterIndex < characters.length - 2; characterIndex++) {
		if (characters[characterIndex] == '.' && characters[characterIndex + 1] == ' ' && gUpperCaseSet.has(characters[characterIndex + 2])) {
			for (var innerIndex = characterIndex + 2; innerIndex < characters.length; innerIndex++) {
				if (characters[innerIndex] == '.') {
					break
				}
				if (characters[innerIndex] == ' ') {
					characters[characterIndex] = '. '
				}
			}
		}
	}

	return characters.join('')
}
